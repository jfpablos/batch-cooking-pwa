import type { ConservationEntry, DayName, WeeklyMenu } from '../types';
import { menuService } from '../services/menuService';

// Días transcurridos desde el domingo de batch cooking hasta el consumo
const DAY_OFFSET: Record<DayName, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
};

const DAY_ORDER: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

/**
 * Plan de conservación básico derivado de los campos "storage" de cada receta
 * y del calendario de consumo real del menú. Se usa cuando la guía detallada
 * de Gemini no está disponible (fallo de la 2ª llamada o menú del banco base).
 */
export function buildBasicConservationPlan(menu: WeeklyMenu): ConservationEntry[] {
  const schedule = menuService.buildRecipeSchedule(menu);

  // Las recetas "al momento" se hacen frescas cada día: no se conservan
  const batchSchedule = schedule.filter(entry => {
    const recipe = menu.recipes.find(r => r.name === entry.recipeName);
    return !recipe || !menuService.isFreshRecipe(recipe);
  });

  return batchSchedule.map(entry => {
    const recipe = menu.recipes.find(r => r.name === entry.recipeName);
    const days = Array.from(new Set(entry.occurrences.map(o => o.day)))
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    const lastDay = days[days.length - 1];
    const lastOffset = lastDay ? DAY_OFFSET[lastDay] : 0;

    const fridgeDays = recipe?.storage.days ?? 4;
    const freezable = recipe?.storage.freezable ?? false;
    const needsFreezing = freezable && lastOffset > Math.min(fridgeDays, 3);

    const lateDays = days.filter(d => DAY_OFFSET[d] > Math.min(fridgeDays, 3));

    const base: ConservationEntry = {
      recipeName: entry.recipeName,
      method: needsFreezing ? 'mixto' : 'nevera',
      container: recipe?.storage.instructions || 'Tupper hermético en nevera',
      portions: needsFreezing
        ? `${days.length - lateDays.length} ración(es) nevera + ${lateDays.length} congelador`
        : `${entry.occurrences.length} ración(es) en nevera`,
      fridgeDays,
      reheatInstructions: 'Microondas 2-3 min a 800 W, remover a mitad. Añade un chorrito de agua si queda seco.',
      targetDays: days,
    };

    if (needsFreezing && lateDays.length > 0) {
      base.freezeInstructions = `Congela el domingo las raciones de ${lateDays.join(' y ')} en tuppers aptos para congelador.`;
      base.thawInstructions = 'Baja cada ración congelada a la nevera la noche anterior a su consumo para descongelar de forma segura.';
    }

    return base;
  });
}
