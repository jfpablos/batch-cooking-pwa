// =============================================================================
// ACCIONES DIARIAS DE CONSERVACIÓN — módulo compartido cliente ⇄ Edge Function
// =============================================================================
// Deriva, de forma DETERMINISTA, qué hay que hacer cada día de la semana con
// los platos del batch cooking: congelar el domingo, bajar del congelador a la
// nevera la noche anterior al consumo, y qué se come cada día.
//
// Este fichero vive bajo supabase/functions/ porque `supabase functions deploy`
// solo empaqueta ese árbol; el cliente lo re-exporta desde src/utils/dailyActions.ts.
// Por eso es AUTOCONTENIDO: cero imports, tipos estructurales propios (duck
// typing con WeeklyMenu/ConservationEntry/BatchCookingGuide de src/types) y
// aritmética de fechas sobre strings 'YYYY-MM-DD' (inmune a TZ/DST). Debe
// funcionar igual en el navegador y en Deno.
//
// Semántica de la derivación (misma regla que src/utils/conservationFallback.ts):
// - Días congelados de una entrada: 'nevera' → ninguno; 'congelador' → todos
//   los targetDays; 'mixto' → los targetDays cuyo offset desde el domingo de
//   cocinado (lunes=1..viernes=5) supere fridgeDays. targetDays que no sean
//   días L-V válidos (la IA a veces devuelve otras cosas) se descartan.
// - Por cada día congelado d: acción 'thaw' con dueDate = fecha(d) − 1 día.
//   Descongelar para el lunes cae en domingo (noche del cocinado). El viernes
//   por la noche nunca hay 'thaw' porque no existe consumo el sábado.
// - Si la entrada tiene días congelados: acción 'freeze' con dueDate = domingo.
// - Acciones 'eat' informativas por día de consumo (solo recetas batch).
// NUNCA se parsea el texto libre thawInstructions/freezeInstructions de la IA.

export type DailyActionType = 'thaw' | 'freeze' | 'eat';

export interface DailyAction {
  /** Id estable: `${menuId}:${type}:${recipeName}:${targetDay}` */
  id: string;
  type: DailyActionType;
  recipeName: string;
  /** 'YYYY-MM-DD' — día en que SE HACE la acción */
  dueDate: string;
  /** Día de consumo al que sirve ('lunes'..'viernes'; en 'freeze', el primero congelado) */
  targetDay: string;
  message: string;
}

// --- Tipos estructurales mínimos (compatibles con src/types/index.ts) -------

interface MinimalMeal {
  recipeName: string;
  isSkipped?: boolean;
}

interface MinimalDayMeals {
  desayuno: MinimalMeal;
  preEntreno: MinimalMeal;
  principal: MinimalMeal;
  postEntreno: MinimalMeal;
  cena: MinimalMeal;
}

interface MinimalRecipe {
  name: string;
  prepTime: number;
  cookTime: number;
  prepStyle?: string;
  storage: { days: number; instructions?: string; freezable: boolean };
}

export interface MinimalMenu {
  id: string;
  generatedAt: string;
  days: { day: string; meals: MinimalDayMeals }[];
  recipes: MinimalRecipe[];
}

export interface MinimalConservationEntry {
  recipeName: string;
  method: string;
  fridgeDays: number;
  targetDays: string[];
}

export interface MinimalGuide {
  menuId: string;
  conservationPlan?: MinimalConservationEntry[];
}

// --- Calendario ---------------------------------------------------------------

const MEAL_KEYS = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'] as const;

/** Días transcurridos desde el domingo de batch cooking hasta el consumo */
export const DAY_OFFSET: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
};

const WEEK_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

