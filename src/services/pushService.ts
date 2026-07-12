import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Suscripción a Web Push: pide permiso de notificaciones, se suscribe con la
 * clave pública VAPID y guarda la suscripción en la tabla push_subscriptions.
 * La Edge Function send-reminders envía a esas suscripciones cada noche.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushStatus = 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported';

export function isPushSupported(): boolean {
  return (
    isSupabaseConfigured &&
    !!VAPID_PUBLIC_KEY &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// applicationServerKey espera la clave VAPID pública (P-256 sin comprimir)
// como bytes, no como string base64url.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export const pushService = {
  isPushSupported,

  async getStatus(): Promise<PushStatus> {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'unsubscribed';
  },

  async subscribe(): Promise<void> {
    if (!isPushSupported() || !supabase) throw new Error('Push no soportado en este entorno');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado');

    const reg = await getRegistration();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      }));

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) throw new Error('Suscripción push incompleta');
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint: json.endpoint, keys: json.keys }, { onConflict: 'endpoint' });
    if (error) {
      // No dejar una suscripción viva que el servidor desconoce
      await sub.unsubscribe().catch(() => {});
      throw new Error(`No se pudo guardar la suscripción: ${error.message}`);
    }
  },

  async unsubscribe(): Promise<void> {
    if (!isPushSupported() || !supabase) return;
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw new Error(`No se pudo borrar la suscripción: ${error.message}`);
  },
};
