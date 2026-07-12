import type { BaseRecipe, DayMenu, NutritionInfo, RecipeMeal } from '../types';
import { MEAL_KEYS } from './constants';

/**
 * Reordena el menú para que TODOS los platos cumplan su caducidad de forma
 * estricta: dentro de cada franja (desayuno, principal, cena...), los platos
 * NO congelables de vida corta se mueven a principio de semana y los
 * congelables / frescos / de vida larga se desplazan al final (los congelables
 * tardíos se congelan el domingo y se descongelan la noche anterior — regla de
 * normalizeConservationPlan). Solo se toca una franja si tiene violaciones,
 * y las posiciones saltadas (comer fuera) no se mueven. Determinista y
 * aplicado tanto al menú de la IA como al del banco base.
 */
export function reorderForShelfLife(days: DayMenu[], recipes: BaseRecipe[]): DayMenu[] {
  const byName = new Map(recipes.map(r => [r.name, r]));

  // Último día (offset desde el domingo, lunes=1) en que puede comerse:
  // sin límite si es fresca (se hace en el día), congelable (se congela) o
  // desconocida (no hay ficha para juzgar).
  const maxOffset = (meal: RecipeMeal): number => {
    const recipe = byName.get(meal.recipeName);
    if (!recipe) return Infinity;
    const isFresh = recipe.prepStyle
      ? recipe.prepStyle === 'al-momento'
      : recipe.prepTime + recipe.cookTime <= 15;
    if (isFresh || recipe.storage.freezable) return Infinity;
    return recipe.storage.days;
  };

  const newDays = days.map(d => ({ ...d, meals: { ...d.meals } }));
  let changed = false;

  for (const key of MEAL_KEYS) {
    const positions: number[] = [];
    for (let i = 0; i < newDays.length; i++) {
      if (!newDays[i].meals[key].isSkipped) positions.push(i);
    }
    const items = positions.map(i => newDays[i].meals[key]);

    // offset del día = índice + 1 (lunes=1 .. viernes=5)
    const violated = positions.some((pos, k) => maxOffset(items[k]) < pos + 1);
    if (!violated) continue;

    // Límite ascendente (estable): los más perecederos a los primeros días
    // disponibles. Si ni así caben (p.ej. cinco platos de 3 días), el orden
    // resultante es el que minimiza los días de exceso.
    const sorted = items
      .map((meal, k) => ({ meal, k }))
      .sort((a, b) => maxOffset(a.meal) - maxOffset(b.meal) || a.k - b.k)
      .map(x => x.meal);
    positions.forEach((pos, k) => {
      newDays[pos].meals[key] = sorted[k];
    });
    changed = true;
  }

  if (!changed) return days;

  for (const day of newDays) {
    day.totalNutrition = MEAL_KEYS.map(k => day.meals[k].nutrition).reduce<NutritionInfo>(
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
  return newDays;
}
