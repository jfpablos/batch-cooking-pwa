import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ActiveTimer } from '../types';
import { playAlarm } from '../utils/alarm';

function computeRemaining(timer: ActiveTimer | null): number {
  if (!timer) return 0;
  if (timer.status === 'running' && timer.endsAt !== null) {
    return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  }
  if (timer.status === 'paused') return timer.remainingAtPause;
  return 0;
}

/**
 * Suscripción al temporizador activo del store. El tiempo restante se deriva
 * en cada render desde el timestamp absoluto endsAt (robusto ante throttling
 * en segundo plano); un tick de 500ms fuerza el re-render mientras corre y
 * dispara la alarma una única vez al llegar a cero.
 */
export function useTimer() {
  const activeTimer = useAppStore(s => s.activeTimer);
  const finishTimer = useAppStore(s => s.finishTimer);
  const showToast = useAppStore(s => s.showToast);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running') return;

    const id = setInterval(() => {
      setTick(t => t + 1);
      if (computeRemaining(activeTimer) <= 0) {
        // finishTimer cambia el status → el efecto se re-ejecuta y limpia el intervalo
        finishTimer();
        playAlarm();
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
        showToast('⏱ Tarea terminada', 'success');
      }
    }, 500);

    return () => clearInterval(id);
  }, [activeTimer, finishTimer, showToast]);

  return { activeTimer, remaining: computeRemaining(activeTimer) };
}

export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
