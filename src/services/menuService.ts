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
} from '../types';
import { recipeService } from './recipeService';
import { buildFullSelection } from '../utils/prompts';

const DAYS: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const DAYS_GEMINI = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

const ZERO_NUTRITION: NutritionInfo = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const SKIPPED_MEAL: RecipeMeal = {
  recipeId: 'skipped',
  recipeName: 'Comer fuera',
  nutrition: ZERO_NUTRITION,
  isSkipped: true,
};

const MEAL_CATEGORY: Record<MealKey, RecipeCategory> = {
  desayuno: 'desayuno',
  preEntreno: 'pre-entreno',
  principal: 'principal',
  postEntreno: 'post-entreno',
  cena: 'cena',
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
  const activeDays = days.filter(d => d.totalNutrition.calories > 0);
  const n = activeDays.length || 1;
  const total = sumNutrition(activeDays.map(d => d.totalNutrition));
  return {
    avgDailyCalories: Math.round(total.calories / n),
    avgDailyProtein: Math.round(total.protein / n),
    avgDailyCarbs: Math.round(total.carbs / n),
    avgDailyFat: Math.round(total.fat / n),
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
    storage: gr.storage,
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
    const recipeMap = new Map(recipes.map(r => [r.name, r]));

    const days: DayMenu[] = DAYS_GEMINI.map(dayKey => {
      const dayGemini = aiResponse.weekMenu?.[dayKey];

      const getMeal = (mealKey: MealKey): RecipeMeal => {
        if (!selection[dayKey]?.[mealKey]) return SKIPPED_MEAL;
        const mealName = dayGemini?.[mealKey];
        if (!mealName) return SKIPPED_MEAL;
        const recipe = recipeMap.get(mealName);
        return {
          recipeId: recipe?.id ?? mealName,
          recipeName: mealName,
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

    const nutritionSummary: WeeklyNutritionSummary = {
      ...avgNutrition(days),
      notes: aiResponse.weeklyNutrition?.notes,
    };

    return {
      id: `menu-${weekNumber}-${year}-${Date.now()}`,
      weekNumber,
      year,
      generatedAt: new Date().toISOString(),
      days,
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

    return {
      id: `menu-base-${weekNumber}-${year}-${Date.now()}`,
      weekNumber,
      year,
      generatedAt: new Date().toISOString(),
      days,
      nutritionSummary: avgNutrition(days),
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
    return recipe.prepTime + recipe.cookTime <= 12;
  },

  /**
   * Calendario de consumo: para cada receta del menú, en qué días/comidas
   * se come. Solo incluye recetas realmente planificadas (no skipped).
   */
  buildRecipeSchedule(menu: WeeklyMenu): RecipeScheduleEntry[] {
    const map = new Map<string, RecipeScheduleEntry>();
    const mealKeys: MealKey[] = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'];
    for (const day of menu.days) {
      for (const key of mealKeys) {
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
};
