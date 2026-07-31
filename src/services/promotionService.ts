import { storageService } from './storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { useAppStore } from '../store/useAppStore';
import { addDays, getWeekStart, todayLocalISO } from '../utils/dailyActions';
import type { BatchCookingGuide, ShoppingList, WeeklyMenu } from '../types';

/**
 * Promociona el menú planificado de la semana siguiente a menú actual cuando
 * llega su domingo de cocinado (víspera del weekStart). Idempotente y segura
 * ante cortes a mitad: se escribe primero el slot current y se vacía el next
 * al final, así una re-ejecución repite escrituras idénticas en vez de perder
 * datos. Un weekStart ya pasado (usuario ausente varias semanas) también
 * promociona: un menú real vale más que perderlo.
 *
 * @returns true si ha habido promoción (para avisar con un toast).
 */
export function promoteNextMenuIfDue(now: Date = new Date()): boolean {
  const next = storageService.get<WeeklyMenu>(STORAGE_KEYS.NEXT_MENU);
  if (!next) return false;

  const today = todayLocalISO(now);
  const cookSunday = addDays(getWeekStart(next), -1);
  if (today < cookSunday) return false;

  const current = storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU);
  if (current && getWeekStart(current) >= getWeekStart(next)) {
    // El menú actual ya cubre esa semana (se regeneró "esta semana" después
    // de planificar la siguiente): el pendiente sobra, no se pisa el actual.
    storageService.remove(STORAGE_KEYS.NEXT_MENU);
    storageService.remove(STORAGE_KEYS.NEXT_SHOPPING_LIST);
    storageService.remove(STORAGE_KEYS.NEXT_BATCH_GUIDE);
    useAppStore.getState().hydrateFromStorage();
    return false;
  }

  const nextList = storageService.get<ShoppingList>(STORAGE_KEYS.NEXT_SHOPPING_LIST);
  const nextGuide = storageService.get<BatchCookingGuide>(STORAGE_KEYS.NEXT_BATCH_GUIDE);

  storageService.set(STORAGE_KEYS.CURRENT_MENU, next);
  if (nextList) storageService.set(STORAGE_KEYS.SHOPPING_LIST, nextList);
  else storageService.remove(STORAGE_KEYS.SHOPPING_LIST);
  if (nextGuide) storageService.set(STORAGE_KEYS.BATCH_GUIDE, nextGuide);
  else storageService.remove(STORAGE_KEYS.BATCH_GUIDE);
  storageService.set(STORAGE_KEYS.LAST_GEN_DATE, next.generatedAt);

  // Semana nueva: progreso de la guía a cero (meal_log y daily_actions_done
  // se auto-invalidan por cambio de menuId)
  storageService.remove(STORAGE_KEYS.BATCH_PROGRESS);

  storageService.remove(STORAGE_KEYS.NEXT_MENU);
  storageService.remove(STORAGE_KEYS.NEXT_SHOPPING_LIST);
  storageService.remove(STORAGE_KEYS.NEXT_BATCH_GUIDE);

  const store = useAppStore.getState();
  store.hydrateFromStorage();
  store.setMenuView('current');
  store.resetTimer();
  return true;
}
