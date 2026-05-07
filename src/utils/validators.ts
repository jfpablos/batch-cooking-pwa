import type { GeneratedMenuResponse } from '../types';

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
const MEALS = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'] as const;

export function validateMenuResponse(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Respuesta no es un objeto'] };
  }

  const obj = data as Record<string, unknown>;

  // Check weekMenu
  if (!obj.weekMenu || typeof obj.weekMenu !== 'object') {
    errors.push('Falta weekMenu');
  } else {
    const weekMenu = obj.weekMenu as Record<string, unknown>;
    for (const day of DAYS) {
      if (!weekMenu[day] || typeof weekMenu[day] !== 'object') {
        errors.push(`Falta día: ${day}`);
      } else {
        const dayMenu = weekMenu[day] as Record<string, unknown>;
        for (const meal of MEALS) {
          if (!dayMenu[meal] || typeof dayMenu[meal] !== 'string') {
            errors.push(`Falta comida ${meal} en ${day}`);
          }
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

export function sanitizeMenuResponse(data: GeneratedMenuResponse): GeneratedMenuResponse {
  // Normalizar nombres de recetas en el menú para que coincidan con el array
  const recipeNames = new Set(data.recipes.map(r => r.name));

  // Verificar que todas las referencias en el menú existen en recipes
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;
  const meals = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'] as const;

  for (const day of days) {
    for (const meal of meals) {
      const recipeName = data.weekMenu[day][meal];
      if (!recipeNames.has(recipeName)) {
        // Intentar encontrar una receta similar
        const similar = data.recipes.find(r =>
          r.name.toLowerCase().includes(recipeName.toLowerCase().substring(0, 10))
        );
        if (similar) {
          data.weekMenu[day][meal] = similar.name;
        }
      }
    }
  }

  return data;
}
