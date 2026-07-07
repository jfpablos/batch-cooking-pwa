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
    const { currentMenu, profile, pantryItems, showToast, setCurrentMenu, setShoppingList } =
      useAppStore.getState();
    if (!currentMenu || swapping) return;

    const currentMeal = currentMenu.days.find(d => d.day === day)?.meals[meal];
    if (!currentMeal || currentMeal.isSkipped) return;

    setSwapping({ day, meal });
    try {
      const category = MEAL_CATEGORY[meal];
      const targets = scaledMealTargets(profile)[meal];
      const usedNames = menuService.getAllRecipeNames(currentMenu);
      const excludeNames = Array.from(new Set([...getExcludeNames(), ...usedNames]));

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
        const excluded = new Set(excludeNames.map(n => n.toLowerCase()));
        const candidates = recipeService
          .getByCategory(category)
          .filter(r => !excluded.has(r.name.toLowerCase()));
        const pool = candidates.length > 0 ? candidates : recipeService.getByCategory(category)
          .filter(r => r.name !== currentMeal.recipeName);
        if (pool.length === 0) {
          showToast('No hay recetas alternativas disponibles para esta comida', 'error');
          return;
        }
        recipe = pool[Math.floor(Math.random() * pool.length)];
      }

      const updatedMenu = menuService.replaceMeal(currentMenu, day, meal, recipe);
      const rawList = shoppingListService.generateFromMenu(updatedMenu);
      const updatedList = shoppingListService.markPantryItems(rawList, pantryItems.map(p => p.name));

      storageService.set(STORAGE_KEYS.CURRENT_MENU, updatedMenu);
      storageService.set(STORAGE_KEYS.SHOPPING_LIST, updatedList);
      setCurrentMenu(updatedMenu);
      setShoppingList(updatedList);

      showToast(`Cambiado por "${recipe.name}"`, 'success');
    } finally {
      setSwapping(null);
    }
  }

  return { swapMeal, swapping };
}
