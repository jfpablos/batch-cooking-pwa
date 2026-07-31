import { useAppStore } from '../store/useAppStore';
import { geminiService } from '../services/geminiService';
import { menuService } from '../services/menuService';
import { shoppingListService } from '../services/shoppingListService';
import { storageService } from '../services/storageService';
import { youtubeService } from '../services/youtubeService';
import { videoRecipeService } from '../services/videoRecipeService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { targetWeekStartISO, weekAndYearFor } from '../utils/dateUtils';
import { useHistoryRotation } from './useHistoryRotation';
import { buildFullSelection, getCurrentSeason } from '../utils/prompts';
import { buildBasicConservationPlan } from '../utils/conservationFallback';
import { normalizeText } from '../utils/textUtils';
import type { BatchCookingGuide, MealSelection, WeeklyMenu } from '../types';

const STEPS = [
  'Consultando inteligencia artificial...',
  'Calculando macros y equilibrio nutricional...',
  'Detallando guía batch y conservación...',
  'Generando lista de la compra...',
  'Guardando menú semanal...',
];

const MAX_INSPIRATION_VIDEOS = 12;
const MAX_VIDEO_RECIPES = 15;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickInspirationVideos(videos: { title: string; description?: string }[]) {
  return shuffle(videos)
    .slice(0, MAX_INSPIRATION_VIDEOS)
    .map(v => ({ title: v.title, description: v.description?.slice(0, 250) }));
}

export function useMenuGeneration() {
  const setGenerating = useAppStore(s => s.setGenerating);
  const setError = useAppStore(s => s.setError);
  const setCurrentMenu = useAppStore(s => s.setCurrentMenu);
  const setShoppingList = useAppStore(s => s.setShoppingList);
  const setBatchGuide = useAppStore(s => s.setBatchGuide);
  const setNextMenu = useAppStore(s => s.setNextMenu);
  const setNextShoppingList = useAppStore(s => s.setNextShoppingList);
  const setNextBatchGuide = useAppStore(s => s.setNextBatchGuide);
  const setMenuView = useAppStore(s => s.setMenuView);
  const showToast = useAppStore(s => s.showToast);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const resetTimer = useAppStore(s => s.resetTimer);

  const { getExcludeNames, addMenuToHistory } = useHistoryRotation();

  async function generateMenu(
    selection: MealSelection = buildFullSelection(),
    target: 'current' | 'next' = 'current'
  ) {
    setGenerating(true, STEPS[0], 0);
    setError(null);

    try {
      // Semana y año de la semana OBJETIVO (esta o la siguiente), no de hoy
      const weekStart = targetWeekStartISO(target);
      const { weekNumber, year } = weekAndYearFor(weekStart);
      const { pantryItems, recipePrefs, profile } = useAppStore.getState();
      // Anti-repetición (últimas 4 semanas) + recetas vetadas por el usuario
      const excludeNames = Array.from(new Set([...getExcludeNames(), ...recipePrefs.banned]));
      const pantryNames = pantryItems.map(p => p.name);
      // Favoritas que no estén vetadas ni en cuarentena por repetición
      const excludeSet = new Set(excludeNames.map(normalizeText));
      const favoriteRecipes = recipePrefs.favorites.filter(f => !excludeSet.has(normalizeText(f)));

      let weeklyMenu: WeeklyMenu;
      // La guía se persiste al final junto al menú, en el slot que toque:
      // escribirla antes pisaría la guía de la semana en curso al generar next.
      let guide: BatchCookingGuide | null = null;

      if (geminiService.isConfigured()) {
        try {
          // Catálogo de recetas por vídeo: se construye bajo demanda desde la
          // pestaña Vídeos (analizar cada vídeo tarda ~1 min); aquí solo se
          // lee lo acumulado. Sin catálogo, fallback de títulos+descripciones.
          const videoRecipes = videoRecipeService.getCachedCatalog();
          const videoRecipesSample = shuffle(videoRecipes).slice(0, MAX_VIDEO_RECIPES);

          let inspirationVideos: { title: string; description?: string }[] = [];
          if (videoRecipesSample.length === 0) {
            const videos = await youtubeService.getPlaylistVideos().catch(() => []);
            inspirationVideos = pickInspirationVideos(videos);
          }

          setGenerating(true, STEPS[0], 10);
          const aiResponse = await geminiService.generateWeeklyMenu(
            excludeNames,
            weekNumber,
            year,
            selection,
            {
              pantryItems: pantryNames,
              videoRecipes: videoRecipesSample,
              inspirationVideos,
              favoriteRecipes,
              season: getCurrentSeason(),
            },
            profile
          );

          setGenerating(true, STEPS[1], 40);
          weeklyMenu = menuService.createWeeklyMenuFromAI(aiResponse, weekNumber, year, selection, weekStart);

          // Segunda llamada: guía ultra-detallada + plan de conservación.
          // Las recetas "al momento" (batidos, gachas...) no entran en el batch
          // del domingo, así que se excluyen de la guía y de la conservación.
          setGenerating(true, STEPS[2], 45);
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
          setGenerating(true, STEPS[2], 70);
        } catch (geminiError) {
          console.warn('[MenuGen] Gemini falló, usando banco base:', geminiError);
          setGenerating(true, 'Gemini no disponible, usando banco de recetas...', 20);
          await new Promise(r => setTimeout(r, 1000));
          guide = null;
          weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year, selection, weekStart);
        }
      } else {
        setGenerating(true, 'Usando banco de recetas base (sin API key Gemini)...', 20);
        await new Promise(r => setTimeout(r, 800));
        weeklyMenu = menuService.createWeeklyMenuFromBase(excludeNames, weekNumber, year, selection, weekStart);
      }

      setGenerating(true, STEPS[3], 80);
      await new Promise(r => setTimeout(r, 400));
      const rawList = shoppingListService.generateFromMenu(weeklyMenu);
      const shoppingList = shoppingListService.markPantryItems(rawList, pantryNames);

      setGenerating(true, STEPS[4], 92);
      await new Promise(r => setTimeout(r, 300));

      // Persist en el slot objetivo: 'next' no toca nada del menú en curso
      if (target === 'next') {
        storageService.set(STORAGE_KEYS.NEXT_MENU, weeklyMenu);
        storageService.set(STORAGE_KEYS.NEXT_SHOPPING_LIST, shoppingList);
        if (guide) storageService.set(STORAGE_KEYS.NEXT_BATCH_GUIDE, guide);
        else storageService.remove(STORAGE_KEYS.NEXT_BATCH_GUIDE);

        setNextMenu(weeklyMenu);
        setNextShoppingList(shoppingList);
        setNextBatchGuide(guide);
      } else {
        storageService.set(STORAGE_KEYS.CURRENT_MENU, weeklyMenu);
        storageService.set(STORAGE_KEYS.SHOPPING_LIST, shoppingList);
        storageService.set(STORAGE_KEYS.LAST_GEN_DATE, new Date().toISOString());
        if (guide) storageService.set(STORAGE_KEYS.BATCH_GUIDE, guide);

        // Nueva semana: progreso de la guía batch y temporizador a cero
        storageService.remove(STORAGE_KEYS.BATCH_PROGRESS);
        resetTimer();

        setCurrentMenu(weeklyMenu);
        setShoppingList(shoppingList);
        if (guide) setBatchGuide(guide);
      }
      addMenuToHistory(weeklyMenu);

      setGenerating(false, '', 100);
      showToast(
        target === 'next' ? '¡Menú de la próxima semana generado!' : '¡Menú generado correctamente!',
        'success'
      );
      setMenuView(target);
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
