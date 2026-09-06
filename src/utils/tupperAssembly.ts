import type {
  BaseRecipe,
  ConservationEntry,
  DayName,
  Ingredient,
  MealKey,
  WeeklyMenu,
} from '../types';
import { menuService } from '../services/menuService';
import { DAYS, MEAL_KEYS, DAY_LABELS, MEAL_LABELS } from './constants';
import { frozenTargetDays } from './dailyActions';

export type TupperDestination = 'nevera' | 'congelador';

/** Un tuper concreto: una ración de una receta para un día y comida. */
export interface TupperUnit {
  id: string;
  recipeName: string;
  day: DayName;
  meal: MealKey;
  /** Texto sugerido para la etiqueta de la tapa, ej. "LUN · Principal" */
  label: string;
  destination: TupperDestination;
}

/** Montaje de una receta del batch: cuántos tupers y qué lleva cada uno. */
export interface RecipeAssembly {
  recipeName: string;
  recipe?: BaseRecipe;
  units: TupperUnit[];
  /** Ingredientes de UNA ración (lo que va en cada tuper) */
  perTupper: Ingredient[];
  fridgeCount: number;
  freezerCount: number;
  /** Consejos de reparto: batchNotes de la receta y envase del plan */
  notes: string[];
}

export function tupperId(recipeName: string, day: DayName, meal: MealKey): string {
  return `${recipeName}|${day}|${meal}`;
}

export function tupperLabel(day: DayName, meal: MealKey): string {
  return `${DAY_LABELS[day].short} · ${MEAL_LABELS[meal]}`;
}

/** "250 g", "200 ml", "4 ud" — cantidades compactas para los chips. */
export function formatIngredientAmount(ing: Ingredient): string {
  const parsed = Number(ing.amount);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  const unit = (ing.unit ?? '').trim().toLowerCase();
  const unitLabel =
    unit === 'unidad' || unit === 'unidades' || unit === 'ud' || unit === 'uds' ? 'ud'
    : unit === 'kg' ? 'kg'
    : unit === 'l' ? 'l'
    : unit;
  const rounded = Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 10) / 10);
  return unitLabel ? `${rounded} ${unitLabel}` : rounded;
}

/**
 * Deriva el montaje de tupers del menú actual: una entrada por receta de
 * batch (las "al momento" se excluyen) con un tuper por cada día/comida en
 * que se consume, y el destino de cada uno (nevera o congelador) según el
 * plan de conservación ya normalizado — misma regla que las acciones diarias.
 */
export function buildTupperAssembly(
  menu: WeeklyMenu,
  conservation: ConservationEntry[]
): RecipeAssembly[] {
  const planByName = new Map(conservation.map(e => [e.recipeName, e]));

  return menuService.buildRecipeSchedule(menu)
    .map((entry): RecipeAssembly | null => {
      const recipe = menu.recipes.find(r => r.name === entry.recipeName);
      if (recipe && menuService.isFreshRecipe(recipe)) return null;

      const plan = planByName.get(entry.recipeName);
      const frozenDays = new Set(plan ? frozenTargetDays(plan) : []);

      const units: TupperUnit[] = entry.occurrences
        .slice()
        .sort((a, b) =>
          DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
          MEAL_KEYS.indexOf(a.meal) - MEAL_KEYS.indexOf(b.meal))
        .map(o => ({
          id: tupperId(entry.recipeName, o.day, o.meal),
          recipeName: entry.recipeName,
          day: o.day,
          meal: o.meal,
          label: tupperLabel(o.day, o.meal),
          destination: frozenDays.has(o.day) ? 'congelador' : 'nevera',
        }));

      const notes = Array.from(new Set(
        [recipe?.batchNotes, plan?.container]
          .map(n => (n ?? '').trim())
          .filter(n => n.length > 0)
      ));

      return {
        recipeName: entry.recipeName,
        recipe,
        units,
        perTupper: recipe?.ingredients ?? [],
        fridgeCount: units.filter(u => u.destination === 'nevera').length,
        freezerCount: units.filter(u => u.destination === 'congelador').length,
        notes,
      };
    })
    .filter((a): a is RecipeAssembly => a !== null)
    // Primero las recetas con más tupers: son las que más cuesta repartir
    .sort((a, b) => b.units.length - a.units.length || a.recipeName.localeCompare(b.recipeName, 'es'));
}
