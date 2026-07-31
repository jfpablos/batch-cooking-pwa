import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { geminiService } from '../services/geminiService';
import { menuService } from '../services/menuService';
import { recipeService } from '../services/recipeService';
import { shoppingListService } from '../services/shoppingListService';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { useHistoryRotation } from './useHistoryRotation';
import { MEAL_CATEGORY, scaledMealTargets } from '../utils/constants';
import { getCurrentSeason } from '../utils/prompts';
import { normalizeText } from '../utils/textUtils';
import type { BaseRecipe, DayName, MealKey } from '../types';

export interface SwapTarget {
  day: DayName;
  meal: MealKey;
}

/**
 * Sustituye una sola comida del menú sin regenerar la semana: pide una receta
 * nueva a Gemini (o coge otra del banco base como fallback), recalcula la
 * nutrición del día y regenera la lista de la compra. Con slot 'next' opera
 * sobre el menú planificado de la semana siguiente sin tocar el actual.
 */
export function useMealSwap(slot: 'current' | 'next' = 'current') {
  const [swapping, setSwapping] = useState<SwapTarget | null>(null);
  const { getExcludeNames } = useHistoryRotation();

  async function swapMeal(day: DayName, meal: MealKey): Promise<void> {
    const state = useAppStore.getState();
    const { profile, pantryItems, recipePrefs, showToast } = state;
    const menu = slot === 'next' ? state.nextMenu : state.currentMenu;
    const shoppingList = slot === 'next' ? state.nextShoppingList : state.shoppingList;
    const batchGuide = slot === 'next' ? state.nextBatchGuide : state.batchGuide;
    const setMenu = slot === 'next' ? state.setNextMenu : state.setCurrentMenu;
    const setList = slot === 'next' ? state.setNextShoppingList : state.setShoppingList;
    const setGuide = slot === 'next' ? state.setNextBatchGuide : state.setBatchGuide;
    const MENU_KEY = slot === 'next' ? STORAGE_KEYS.NEXT_MENU : STORAGE_KEYS.CURRENT_MENU;
    const LIST_KEY = slot === 'next' ? STORAGE_KEYS.NEXT_SHOPPING_LIST : STORAGE_KEYS.SHOPPING_LIST;
    const GUIDE_KEY = slot === 'next' ? STORAGE_KEYS.NEXT_BATCH_GUIDE : STORAGE_KEYS.BATCH_GUIDE;
    if (!menu || swapping) return;

    const currentMeal = menu.days.find(d => d.day === day)?.meals[meal];
    if (!currentMeal || currentMeal.isSkipped) return;

    setSwapping({ day, meal });
    try {
      const category = MEAL_CATEGORY[meal];
      const targets = scaledMealTargets(profile)[meal];
      const usedNames = menuService.getAllRecipeNames(menu);
      // Mismas exclusiones que la generación semanal: historial + vetadas,
      // más lo ya presente en el menú actual.
      const excludeNames = Array.from(
        new Set([...getExcludeNames(), ...recipePrefs.banned, ...usedNames])
      );

      let recipe: BaseRecipe | null = null;

      if (geminiService.isConfigured()) {
        try {
          const gemini = await geminiService.generateSingleMeal({
            category,
            targets,
            excludeNames,
            replacedName: currentMeal.recipeName,
            pantryItems: pantryItems.map(p => p.name),
            season: getCurrentSeason(),
          });
          recipe = menuService.recipeFromGemini(gemini);
        } catch (e) {
          console.warn('[Swap] Gemini falló, usando banco base:', e);
        }
      }

      if (!recipe) {
        const excluded = new Set(excludeNames.map(normalizeText));
        const candidates = recipeService
          .getByCategory(category)
          .filter(r => !excluded.has(normalizeText(r.name)));
        const banned = new Set(recipePrefs.banned.map(normalizeText));
        const pool = candidates.length > 0 ? candidates : recipeService.getByCategory(category)
          .filter(r =>
            normalizeText(r.name) !== normalizeText(currentMeal.recipeName) &&
            !banned.has(normalizeText(r.name))
          );
        if (pool.length === 0) {
          showToast('No hay recetas alternativas disponibles para esta comida', 'error');
          return;
        }
        recipe = pool[Math.floor(Math.random() * pool.length)];
      }

      const updatedMenu = menuService.replaceMeal(menu, day, meal, recipe);
      const rawList = shoppingListService.generateFromMenu(updatedMenu);
      const pantryList = shoppingListService.markPantryItems(rawList, pantryItems.map(p => p.name));
      // No perder lo ya marcado como comprado en los ítems que no cambian
      const updatedList = shoppingListService.mergePurchasedState(pantryList, shoppingList);

      storageService.set(MENU_KEY, updatedMenu);
      storageService.set(LIST_KEY, updatedList);
      setMenu(updatedMenu);
      setList(updatedList);

      // La guía de batch guardada describe la receta sustituida: se invalida
      // para que la pestaña Batch use la guía base derivada del menú nuevo.
      if (batchGuide && batchGuide.menuId === menu.id) {
        storageService.remove(GUIDE_KEY);
        setGuide(null);
      }

      showToast(`Cambiado por "${recipe.name}"`, 'success');
    } finally {
      setSwapping(null);
    }
  }

  return { swapMeal, swapping };
}
