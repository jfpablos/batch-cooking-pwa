import { useAppStore } from '../store/useAppStore';
import { geminiService } from '../services/geminiService';
import { menuService } from '../services/menuService';
import { shoppingListService } from '../services/shoppingListService';
import { storageService } from '../services/storageService';
import { youtubeService } from '../services/youtubeService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { getCurrentWeekAndYear } from '../utils/dateUtils';
import { useHistoryRotation } from './useHistoryRotation';
import { buildFullSelection } from '../utils/prompts';
import { buildBasicConservationPlan } from '../utils/conservationFallback';
import type { BatchCookingGuide, MealSelection, WeeklyMenu } from '../types';

const STEPS = [
  'Consultando inteligencia artificial...',
  'Calculando macros y equilibrio nutricional...',
  'Detallando guía batch y conservación...',
  'Generando lista de la compra...',
  'Guardando menú semanal...',
];

const MAX_INSPIRATION_VIDEOS = 12;

function pickInspirationVideos(videos: { title: string; description?: string }[]) {
  const shuffled = [...videos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled
    .slice(0, MAX_INSPIRATION_VIDEOS)
    .map(v => ({ title: v.title, description: v.description }));
}

export function useMenuGeneration() {
  const {
    setGenerating,
    setError,
    setCurrentMenu,
    setShoppingList,
    setBatchGuide,
    showToast,
    setActiveTab,
    resetTimer,
  } = useAppStore();

  const { getExcludeNames, addMenuToHistory } = useHistoryRotation();

  async function generateMenu(selection: MealSelection = buildFullSelection()) {
    setGenerating(true, STEPS[0], 0);
    setError(null);

    try {
      const { weekNumber, year } = getCurrentWeekAndYear();
      const excludeNames = getExcludeNames();
      const pantryNames = useAppStore.getState().pantryItems.map(p => p.name);

      let weeklyMenu: WeeklyMenu;

      if (geminiService.isConfigured()) {
        try {
          setGenerating(true, STEPS[0], 10);

          // Vídeos de la playlist como inspiración (cacheados; [] si no hay YouTube)
          const videos = await youtubeService.getPlaylistVideos().catch(() => []);
          const inspirationVideos = pickInspirationVideos(videos);

          const aiResponse = await geminiService.generateWeeklyMenu(
            excludeNames,
            weekNumber,
            year,
            selection,
            { pantryItems: pantryNames, inspirationVideos }
          );

          setGenerating(true, STEPS[1], 40);
          weeklyMenu = menuService.createWeeklyMenuFromAI(aiResponse, weekNumber, year, selection);

          // Segunda llamada: guía ultra-detallada + plan de conservación.
          // Las recetas "al momento" (batidos, gachas...) no entran en el batch
          // del domingo, así que se excluyen de la guía y de la conservación.
          setGenerating(true, STEPS[2], 45);
          let guide: BatchCookingGuide;
          try {
            const schedule = menuService.buildRecipeSchedule(weeklyMenu);
            const batchSchedule = schedule.filter(s => {
              const recipe = weeklyMenu.recipes.find(r => r.name === s.recipeName);
              return !recipe || !menuService.isFreshRecipe(recipe);
            });
            if (batchSchedule.length === 0) {
              throw new Error('Todas las recetas son al momento — sin batch que detallar');
            }
            const usedRecipes = weeklyMenu.recipes.filter(r =>
              batchSchedule.some(s => s.recipeName === r.name)
            );
            const guideResponse = await geminiService.generateBatchGuide(usedRecipes, batchSchedule);
            guide = {
              id: `guide-${weeklyMenu.id}`,
              menuId: weeklyMenu.id,
              estimatedTotalTime: guideResponse.estimatedTotalTime,
              tasks: guideResponse.tasks,
              conservationPlan: guideResponse.conservationPlan,
              detailLevel: 'detailed',
              generatedAt: new Date().toISOString(),
            };
          } catch (guideError) {
            console.warn('[MenuGen] Guía detallada falló, usando guía básica del menú:', guideError);
            guide = {
              id: `guide-${weeklyMenu.id}`,
              menuId: weeklyMenu.id,
              estimatedTotalTime: aiResponse.batchCookingGuide.estimatedTotalTime,
              tasks: aiResponse.batchCookingGuide.tasks,
              conservationPlan: buildBasicConservationPlan(weeklyMenu),
              detailLevel: 'basic',
              generatedAt: new Date().toISOString(),
            };
          }
          storageService.set(STORAGE_KEYS.BATCH_GUIDE, guide);
          setBatchGuide(guide);
          setGenerating(true, STEPS[2], 70);
        } catch (geminiError) {
          console.warn('[MenuGen] Gemini falló, usando banco base:', geminiError);
          setGenerating(true, 'Gemini no disponible, usando banco de recetas...', 20);
          await new Promise(r => setTimeout(r, 1000));
          weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year, selection);
        }
      } else {
        setGenerating(true, 'Usando banco de recetas base (sin API key Gemini)...', 20);
        await new Promise(r => setTimeout(r, 800));
        weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year, selection);
      }

      setGenerating(true, STEPS[3], 80);
      await new Promise(r => setTimeout(r, 400));
      const rawList = shoppingListService.generateFromMenu(weeklyMenu);
      const shoppingList = shoppingListService.markPantryItems(rawList, pantryNames);

      setGenerating(true, STEPS[4], 92);
      await new Promise(r => setTimeout(r, 300));

      // Persist
      storageService.set(STORAGE_KEYS.CURRENT_MENU, weeklyMenu);
      storageService.set(STORAGE_KEYS.SHOPPING_LIST, shoppingList);
      storageService.set(STORAGE_KEYS.LAST_GEN_DATE, new Date().toISOString());

      // Nueva semana: progreso de la guía batch y temporizador a cero
      storageService.remove(STORAGE_KEYS.BATCH_PROGRESS);
      resetTimer();

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
