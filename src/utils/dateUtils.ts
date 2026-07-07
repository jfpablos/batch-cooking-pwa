import { getISOWeek, getYear } from 'date-fns';

export function getCurrentWeekAndYear(): { weekNumber: number; year: number } {
  const now = new Date();
  return {
    weekNumber: getISOWeek(now),
    year: getYear(now),
  };
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
