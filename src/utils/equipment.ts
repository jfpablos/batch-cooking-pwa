import type { BaseRecipe } from '../types';
import { normalizeText } from './textUtils';

// Electrodomésticos que una receta puede necesitar y que el usuario puede no
// tener (o no querer usar): estropeado, no disponible o pereza. Los fuegos,
// sartenes y ollas normales se asumen siempre disponibles y no se listan.

export interface Appliance {
  id: string;
  label: string;
  /** Términos normalizados (normalizeText) para detectar su uso en los pasos de las recetas base */
  keywords: string[];
}

export const APPLIANCES: Appliance[] = [
  { id: 'horno',      label: 'Horno',           keywords: ['horno', 'hornea', 'gratina'] },
  { id: 'airfryer',   label: 'Air fryer',       keywords: ['air fryer', 'airfryer', 'freidora de aire'] },
  { id: 'microondas', label: 'Microondas',      keywords: ['microondas'] },
  { id: 'olla-expres',label: 'Olla exprés',     keywords: ['olla expres', 'olla a presion', 'olla rapida'] },
  { id: 'batidora',   label: 'Batidora',        keywords: ['batidora', 'licuadora'] },
  { id: 'robot',      label: 'Robot de cocina', keywords: ['robot de cocina', 'thermomix'] },
];

export function excludedApplianceLabels(excludedIds: string[]): string[] {
  return APPLIANCES.filter(a => excludedIds.includes(a.id)).map(a => a.label);
}

export function availableApplianceLabels(excludedIds: string[]): string[] {
  return APPLIANCES.filter(a => !excludedIds.includes(a.id)).map(a => a.label);
}

/**
 * Detección best-effort para el banco de recetas base (sin campo de
 * equipamiento): busca los términos del electrodoméstico en los pasos y notas
 * de batch. Las instrucciones de conservación/recalentado no cuentan — que el
 * recalentado sugiera microondas no impide cocinar el plato.
 */
export function recipeUsesExcludedAppliance(recipe: BaseRecipe, excludedIds: string[]): boolean {
  const excluded = APPLIANCES.filter(a => excludedIds.includes(a.id));
  if (excluded.length === 0) return false;
  const text = normalizeText([...recipe.steps, recipe.batchNotes ?? ''].join(' '));
  return excluded.some(a => a.keywords.some(k => text.includes(k)));
}
