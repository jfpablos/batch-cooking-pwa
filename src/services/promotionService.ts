import { storageService } from './storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { useAppStore } from '../store/useAppStore';
import { getWeekStart, todayLocalISO } from '../utils/dailyActions';
import { upcomingWeekStartISO } from '../utils/dateUtils';
import type { BatchCookingGuide, ShoppingList, WeeklyMenu } from '../types';

/**
 * Mueve el menú planificado (slot next) al slot current. Idempotente y segura
 * ante cortes a mitad: se escribe primero el slot current y se vacía el next
 * al final, así una re-ejecución repite escrituras idénticas en vez de perder
 * datos. No comprueba fechas ni colisiones: eso lo decide el llamante.
 */
export function activateNextMenu(): boolean {
  const next = storageService.get<WeeklyMenu>(STORAGE_KEYS.NEXT_MENU);
  if (!next) return false;

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

/**
 * ¿Hay dos menús para la misma semana (o el actual va por delante del
 * planificado)? Ocurre si se regeneró "esta semana" en fin de semana con la
 * versión antigua de la app, que no promocionaba hasta el domingo.
 */
export function hasWeekCollision(current: WeeklyMenu | null, next: WeeklyMenu | null): boolean {
  return !!current && !!next && getWeekStart(current) >= getWeekStart(next);
}

/**
 * Promociona el menú planificado de la semana siguiente a menú actual en
 * cuanto su semana pasa a ser la "semana en foco": el sábado, cuando termina
 * la semana de consumo anterior (L-V) y empieza la compra y el batch del
 * domingo. Así "Esta semana" en Generar, Compra y Batch apuntan siempre al
 * mismo menú y no puede generarse una segunda copia de la misma semana. Un
 * weekStart ya pasado (usuario ausente varias semanas) también promociona:
 * un menú real vale más que perderlo.
 *
 * Si el menú actual ya cubre esa semana (colisión), NO se borra nada: se
 * dejan ambos slots y la pantalla Generar avisa para que el usuario decida
 * (regenerar o activar el planificado).
 *
 * @returns true si ha habido promoción (para avisar con un toast).
 */
export function promoteNextMenuIfDue(now: Date = new Date()): boolean {
  const next = storageService.get<WeeklyMenu>(STORAGE_KEYS.NEXT_MENU);
  if (!next) return false;

  if (getWeekStart(next) > upcomingWeekStartISO(todayLocalISO(now))) return false;

  const current = storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU);
  if (hasWeekCollision(current, next)) return false;

  return activateNextMenu();
}
