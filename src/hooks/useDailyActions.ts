import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  getTodayActions,
  menuPhaseOn,
  todayLocalISO,
  type DailyAction,
} from '../utils/dailyActions';

export interface TodayAction extends DailyAction {
  done: boolean;
}

export type MenuPhase = 'upcoming' | 'active' | 'past';

/**
 * Acciones de conservación que tocan hoy (descongelar/congelar/comer) con su
 * estado hecho/pendiente. pendingCount solo cuenta thaw/freeze sin marcar
 * (las 'eat' son informativas). menuPhase distingue el menú aún por cocinar
 * ('upcoming', sábado) del vigente y del ya terminado.
 */
export function useDailyActions() {
  const currentMenu = useAppStore(s => s.currentMenu);
  const batchGuide = useAppStore(s => s.batchGuide);
  const dailyActionsDone = useAppStore(s => s.dailyActionsDone);
  const today = todayLocalISO();

  return useMemo(() => {
    if (!currentMenu) {
      return {
        todayActions: [] as TodayAction[],
        pendingCount: 0,
        isMenuCurrent: false,
        menuPhase: 'past' as MenuPhase,
        today,
      };
    }
    const menuPhase: MenuPhase = menuPhaseOn(currentMenu, today);
    const isMenuCurrent = menuPhase === 'active';
    const doneIds = new Set(
      dailyActionsDone?.menuId === currentMenu.id ? dailyActionsDone.done : []
    );
    const todayActions: TodayAction[] = getTodayActions(currentMenu, batchGuide).map(a => ({
      ...a,
      done: doneIds.has(a.id),
    }));
    const pendingCount = todayActions.filter(a => a.type !== 'eat' && !a.done).length;
    return { todayActions, pendingCount, isMenuCurrent, menuPhase, today };
  }, [currentMenu, batchGuide, dailyActionsDone, today]);
}
