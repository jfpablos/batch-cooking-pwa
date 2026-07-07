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
const PUSH_DEBOUNCE_MS = 800;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let userId: string | null = null;

function syncedKeys(): StorageKey[] {
  return Object.values(STORAGE_KEYS).filter(k => !LOCAL_ONLY_KEYS.has(k));
}

function getPending(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function setPending(keys: Set<string>): void {
  try {
    if (keys.size === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify([...keys]));
  } catch {
    // sin espacio: el pull inicial del próximo arranque reconciliará
  }
}

function markPending(key: string): void {
  const pending = getPending();
  pending.add(key);
  setPending(pending);
}

/** Sube (o borra) una clave en el servidor. Lee el valor actual de localStorage. */
async function pushKey(key: string): Promise<void> {
  if (!supabase || !userId) return;
  const raw = localStorage.getItem(key);
  try {
    if (raw === null) {
      const { error } = await supabase.from('app_state').delete().eq('key', key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('app_state')
        .upsert({ user_id: userId, key, value: JSON.parse(raw) }, { onConflict: 'user_id,key' });
      if (error) throw error;
    }
    const pending = getPending();
    if (pending.delete(key)) setPending(pending);
  } catch (e) {
    console.warn(`[Sync] No se pudo subir ${key}, queda pendiente:`, e);
    markPending(key);
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

    for (const key of getPending()) {
      await pushKey(key);
    }

    const { data, error } = await supabase.from('app_state').select('key, value');
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
    for (const key of getPending()) {
      await pushKey(key);
    }
  },

  signOut(): void {
    userId = null;
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncService.flushPending());
}
