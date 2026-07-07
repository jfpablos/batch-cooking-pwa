import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` es true (modo cocinar).
 * Reintenta al volver a la pestaña: el navegador libera el wake lock cuando
 * la página pasa a segundo plano. Sin soporte del navegador, no hace nada.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) await sentinel.release();
      } catch {
        // denegado (batería baja, etc.): no es crítico
      }
    };

    void request();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
