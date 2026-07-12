import type { WeeklyMenu, BatchCookingGuide } from '../types';
import {
  actionsForDate,
  isMenuActiveOn,
  resolveConservationPlan,
  type DailyAction,
} from '../../supabase/functions/_shared/dailyActions.ts';

// Wrapper cliente del módulo compartido con la Edge Function send-reminders.
// La lógica de derivación vive en supabase/functions/_shared/dailyActions.ts
// (autocontenida) para que servidor y cliente calculen exactamente lo mismo.
export * from '../../supabase/functions/_shared/dailyActions.ts';

/** Fecha local del dispositivo en 'YYYY-MM-DD'. */
export function todayLocalISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Acciones que tocan hoy para el menú actual. Devuelve [] si el menú no está
 * vigente (semana pasada / futura). El parámetro `now` es inyectable para
 * poder probar cualquier día desde la consola.
 */
export function getTodayActions(
  menu: WeeklyMenu,
  guide: BatchCookingGuide | null,
  now: Date = new Date()
): DailyAction[] {
  const today = todayLocalISO(now);
  if (!isMenuActiveOn(menu, today)) return [];
  return actionsForDate(menu, resolveConservationPlan(menu, guide), today);
}
