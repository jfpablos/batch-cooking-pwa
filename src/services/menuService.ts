import type {
  WeeklyMenu,
  DayMenu,
  DayName,
  BaseRecipe,
  RecipeMeal,
  NutritionInfo,
  WeeklyNutritionSummary,
  GeneratedMenuResponse,
  RecipeCategory,
  MealKey,
  MealSelection,
  RecipeScheduleEntry,
  StorageInfo,
} from '../types';
import { recipeService } from './recipeService';
import { buildFullSelection } from '../utils/prompts';
import { normalizeText } from '../utils/textUtils';
import { DAYS, MEAL_KEYS, MEAL_CATEGORY } from '../utils/constants';
import { reorderForShelfLife } from '../utils/shelfLifeOrder';

const ZERO_NUTRITION: NutritionInfo = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const SKIPPED_MEAL: RecipeMeal = {
  recipeId: 'skipped',
  recipeName: 'Comer fuera',
  nutrition: ZERO_NUTRITION,
  isSkipped: true,
};

function sumNutrition(items: NutritionInfo[]): NutritionInfo {
  return items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

function avgNutrition(days: DayMenu[]): WeeklyNutritionSummary {
  // Un día cuenta si tiene alguna comida planificada, aunque su nutrición sea
  // 0 por un desajuste de nombres — si no, la media diaria sale inflada.
  const activeDays = days.filter(d => Object.values(d.meals).some(m => !m.isSkipped));
  const n = activeDays.length || 1;
  const total = sumNutrition(activeDays.map(d => d.totalNutrition));
  return {
    avgDailyCalories: Math.round(total.calories / n),
    avgDailyProtein: Math.round(total.protein / n),
    avgDailyCarbs: Math.round(total.carbs / n),
    avgDailyFat: Math.round(total.fat / n),
  };
}

// La vida útil declarada por la IA decide el consejo nevera/congelador, así
// que no se acepta sin acotar: 1–4 días de nevera como máximo (seguridad
// alimentaria). Las recetas base curadas no pasan por aquí.
function sanitizeStorage(storage: StorageInfo | undefined): StorageInfo {
  const days = Number(storage?.days);
  return {
    days: Number.isFinite(days) ? Math.min(4, Math.max(1, Math.round(days))) : 3,
    freezable: storage?.freezable === true,
    instructions: storage?.instructions ?? '',
  };
}

function geminiRecipeToBase(gr: GeneratedMenuResponse['recipes'][0]): BaseRecipe {
  return {
    id: `gemini-${gr.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`,
    name: gr.name,
    category: gr.category,
    difficulty: 'medio',
    prepTime: gr.prepTime,
    cookTime: gr.cookTime,
    servings: gr.servings ?? 1,
    ingredients: gr.ingredients,
    steps: gr.steps,
    nutrition: gr.nutrition,
    storage: sanitizeStorage(gr.storage),
    tags: gr.tags ?? [],
    batchMultiplier: 5,
    batchNotes: gr.batchNotes,
    source: 'gemini',
    prepStyle: gr.prepStyle,
    sourceVideoId: gr.sourceVideoId || undefined,
  };
}

export const menuService = {
  createWeeklyMenuFromAI(
    aiResponse: GeneratedMenuResponse,
    weekNumber: number,
    year: number,
    selection: MealSelection = buildFullSelection()
  ): WeeklyMenu {
    const recipes: BaseRecipe[] = aiResponse.recipes.map(geminiRecipeToBase);
    const recipeMap = new Map(recipes.map(r => [normalizeText(r.name), r]));

    const days: DayMenu[] = DAYS.map(dayKey => {
      const dayGemini = aiResponse.weekMenu?.[dayKey];

      const getMeal = (mealKey: MealKey): RecipeMeal => {
        if (!selection[dayKey]?.[mealKey]) return SKIPPED_MEAL;
        const mealName = dayGemini?.[mealKey];
        if (!mealName) return SKIPPED_MEAL;
        const recipe = recipeMap.get(normalizeText(mealName));
        if (!recipe) {
          console.warn(`[Menu] "${mealName}" (${dayKey}/${mealKey}) no está en el array de recetas — quedará sin macros ni ingredientes`);
        }
        return {
          recipeId: recipe?.id ?? mealName,
          // Usa el nombre canónico de la ficha para que compra/guía/vídeos casen
          recipeName: recipe?.name ?? mealName,
          nutrition: recipe?.nutrition ?? { ...ZERO_NUTRITION },
        };
      };

      const meals = {
        desayuno: getMeal('desayuno'),
        preEntreno: getMeal('preEntreno'),
        principal: getMeal('principal'),
        postEntreno: getMeal('postEntreno'),
        cena: getMeal('cena'),
      };

      const totalNutrition = sumNutrition([
        meals.desayuno.nutrition,
        meals.preEntreno.nutrition,
        meals.principal.nutrition,
        meals.postEntreno.nutrition,
        meals.cena.nutrition,
      ]);

      return {
        day: dayKey as DayName,
        meals,
        totalNutrition,
      };
    });

    // Caducidad estricta: perecederos no congelables a principio de semana
    const orderedDays = reorderForShelfLife(days, recipes);

    const nutritionSummary: WeeklyNutritionSummary = {
      ...avgNutrition(orderedDays),
      notes: aiResponse.weeklyNutrition?.notes,
    };

    return {
      id: `menu-${weekNumber}-${year}-${Date.now()}`,
      weekNumber,
      year,
      generatedAt: new Date().toISOString(),
      days: orderedDays,
      nutritionSummary,
      recipes,
      source: 'gemini',
    };
  },

  createWeeklyMenuFromBase(
    excludeNames: string[],
    weekNumber: number,
    year: number,
    selection: MealSelection = buildFullSelection()
  ): WeeklyMenu {
    const excludeSet = new Set(excludeNames.map(n => n.toLowerCase()));
    const usedIds = new Set<string>();

    const getRecipe = (category: RecipeCategory): BaseRecipe => {
      const available = recipeService
        .getByCategory(category)
        .filter(r => !excludeSet.has(r.name.toLowerCase()) && !usedIds.has(r.id));

      if (available.length > 0) {
        const r = available[Math.floor(Math.random() * available.length)];
        usedIds.add(r.id);
        return r;
      }
      // Fallback: use any recipe of that category
      const all = recipeService.getByCategory(category);
      const r = all[Math.floor(Math.random() * all.length)];
      usedIds.add(r.id);
      return r;
    };

    const toMeal = (r: BaseRecipe): RecipeMeal => ({
      recipeId: r.id,
      recipeName: r.name,
      nutrition: r.nutrition,
    });

    const pickMeal = (day: DayName, key: MealKey): RecipeMeal => {
      if (!selection[day]?.[key]) return SKIPPED_MEAL;
      return toMeal(getRecipe(MEAL_CATEGORY[key]));
    };

    const days: DayMenu[] = DAYS.map(day => {
      const meals = {
        desayuno: pickMeal(day, 'desayuno'),
        preEntreno: pickMeal(day, 'preEntreno'),
        principal: pickMeal(day, 'principal'),
        postEntreno: pickMeal(day, 'postEntreno'),
        cena: pickMeal(day, 'cena'),
      };

      const totalNutrition = sumNutrition([
        meals.desayuno.nutrition,
        meals.preEntreno.nutrition,
        meals.principal.nutrition,
        meals.postEntreno.nutrition,
        meals.cena.nutrition,
      ]);

      return { day, meals, totalNutrition };
    });

    // Caducidad estricta: perecederos no congelables a principio de semana
    const orderedDays = reorderForShelfLife(days, recipeService.getAll());

    return {
      id: `menu-base-${weekNumber}-${year}-${Date.now()}`,
      weekNumber,
      year,
      generatedAt: new Date().toISOString(),
      days: orderedDays,
      nutritionSummary: avgNutrition(orderedDays),
      recipes: recipeService.getAll(),
      source: 'base',
    };
  },

  /**
   * Receta "al momento": se hace fresca en el día, no entra en el batch del
   * domingo (batidos, gachas de avena...). Usa el prepStyle asignado por la
   * IA; para recetas antiguas o del banco base, heurística por tiempo total.
   */
  isFreshRecipe(recipe: BaseRecipe): boolean {
    if (recipe.prepStyle) return recipe.prepStyle === 'al-momento';
    // Mismo umbral que la definición de "al-momento" del prompt (≤15 min)
    return recipe.prepTime + recipe.cookTime <= 15;
  },

  /**
   * Calendario de consumo: para cada receta del menú, en qué días/comidas
   * se come. Solo incluye recetas realmente planificadas (no skipped).
   */
  buildRecipeSchedule(menu: WeeklyMenu): RecipeScheduleEntry[] {
    const map = new Map<string, RecipeScheduleEntry>();
    for (const day of menu.days) {
      for (const key of MEAL_KEYS) {
        const meal = day.meals[key];
        if (meal.isSkipped) continue;
        let entry = map.get(meal.recipeName);
        if (!entry) {
          entry = { recipeName: meal.recipeName, occurrences: [] };
          map.set(meal.recipeName, entry);
        }
        entry.occurrences.push({ day: day.day, meal: key });
      }
    }
    return Array.from(map.values());
  },

  getAllRecipeNames(menu: WeeklyMenu): string[] {
    const names = new Set<string>();
    for (const day of menu.days) {
      for (const meal of [
        day.meals.desayuno,
        day.meals.preEntreno,
        day.meals.principal,
        day.meals.postEntreno,
        day.meals.cena,
      ]) {
        if (meal.isSkipped) continue;
        names.add(meal.recipeName);
      }
    }
    return Array.from(names);
  },

  getRecipeFromMenu(menu: WeeklyMenu, recipeName: string): BaseRecipe | undefined {
    return menu.recipes.find(
      r => r.name.toLowerCase() === recipeName.toLowerCase()
    );
  },

  /** Convierte una receta de Gemini al formato interno (para el swap). */
  recipeFromGemini(gr: GeneratedMenuResponse['recipes'][0]): BaseRecipe {
    return geminiRecipeToBase(gr);
  },

  /**
   * Sustituye una comida concreta del menú por otra receta, recalculando la
   * nutrición del día y el resumen semanal. La receta antigua se retira del
   * array si ya no se consume ningún día (solo en menús IA; el banco base se
   * conserva íntegro).
   */
  replaceMeal(menu: WeeklyMenu, dayName: DayName, mealKey: MealKey, recipe: BaseRecipe): WeeklyMenu {
    const oldName = menu.days.find(d => d.day === dayName)?.meals[mealKey]?.recipeName;

    // Si el menú ya tiene esta receta (aunque el nombre difiera en acentos o
    // mayúsculas), se reutiliza la existente: dos fichas con el mismo nombre
    // normalizado colisionarían en la lista de la compra, que agrega por
    // normalizeText.
    const existing = menu.recipes.find(r => normalizeText(r.name) === normalizeText(recipe.name));
    const finalRecipe = existing ?? recipe;

    const days: DayMenu[] = menu.days.map(d => {
      if (d.day !== dayName) return d;
      const meals = {
        ...d.meals,
        [mealKey]: { recipeId: finalRecipe.id, recipeName: finalRecipe.name, nutrition: finalRecipe.nutrition },
      };
      const totalNutrition = sumNutrition(MEAL_KEYS.map(k => meals[k].nutrition));
      return { ...d, meals, totalNutrition };
    });

    let recipes = existing ? menu.recipes : [...menu.recipes, recipe];
    if (oldName && menu.source === 'gemini') {
      const stillUsed = days.some(d =>
        MEAL_KEYS.some(k => !d.meals[k].isSkipped && d.meals[k].recipeName === oldName)
      );
      if (!stillUsed) recipes = recipes.filter(r => r.name !== oldName);
    }

    return {
      ...menu,
      days,
      recipes,
      nutritionSummary: { ...avgNutrition(days), notes: menu.nutritionSummary.notes },
    };
  },
};
