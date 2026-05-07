import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type { MenuHistoryStorage, StoredWeek, WeeklyMenu } from '../types';
import { menuService } from '../services/menuService';

const MAX_HISTORY = 4;

export function useHistoryRotation() {
  function getHistory(): StoredWeek[] {
    const data = storageService.get<MenuHistoryStorage>(STORAGE_KEYS.MENU_HISTORY);
    return data?.history ?? [];
  }

  function getExcludeNames(): string[] {
    const history = getHistory();
    const names = new Set<string>();
    for (const week of history) {
      for (const name of week.recipeNames) {
        names.add(name);
      }
    }
    return Array.from(names);
  }

  function addMenuToHistory(menu: WeeklyMenu): void {
    const history = getHistory();
    const recipeNames = menuService.getAllRecipeNames(menu);

    const entry: StoredWeek = {
      weekNumber: menu.weekNumber,
      year: menu.year,
      menuId: menu.id,
      generatedAt: menu.generatedAt,
      recipeNames,
    };

    // Avoid duplicates for the same week
    const filtered = history.filter(
      h => !(h.weekNumber === menu.weekNumber && h.year === menu.year)
    );

    // Keep only last MAX_HISTORY entries
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);

    storageService.set<MenuHistoryStorage>(STORAGE_KEYS.MENU_HISTORY, {
      history: updated,
    });
  }

  function clearHistory(): void {
    storageService.remove(STORAGE_KEYS.MENU_HISTORY);
  }

  return { getHistory, getExcludeNames, addMenuToHistory, clearHistory };
}
