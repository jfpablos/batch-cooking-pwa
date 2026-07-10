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
 * nutrición del día y regenera la lista de la compra.
 */
export function useMealSwap() {
  const [swapping, setSwapping] = useState<SwapTarget | null>(null);
  const { getExcludeNames } = useHistoryRotation();

  async function swapMeal(day: DayName, meal: MealKey): Promise<void> {
    const {
      currentMenu, profile, pantryItems, recipePrefs, shoppingList, batchGuide,
      showToast, setCurrentMenu, setShoppingList, setBatchGuide,
    } = useAppStore.getState();
    if (!currentMenu || swapping) return;

    const currentMeal = currentMenu.days.find(d => d.day === day)?.meals[meal];
    if (!currentMeal || currentMeal.isSkipped) return;

    setSwapping({ day, meal });
    try {
      const category = MEAL_CATEGORY[meal];
      const targets = scaledMealTargets(profile)[meal];
      const usedNames = menuService.getAllRecipeNames(currentMenu);
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

      const updatedMenu = menuService.replaceMeal(currentMenu, day, meal, recipe);
      const rawList = shoppingListService.generateFromMenu(updatedMenu);
      const pantryList = shoppingListService.markPantryItems(rawList, pantryItems.map(p => p.name));
      // No perder lo ya marcado como comprado en los ítems que no cambian
      const updatedList = shoppingListService.mergePurchasedState(pantryList, shoppingList);

      storageService.set(STORAGE_KEYS.CURRENT_MENU, updatedMenu);
      storageService.set(STORAGE_KEYS.SHOPPING_LIST, updatedList);
      setCurrentMenu(updatedMenu);
      setShoppingList(updatedList);

      // La guía de batch guardada describe la receta sustituida: se invalida
      // para que la pestaña Batch use la guía base derivada del menú nuevo.
      if (batchGuide && batchGuide.menuId === currentMenu.id) {
        storageService.remove(STORAGE_KEYS.BATCH_GUIDE);
        setBatchGuide(null);
      }

      showToast(`Cambiado por "${recipe.name}"`, 'success');
    } finally {
      setSwapping(null);
    }
  }

  return { swapMeal, swapping };
}
