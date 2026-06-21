import type { GeneratedMenuResponse, MealSelection, DayName, MealKey } from '../types';
import { buildFullSelection } from './prompts';

const DAYS: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const MEAL_KEYS: MealKey[] = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'];

export function validateMenuResponse(
  data: unknown,
  selection: MealSelection = buildFullSelection()
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Respuesta no es un objeto'] };
  }

  const obj = data as Record<string, unknown>;

  // Check weekMenu — only validate days/meals that are selected
  if (!obj.weekMenu || typeof obj.weekMenu !== 'object') {
    errors.push('Falta weekMenu');
  } else {
    const weekMenu = obj.weekMenu as Record<string, unknown>;
    for (const day of DAYS) {
      const selectedKeys = MEAL_KEYS.filter(k => selection[day]?.[k]);
      if (selectedKeys.length === 0) continue;

      if (!weekMenu[day] || typeof weekMenu[day] !== 'object') {
        errors.push(`Falta día: ${day}`);
        continue;
      }
      const dayMenu = weekMenu[day] as Record<string, unknown>;
      for (const meal of selectedKeys) {
        if (!dayMenu[meal] || typeof dayMenu[meal] !== 'string') {
          errors.push(`Falta comida ${meal} en ${day}`);
        }
      }
    }
  }

  // Check recipes array
  if (!Array.isArray(obj.recipes)) {
    errors.push('Falta array de recetas');
  } else if (obj.recipes.length === 0) {
    errors.push('Array de recetas vacío');
  } else {
    for (const recipe of obj.recipes as unknown[]) {
      const r = recipe as Record<string, unknown>;
      if (!r.name) errors.push('Receta sin nombre');
      if (!r.ingredients || !Array.isArray(r.ingredients)) {
        errors.push(`Receta "${r.name}" sin ingredientes`);
      }
      if (!r.nutrition || typeof r.nutrition !== 'object') {
        errors.push(`Receta "${r.name}" sin nutrición`);
      }
    }
  }

  // Check batchCookingGuide
  if (!obj.batchCookingGuide || typeof obj.batchCookingGuide !== 'object') {
    errors.push('Falta batchCookingGuide');
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeMenuResponse(
  data: GeneratedMenuResponse,
  selection: MealSelection = buildFullSelection()
): GeneratedMenuResponse {
  const recipeNames = new Set(data.recipes.map(r => r.name));

  // Verify references exist in recipes — only for selected cells
  for (const day of DAYS) {
    const selectedKeys = MEAL_KEYS.filter(k => selection[day]?.[k]);
    if (selectedKeys.length === 0) continue;
    const dayMenu = data.weekMenu?.[day];
    if (!dayMenu) continue;

    const dayBag = dayMenu as unknown as Record<string, string>;
    for (const meal of selectedKeys) {
      const recipeName = dayBag[meal];
      if (recipeName && !recipeNames.has(recipeName)) {
        const similar = data.recipes.find(r =>
          r.name.toLowerCase().includes(recipeName.toLowerCase().substring(0, 10))
        );
        if (similar) {
          dayBag[meal] = similar.name;
        }
      }
    }
  }

  return data;
}
