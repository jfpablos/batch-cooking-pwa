import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type { StorageKey } from '../utils/storageKeys';

/**
 * Sincronización localStorage ⇄ Supabase (tabla app_state).
 *
 * localStorage sigue siendo la caché síncrona de la que lee toda la app; este
 * servicio la replica en el servidor para que los datos persistan entre
 * dispositivos:
 *  - Al iniciar sesión: se suben los cambios pendientes y se descarga el
 *    estado del servidor (el servidor gana).
 *  - Primer login con datos locales y servidor vacío: se migra todo lo local.
 *  - Cada escritura local se sube en segundo plano (debounce por clave); si
 *    falla (sin red), la clave queda pendiente y se reintenta al volver online.
 */

// La caché de la playlist de YouTube es local por dispositivo (pesada y regenerable).
const LOCAL_ONLY_KEYS = new Set<string>([STORAGE_KEYS.YT_VIDEOS_CACHE]);

// Clave cruda (fuera de STORAGE_KEYS): nunca se sincroniza a sí misma.
const PENDING_KEY = 'batchfit:sync_pending';
// clave → updated_at del servidor la última vez que esta sesión sincronizó esa
// clave. Los conflictos se deciden comparando este valor con el updated_at
// actual del servidor (¿cambió desde que lo vimos?): ambos son del reloj del
// servidor, así que el desfase del reloj del dispositivo no puede perder datos.
const BASELINE_KEY = 'batchfit:sync_baseline';
const PUSH_DEBOUNCE_MS = 800;

// La UI escucha este evento para rehidratar el store cuando la reconciliación
// escribe en localStorage un valor más reciente del servidor. Si hubo
// conflicto real (otro dispositivo escribió mientras había cambios offline),
// detail.conflictKeys lista las claves cuyo cambio local se descartó.
export const REMOTE_UPDATE_EVENT = 'batchfit:remote-update';

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let userId: string | null = null;

function syncedKeys(): StorageKey[] {
  return Object.values(STORAGE_KEYS).filter(k => !LOCAL_ONLY_KEYS.has(k));
}

// clave → epoch ms de la escritura local que quedó sin subir
type PendingMap = Record<string, number>;

function getPending(): PendingMap {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      // Formato antiguo (string[]): migrar conservando el cambio local
      return Object.fromEntries(parsed.map(k => [k as string, Date.now()]));
    }
    return parsed as PendingMap;
  } catch {
    return {};
  }
}

function setPending(pending: PendingMap): void {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // sin espacio: el pull inicial del próximo arranque reconciliará
  }
}

function markPending(key: string): void {
  const pending = getPending();
  pending[key] = Date.now();
  setPending(pending);
}

function clearPending(key: string): void {
  const pending = getPending();
  if (key in pending) {
    delete pending[key];
    setPending(pending);
  }
}

// clave → epoch ms del updated_at del servidor visto en el último sync
type BaselineMap = Record<string, number>;

function getBaseline(): BaselineMap {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? (JSON.parse(raw) as BaselineMap) : {};
  } catch {
    return {};
  }
}

function setBaselineEntry(key: string, updatedAt: number | null): void {
  try {
    const baseline = getBaseline();
    if (updatedAt === null) delete baseline[key];
    else baseline[key] = updatedAt;
    if (Object.keys(baseline).length === 0) localStorage.removeItem(BASELINE_KEY);
    else localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch {
    // sin espacio: se degradará al fallback por timestamp en la reconciliación
  }
}

/** Sube (o borra) una clave en el servidor. Lee el valor actual de localStorage. */
async function pushKey(key: string): Promise<void> {
  if (!supabase || !userId) return;
  const raw = localStorage.getItem(key);

  let value: unknown = null;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch (e) {
      // Valor local corrupto: reintentarlo para siempre no lo arreglará
      console.warn(`[Sync] ${key} corrupto en localStorage, se descarta del sync:`, e);
      clearPending(key);
      return;
    }
  }

  try {
    if (raw === null) {
      const { error } = await supabase.from('app_state').delete().eq('key', key);
      if (error) throw error;
      setBaselineEntry(key, null);
    } else {
      const { data, error } = await supabase
        .from('app_state')
        .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })
        .select('updated_at')
        .single();
      if (error) throw error;
      const updatedAt = Date.parse(data?.updated_at as string);
      if (Number.isFinite(updatedAt)) setBaselineEntry(key, updatedAt);
    }
    clearPending(key);
  } catch (e) {
    console.warn(`[Sync] No se pudo subir ${key}, queda pendiente:`, e);
    markPending(key);
  }
}

