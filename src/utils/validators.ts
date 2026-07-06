import type {
  GeneratedMenuResponse,
  GeneratedGuideResponse,
  MealSelection,
  DayName,
  MealKey,
  ConservationMethod,
} from '../types';
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

  // Check variedad: en principal y cena una receta no puede repetirse más de
  // 2 días (con 5 días eso garantiza ≥3 recetas distintas por comida).
  if (obj.weekMenu && typeof obj.weekMenu === 'object') {
    const weekMenu = obj.weekMenu as Record<string, Record<string, unknown>>;
    for (const mealKey of ['principal', 'cena'] as MealKey[]) {
      const counts = new Map<string, number>();
      for (const day of DAYS) {
        if (!selection[day]?.[mealKey]) continue;
        const name = weekMenu[day]?.[mealKey];
        if (typeof name !== 'string' || !name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      for (const [name, count] of counts) {
        if (count > 2) {
          errors.push(`Receta "${name}" repetida ${count} días en ${mealKey} — máximo 2, se exige más variedad`);
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

export function validateGuideResponse(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Respuesta no es un objeto'] };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
    errors.push('Faltan tareas en la guía');
  } else {
    for (const task of obj.tasks as unknown[]) {
      const t = task as Record<string, unknown>;
      if (!t.title || typeof t.title !== 'string') errors.push('Tarea sin título');
      if (!t.description || typeof t.description !== 'string') {
        errors.push(`Tarea "${t.title}" sin descripción`);
      }
      if (typeof t.duration !== 'number' || Number.isNaN(t.duration)) {
        errors.push(`Tarea "${t.title}" sin duración numérica`);
      }
    }
  }

  if (!Array.isArray(obj.conservationPlan)) {
    errors.push('Falta conservationPlan');
  } else {
    for (const entry of obj.conservationPlan as unknown[]) {
      const e = entry as Record<string, unknown>;
      if (!e.recipeName || typeof e.recipeName !== 'string') {
        errors.push('Entrada de conservación sin recipeName');
      }
      if (!e.method || typeof e.method !== 'string') {
        errors.push(`Conservación de "${e.recipeName}" sin método`);
      }
      if (!e.reheatInstructions || typeof e.reheatInstructions !== 'string') {
        errors.push(`Conservación de "${e.recipeName}" sin recalentado`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

const VALID_METHODS: ConservationMethod[] = ['nevera', 'congelador', 'mixto'];

export function sanitizeGuideResponse(
  data: GeneratedGuideResponse,
  recipeNames: string[]
): GeneratedGuideResponse {
  const nameSet = new Set(recipeNames);

  const fixName = (name: string): string | null => {
    if (nameSet.has(name)) return name;
    const lower = (name ?? '').toLowerCase();
    const similar = recipeNames.find(
      r => r.toLowerCase().includes(lower.substring(0, 10)) ||
           lower.includes(r.toLowerCase().substring(0, 10))
    );
    return similar ?? null;
  };

  const tasks = (data.tasks ?? [])
    .map((t, i) => ({
      ...t,
      order: i + 1,
      title: t.title ?? `Tarea ${i + 1}`,
      description: t.description ?? '',
      duration: typeof t.duration === 'number' && !Number.isNaN(t.duration) ? t.duration : 10,
      parallelWith: typeof t.parallelWith === 'number' ? t.parallelWith : null,
      storageResult: t.storageResult ?? '',
      recipeNames: t.recipeNames
        ?.map(n => fixName(n))
        .filter((n): n is string => n !== null),
    }));

  const conservationPlan = (data.conservationPlan ?? [])
    .map(entry => {
      const fixed = fixName(entry.recipeName);
      if (!fixed) return null;
      return {
        ...entry,
        recipeName: fixed,
        method: VALID_METHODS.includes(entry.method) ? entry.method : 'nevera' as ConservationMethod,
        fridgeDays: typeof entry.fridgeDays === 'number' ? entry.fridgeDays : 4,
        targetDays: Array.isArray(entry.targetDays) ? entry.targetDays : [],
        reheatInstructions: entry.reheatInstructions ?? 'Microondas 2-3 min, remover a mitad.',
        container: entry.container ?? 'Tupper hermético',
        portions: entry.portions ?? '',
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return {
    estimatedTotalTime:
      typeof data.estimatedTotalTime === 'number' && !Number.isNaN(data.estimatedTotalTime)
        ? data.estimatedTotalTime
        : tasks.reduce((acc, t) => acc + t.duration, 0),
    tasks,
    conservationPlan,
  };
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
