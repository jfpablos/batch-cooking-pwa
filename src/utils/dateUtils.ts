import { getISOWeek, getYear } from 'date-fns';

export function getISOWeekNumber(date: Date = new Date()): number {
  return getISOWeek(date);
}

export function getCurrentWeekAndYear(): { weekNumber: number; year: number } {
  const now = new Date();
  return {
    weekNumber: getISOWeek(now),
    year: getYear(now),
  };
}

export function formatWeekLabel(weekNumber: number, year: number): string {
  return `Semana ${weekNumber} · ${year}`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
