import { useAppStore } from '../store/useAppStore';
import { geminiService } from '../services/geminiService';
import { menuService } from '../services/menuService';
import { shoppingListService } from '../services/shoppingListService';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { getCurrentWeekAndYear } from '../utils/dateUtils';
import { useHistoryRotation } from './useHistoryRotation';
import type { BatchCookingGuide } from '../types';

const STEPS = [
  'Consultando inteligencia artificial...',
  'Calculando macros y equilibrio nutricional...',
  'Generando lista de la compra...',
  'Guardando menú semanal...',
];

export function useMenuGeneration() {
  const {
    setGenerating,
    setError,
    setCurrentMenu,
    setShoppingList,
    setBatchGuide,
    showToast,
    setActiveTab,
  } = useAppStore();

  const { getExcludeNames, addMenuToHistory } = useHistoryRotation();

  async function generateMenu() {
    setGenerating(true, STEPS[0], 0);
    setError(null);

    try {
      const { weekNumber, year } = getCurrentWeekAndYear();
      const excludeNames = getExcludeNames();

      let weeklyMenu;

      if (geminiService.isConfigured()) {
        try {
          setGenerating(true, STEPS[0], 10);
          const aiResponse = await geminiService.generateWeeklyMenu(
            excludeNames,
            weekNumber,
            year
          );

          setGenerating(true, STEPS[1], 40);
          weeklyMenu = menuService.createWeeklyMenuFromAI(aiResponse, weekNumber, year);

          // Extract batch guide from AI response
          const guide: BatchCookingGuide = {
            id: `guide-${weeklyMenu.id}`,
            menuId: weeklyMenu.id,
            estimatedTotalTime: aiResponse.batchCookingGuide.estimatedTotalTime,
            tasks: aiResponse.batchCookingGuide.tasks,
            generatedAt: new Date().toISOString(),
          };
          storageService.set(STORAGE_KEYS.BATCH_GUIDE, guide);
          setBatchGuide(guide);
        } catch (geminiError) {
          console.warn('[MenuGen] Gemini falló, usando banco base:', geminiError);
          setGenerating(true, 'Gemini no disponible, usando banco de recetas...', 20);
          await new Promise(r => setTimeout(r, 1000));
          weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year);
        }
      } else {
        setGenerating(true, 'Usando banco de recetas base (sin API key Gemini)...', 20);
        await new Promise(r => setTimeout(r, 800));
        weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year);
      }

      setGenerating(true, STEPS[2], 60);
      await new Promise(r => setTimeout(r, 400));
      const shoppingList = shoppingListService.generateFromMenu(weeklyMenu);

      setGenerating(true, STEPS[3], 85);
      await new Promise(r => setTimeout(r, 300));

      // Persist
      storageService.set(STORAGE_KEYS.CURRENT_MENU, weeklyMenu);
      storageService.set(STORAGE_KEYS.SHOPPING_LIST, shoppingList);
      storageService.set(STORAGE_KEYS.LAST_GEN_DATE, new Date().toISOString());

      // Update store
      setCurrentMenu(weeklyMenu);
      setShoppingList(shoppingList);
      addMenuToHistory(weeklyMenu);

      setGenerating(false, '', 100);
      showToast('¡Menú generado correctamente!', 'success');
      setActiveTab(1); // navigate to menu tab
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setGenerating(false);
      setError(msg);
      showToast(msg, 'error');
    }
  }

  return { generateMenu };
}
