import type { DayName, MealKey, RecipeCategory, UserProfile } from '../types';

// Constantes de dominio compartidas — única fuente para días, comidas y
// targets nutricionales por defecto (antes duplicadas en prompts, validators,
// menuService y varias pantallas).

export const DAYS: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

export const MEAL_KEYS: MealKey[] = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'];

export const MEAL_CATEGORY: Record<MealKey, RecipeCategory> = {
  desayuno: 'desayuno',
  preEntreno: 'pre-entreno',
  principal: 'principal',
  postEntreno: 'post-entreno',
  cena: 'cena',
};

export const CATEGORY_TO_MEAL: Record<RecipeCategory, MealKey> = {
  'desayuno': 'desayuno',
  'pre-entreno': 'preEntreno',
  'principal': 'principal',
  'post-entreno': 'postEntreno',
  'cena': 'cena',
};

export const MEAL_LABELS: Record<MealKey, string> = {
  desayuno: 'Desayuno',
  preEntreno: 'Pre-entreno',
  principal: 'Principal',
  postEntreno: 'Post-entreno',
  cena: 'Cena',
};

export const DAY_LABELS: Record<DayName, { short: string; label: string }> = {
  lunes: { short: 'LUN', label: 'Lunes' },
  martes: { short: 'MAR', label: 'Martes' },
  miercoles: { short: 'MIÉ', label: 'Miércoles' },
  jueves: { short: 'JUE', label: 'Jueves' },
  viernes: { short: 'VIE', label: 'Viernes' },
};

export interface MealTarget {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Distribución por comida del GEMINI_SYSTEM_PROMPT (perfil por defecto)
export const MEAL_TARGETS: Record<MealKey, MealTarget> = {
  desayuno:    { kcal: 680, protein: 25, carbs: 100, fat: 20 },
  preEntreno:  { kcal: 518, protein: 16, carbs: 100, fat: 6 },
  principal:   { kcal: 935, protein: 50, carbs: 123, fat: 27 },
  postEntreno: { kcal: 573, protein: 41, carbs: 82,  fat: 9 },
  cena:        { kcal: 584, protein: 33, carbs: 50,  fat: 28 },
};

export const DAILY_TARGETS = { calories: 3290, protein: 165, carbs: 454, fat: 91 };

export const DEFAULT_PROFILE: UserProfile = {
  weightKg: 82.5,
  calories: DAILY_TARGETS.calories,
  protein: DAILY_TARGETS.protein,
  carbs: DAILY_TARGETS.carbs,
  fat: DAILY_TARGETS.fat,
};

/**
 * Targets por comida escalados al perfil del usuario, manteniendo el reparto
 * porcentual de la distribución por defecto.
 */
export function scaledMealTargets(profile: UserProfile): Record<MealKey, MealTarget> {
  const out = {} as Record<MealKey, MealTarget>;
  for (const key of MEAL_KEYS) {
    const t = MEAL_TARGETS[key];
    out[key] = {
      kcal: Math.round(t.kcal * profile.calories / DAILY_TARGETS.calories),
      protein: Math.round(t.protein * profile.protein / DAILY_TARGETS.protein),
      carbs: Math.round(t.carbs * profile.carbs / DAILY_TARGETS.carbs),
      fat: Math.round(t.fat * profile.fat / DAILY_TARGETS.fat),
    };
  }
  return out;
}

/** Objetivo kcal de un día contando solo las comidas planificadas. */
export function dayTargetKcal(
  skippedByMeal: Record<MealKey, boolean>,
  targets: Record<MealKey, MealTarget> = MEAL_TARGETS
): number {
  const total = MEAL_KEYS.reduce(
    (acc, key) => acc + (skippedByMeal[key] ? 0 : targets[key].kcal),
    0
  );
  return total > 0 ? total : DAILY_TARGETS.calories;
}
