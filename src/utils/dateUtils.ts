import { getISOWeek, getISOWeekYear } from 'date-fns';
import { addDays, todayLocalISO } from './dailyActions';

/** Semana ISO y año ISO de una fecha 'YYYY-MM-DD' (año ISO: la S1 de enero no cae en el año anterior). */
export function weekAndYearFor(dateISO: string): { weekNumber: number; year: number } {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { weekNumber: getISOWeek(date), year: getISOWeekYear(date) };
}

/**
 * Lunes de la semana de consumo a la que apuntaría un menú generado hoy:
 * sábado/domingo → lunes siguiente; L-V → lunes de esta misma semana.
 * (Misma regla que getWeekStart de utils/dailyActions sobre generatedAt.)
 */
export function upcomingWeekStartISO(todayISO: string = todayLocalISO()): string {
  const [y, m, d] = todayISO.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo .. 6=sábado
  if (dow === 0) return addDays(todayISO, 1);
  if (dow === 6) return addDays(todayISO, 2);
  return addDays(todayISO, 1 - dow);
}

/** Lunes de la semana objetivo de una generación: la de este menú o la siguiente. */
export function targetWeekStartISO(target: 'current' | 'next', todayISO?: string): string {
  const start = upcomingWeekStartISO(todayISO);
  return target === 'next' ? addDays(start, 7) : start;
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
