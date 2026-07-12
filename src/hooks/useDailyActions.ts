import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  getTodayActions,
  isMenuActiveOn,
  todayLocalISO,
  type DailyAction,
} from '../utils/dailyActions';

export interface TodayAction extends DailyAction {
  done: boolean;
}

/**
 * Acciones de conservación que tocan hoy (descongelar/congelar/comer) con su
 * estado hecho/pendiente. pendingCount solo cuenta thaw/freeze sin marcar
 * (las 'eat' son informativas).
 */
export function useDailyActions() {
  const currentMenu = useAppStore(s => s.currentMenu);
  const batchGuide = useAppStore(s => s.batchGuide);
  const dailyActionsDone = useAppStore(s => s.dailyActionsDone);
  const today = todayLocalISO();

  return useMemo(() => {
    if (!currentMenu) {
      return { todayActions: [] as TodayAction[], pendingCount: 0, isMenuCurrent: false, today };
    }
    const isMenuCurrent = isMenuActiveOn(currentMenu, today);
    const doneIds = new Set(
      dailyActionsDone?.menuId === currentMenu.id ? dailyActionsDone.done : []
    );
    const todayActions: TodayAction[] = getTodayActions(currentMenu, batchGuide).map(a => ({
      ...a,
      done: doneIds.has(a.id),
    }));
    const pendingCount = todayActions.filter(a => a.type !== 'eat' && !a.done).length;
    return { todayActions, pendingCount, isMenuCurrent, today };
  }, [currentMenu, batchGuide, dailyActionsDone, today]);
}