function toUtcMs(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(dateISO: string, days: number): string {
  return new Date(toUtcMs(dateISO) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 0=domingo .. 6=sábado */
function dayOfWeek(dateISO: string): number {
  return new Date(toUtcMs(dateISO)).getUTCDay();
}

/** Fecha 'YYYY-MM-DD' de un instante en una zona horaria (por defecto Madrid). */
export function dateInTimeZone(date: Date, timeZone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Lunes de la semana de CONSUMO del menú, derivado de generatedAt:
 * generado en sábado/domingo → el lunes siguiente (se cocina el domingo para
 * la semana que empieza); generado L-V → el lunes de esa misma semana.
 */
export function getWeekStart(menu: MinimalMenu): string {
  const genDate = dateInTimeZone(new Date(menu.generatedAt));
  const dow = dayOfWeek(genDate);
  if (dow === 0) return addDays(genDate, 1); // domingo → lunes siguiente
  if (dow === 6) return addDays(genDate, 2); // sábado → lunes siguiente
  return addDays(genDate, 1 - dow); // L-V → lunes de esa semana
}

/** Fecha real 'YYYY-MM-DD' de cada día de consumo del menú. */
export function getWeekDates(menu: MinimalMenu): Record<string, string> {
  const weekStart = getWeekStart(menu);
  const out: Record<string, string> = {};
  for (const day of WEEK_DAYS) out[day] = addDays(weekStart, DAY_OFFSET[day] - 1);
  return out;
}

/** ¿El menú está vigente en esa fecha? Vigencia: domingo de cocinado .. viernes. */
export function isMenuActiveOn(menu: MinimalMenu, dateISO: string): boolean {
  const weekStart = getWeekStart(menu);
  const sunday = addDays(weekStart, -1);
  const friday = addDays(weekStart, 4);
  return dateISO >= sunday && dateISO <= friday;
}

// --- Recetas y calendario de consumo -----------------------------------------

/** Misma heurística que menuService.isFreshRecipe (recetas "al momento"). */
function isFresh(recipe: MinimalRecipe): boolean {
  if (recipe.prepStyle) return recipe.prepStyle === 'al-momento';
  return recipe.prepTime + recipe.cookTime <= 15;
}

/** recipeName → días únicos de consumo, ordenados L→V (solo comidas no skipped). */
function buildConsumptionDays(menu: MinimalMenu): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const day of menu.days) {
    if (!(day.day in DAY_OFFSET)) continue;
    for (const key of MEAL_KEYS) {
      const meal = day.meals[key];
      if (!meal || meal.isSkipped) continue;
      let set = map.get(meal.recipeName);
      if (!set) {
        set = new Set();
        map.set(meal.recipeName, set);
      }
      set.add(day.day);
    }
  }
  const out = new Map<string, string[]>();
  for (const [name, days] of map) {
    out.set(name, Array.from(days).sort((a, b) => DAY_OFFSET[a] - DAY_OFFSET[b]));
  }
  return out;
}

// --- Plan de conservación -----------------------------------------------------

/**
 * Plan mínimo derivado de los campos storage de las recetas, réplica de
 * src/utils/conservationFallback.ts (mantener en sync): congelar solo lo que
 * es freezable y se consume más tarde de lo que aguanta en nevera.
 */
export function buildFallbackPlan(menu: MinimalMenu): MinimalConservationEntry[] {
  const consumption = buildConsumptionDays(menu);
  const plan: MinimalConservationEntry[] = [];
  for (const [recipeName, days] of consumption) {
    const recipe = menu.recipes.find(r => r.name === recipeName);
    if (recipe && isFresh(recipe)) continue;
    const fridgeDays = recipe?.storage.days ?? 4;
    const freezable = recipe?.storage.freezable ?? false;
    const lastOffset = days.length ? DAY_OFFSET[days[days.length - 1]] : 0;
    const needsFreezing = freezable && lastOffset > fridgeDays;
    plan.push({
      recipeName,
      method: needsFreezing ? 'mixto' : 'nevera',
      fridgeDays,
      targetDays: days,
    });
  }
  return plan;
}

/**
 * Endurece el plan de la IA: si una receta CONGELABLE está marcada 'nevera'
 * pero alguna ración se consume más tarde de lo que aguanta (offset desde el
 * domingo > fridgeDays), se fuerza 'mixto' (o 'congelador' si todas las
 * raciones son tardías) para que existan acciones de congelar/descongelar.
 * Las recetas no congelables se dejan como estén (congelar una ensalada la
 * estropea; ahí la IA es la única referencia). Preserva el resto de campos
 * de la entrada (container, portions, reheat...).
 */
export function normalizeConservationPlan<T extends MinimalConservationEntry>(
  menu: MinimalMenu,
  plan: T[]
): T[] {
  return plan.map(entry => {
    if (entry.method !== 'nevera') return entry;
    const recipe = menu.recipes.find(r => r.name === entry.recipeName);
    if (!recipe?.storage.freezable) return entry;
    const valid = entry.targetDays
      .filter(d => d in DAY_OFFSET)
      .sort((a, b) => DAY_OFFSET[a] - DAY_OFFSET[b]);
    const late = valid.filter(d => DAY_OFFSET[d] > entry.fridgeDays);
    if (!late.length) return entry;
    const upgraded = {
      ...entry,
      method: late.length === valid.length ? 'congelador' : 'mixto',
    } as T & { freezeInstructions?: string; thawInstructions?: string };
    upgraded.freezeInstructions ||=
      `Congela el domingo las raciones de ${late.join(' y ')}: no aguantan ${entry.fridgeDays} días en nevera.`;
    upgraded.thawInstructions ||=
      'Baja cada ración congelada a la nevera la noche anterior a su consumo.';
    return upgraded;
  });
}

/**
 * Plan de conservación efectivo: el detallado de la guía IA si corresponde a
 * este menú y no está vacío; si no, el fallback derivado de las recetas.
 * Siempre normalizado (ver normalizeConservationPlan). Misma cascada que
 * BatchGuideScreen.
 */
export function resolveConservationPlan(
  menu: MinimalMenu,
  guide: MinimalGuide | null | undefined
): MinimalConservationEntry[] {
  const plan =
    guide && guide.menuId === menu.id && guide.conservationPlan?.length
      ? guide.conservationPlan
      : buildFallbackPlan(menu);
  return normalizeConservationPlan(menu, plan);
}

// --- Derivación de acciones ----------------------------------------------------

/** Días de una entrada que se conservan congelados (ver semántica en cabecera). */
export function frozenTargetDays(entry: MinimalConservationEntry): string[] {
  const valid = entry.targetDays
    .filter(d => d in DAY_OFFSET)
    .sort((a, b) => DAY_OFFSET[a] - DAY_OFFSET[b]);
  if (entry.method === 'congelador') return valid;
  if (entry.method === 'mixto') return valid.filter(d => DAY_OFFSET[d] > entry.fridgeDays);
  return [];
}

export function deriveWeekActions(
  menu: MinimalMenu,
  plan: MinimalConservationEntry[]
): DailyAction[] {
  const weekDates = getWeekDates(menu);
  const sunday = addDays(getWeekStart(menu), -1);
  const freshNames = new Set(menu.recipes.filter(isFresh).map(r => r.name));
  const actions: DailyAction[] = [];
  const frozenByRecipe = new Map<string, Set<string>>();

  for (const entry of plan) {
    if (freshNames.has(entry.recipeName)) continue;
    const frozen = frozenTargetDays(entry);
    if (!frozen.length) continue;
    frozenByRecipe.set(entry.recipeName, new Set(frozen));

    actions.push({
      id: `${menu.id}:freeze:${entry.recipeName}:${frozen[0]}`,
      type: 'freeze',
      recipeName: entry.recipeName,
      dueDate: sunday,
      targetDay: frozen[0],
      message: `Congela hoy las raciones de ${entry.recipeName} de ${frozen.join(' y ')}`,
    });

    for (const day of frozen) {
      actions.push({
        id: `${menu.id}:thaw:${entry.recipeName}:${day}`,
        type: 'thaw',
        recipeName: entry.recipeName,
        dueDate: addDays(weekDates[day], -1),
        targetDay: day,
        message: `Baja ${entry.recipeName} del congelador a la nevera para mañana (${day})`,
      });
    }
  }

  // Acciones informativas "hoy comes X" (solo recetas batch)
  const consumption = buildConsumptionDays(menu);
  for (const [recipeName, days] of consumption) {
    if (freshNames.has(recipeName)) continue;
    const frozenDays = frozenByRecipe.get(recipeName);
    for (const day of days) {
      const wasFrozen = frozenDays?.has(day);
      actions.push({
        id: `${menu.id}:eat:${recipeName}:${day}`,
        type: 'eat',
        recipeName,
        dueDate: weekDates[day],
        targetDay: day,
        message: `Hoy comes ${recipeName}${wasFrozen ? ' (descongelado ayer)' : ' (de nevera)'}`,
      });
    }
  }

  return actions;
}

/** Acciones cuya ejecución toca en una fecha concreta ('YYYY-MM-DD'). */
export function actionsForDate(
  menu: MinimalMenu,
  plan: MinimalConservationEntry[],
  dateISO: string
): DailyAction[] {
  return deriveWeekActions(menu, plan).filter(a => a.dueDate === dateISO);
}
