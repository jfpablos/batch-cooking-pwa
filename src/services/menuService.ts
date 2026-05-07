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
} from '../types';
import { recipeService } from './recipeService';

const DAYS: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const DAYS_GEMINI = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

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
  const n = days.length;
  const total = sumNutrition(days.map(d => d.totalNutrition));
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
  };
}

export const menuService = {
  createWeeklyMenuFromAI(
    aiResponse: GeneratedMenuResponse,
    weekNumber: number,
    year: number
  ): WeeklyMenu {
    const recipes: BaseRecipe[] = aiResponse.recipes.map(geminiRecipeToBase);
    const recipeMap = new Map(recipes.map(r => [r.name, r]));

    const days: DayMenu[] = DAYS_GEMINI.map(dayKey => {
      const dayGemini = aiResponse.weekMenu[dayKey];

      const getMeal = (mealName: string, category: RecipeCategory): RecipeMeal => {
        const recipe = recipeMap.get(mealName);
        return {
          recipeId: recipe?.id ?? mealName,
          recipeName: mealName,
          nutrition: recipe?.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          category,
        } as RecipeMeal & { category: RecipeCategory };
      };

      const meals = {
        desayuno: getMeal(dayGemini.desayuno, 'desayuno'),
        preEntreno: getMeal(dayGemini.preEntreno, 'pre-entreno'),
        principal: getMeal(dayGemini.principal, 'principal'),
        postEntreno: getMeal(dayGemini.postEntreno, 'post-entreno'),
        cena: getMeal(dayGemini.cena, 'cena'),
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
      avgDailyCalories: aiResponse.weeklyNutrition.avgDailyCalories,
      avgDailyProtein: aiResponse.weeklyNutrition.avgDailyProtein,
      avgDailyCarbs: aiResponse.weeklyNutrition.avgDailyCarbs,
      avgDailyFat: aiResponse.weeklyNutrition.avgDailyFat,
      notes: aiResponse.weeklyNutrition.notes,
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
    year: number
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

    const days: DayMenu[] = DAYS.map(day => {
      const meals = {
        desayuno: toMeal(getRecipe('desayuno')),
        preEntreno: toMeal(getRecipe('pre-entreno')),
        principal: toMeal(getRecipe('principal')),
        postEntreno: toMeal(getRecipe('post-entreno')),
        cena: toMeal(getRecipe('cena')),
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

  getAllRecipeNames(menu: WeeklyMenu): string[] {
    const names = new Set<string>();
    for (const day of menu.days) {
      names.add(day.meals.desayuno.recipeName);
      names.add(day.meals.preEntreno.recipeName);
      names.add(day.meals.principal.recipeName);
      names.add(day.meals.postEntreno.recipeName);
      names.add(day.meals.cena.recipeName);
    }
    return Array.from(names);
  },

  getRecipeFromMenu(menu: WeeklyMenu, recipeName: string): BaseRecipe | undefined {
    return menu.recipes.find(
      r => r.name.toLowerCase() === recipeName.toLowerCase()
    );
  },
};