/**
 * Sube los cambios pendientes reconciliando con el servidor por causalidad:
 * si el updated_at actual del servidor coincide con la línea base (lo último
 * que esta sesión sincronizó), nadie más escribió y el cambio offline se sube
 * con seguridad. Si difiere, otro dispositivo escribió entre medias: gana el
 * servidor y se notifica el conflicto en vez de machacarlo en silencio.
 * Fallback para claves sin línea base (versiones anteriores): comparación
 * updated_at vs timestamp local, como antes.
 */
async function pushPendingReconciled(): Promise<void> {
  if (!supabase || !userId) return;
  const pending = getPending();
  const keys = Object.keys(pending);
  if (keys.length === 0) return;

  let serverRows = new Map<string, { value: unknown; updatedAt: number }>();
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('key, value, updated_at')
      .in('key', keys);
    if (!error && data) {
      serverRows = new Map(
        data.map(row => [row.key as string, { value: row.value, updatedAt: Date.parse(row.updated_at as string) }])
      );
    }
  } catch {
    // sin info del servidor: se empuja igualmente (comportamiento anterior)
  }

  const baseline = getBaseline();
  const conflictKeys: string[] = [];
  for (const key of keys) {
    const server = serverRows.get(key);
    const base = baseline[key];
    const serverChangedSinceLastSync =
      server && Number.isFinite(server.updatedAt) &&
      (Number.isFinite(base) ? server.updatedAt !== base : server.updatedAt > pending[key]);

    if (serverChangedSinceLastSync) {
      try {
        localStorage.setItem(key, JSON.stringify(server.value));
        conflictKeys.push(key);
      } catch (e) {
        console.error(`[Sync] No se pudo escribir ${key} en localStorage:`, e);
      }
      setBaselineEntry(key, server.updatedAt);
      clearPending(key);
      continue;
    }
    await pushKey(key);
  }

  if (conflictKeys.length > 0 && typeof window !== 'undefined') {
    console.warn('[Sync] Conflicto: otro dispositivo escribió estas claves, gana el servidor:', conflictKeys);
    window.dispatchEvent(new CustomEvent(REMOTE_UPDATE_EVENT, { detail: { conflictKeys } }));
  }
}

export const syncService = {
  isActive(): boolean {
    return isSupabaseConfigured && userId !== null;
  },

  /**
   * Se llama tras autenticar, antes de renderizar la app:
   * 1. Sube las claves pendientes de sesiones anteriores (cambios offline).
   * 2. Descarga el estado del servidor a localStorage.
   * 3. Si el servidor está vacío y hay datos locales → migración inicial.
   */
  async initialSync(currentUserId: string): Promise<void> {
    if (!supabase) return;
    userId = currentUserId;

    await pushPendingReconciled();

    const { data, error } = await supabase.from('app_state').select('key, value, updated_at');
    if (error) {
      console.error('[Sync] Error descargando estado:', error);
      return; // la app sigue con lo local; se reintentará en el próximo arranque
    }

    const keys = syncedKeys();
    if (data.length === 0) {
      // Primer login: migrar los datos locales existentes al servidor
      const localKeys = keys.filter(k => localStorage.getItem(k) !== null);
      if (localKeys.length > 0) {
        console.info(`[Sync] Migrando ${localKeys.length} claves locales al servidor`);
        await Promise.all(localKeys.map(k => pushKey(k)));
      }
      return;
    }

    const serverKeys = new Set(data.map(row => row.key as string));
    for (const row of data) {
      if (keys.includes(row.key as StorageKey)) {
        try {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        } catch (e) {
          console.error(`[Sync] No se pudo escribir ${row.key} en localStorage:`, e);
        }
        const updatedAt = Date.parse(row.updated_at as string);
        if (Number.isFinite(updatedAt)) setBaselineEntry(row.key as string, updatedAt);
      }
    }
    // Claves locales que el servidor no tiene (creadas sin conexión): subirlas
    const missing = keys.filter(k => !serverKeys.has(k) && localStorage.getItem(k) !== null);
    await Promise.all(missing.map(k => pushKey(k)));
  },

  /** Notificación de escritura local; sube el cambio con debounce por clave. */
  onLocalWrite(key: string): void {
    if (LOCAL_ONLY_KEYS.has(key) || !isSupabaseConfigured) return;
    if (!userId) {
      markPending(key); // aún sin sesión (modo local u offline)
      return;
    }
    const existing = debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key);
        void pushKey(key);
      }, PUSH_DEBOUNCE_MS)
    );
  },

  async flushPending(): Promise<void> {
    if (!userId) return;
    await pushPendingReconciled();
  },

  signOut(): void {
    userId = null;
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncService.flushPending());
}
