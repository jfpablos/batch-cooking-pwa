import type {
  WeeklyMenu,
  ShoppingList,
  ShoppingCategory,
  ShoppingCategoryName,
  ShoppingItem,
  Ingredient,
  BaseRecipe,
} from '../types';
import { normalizeText } from '../utils/textUtils';

// Mapeo de ingredientes a categorías
const CATEGORY_MAP: Record<string, ShoppingCategoryName> = {
  // Proteínas
  'pechuga de pollo': 'Proteínas',
  'muslo de pollo': 'Proteínas',
  'pollo': 'Proteínas',
  'pechuga de pavo': 'Proteínas',
  'pavo': 'Proteínas',
  'lomo de salmón': 'Proteínas',
  'salmón': 'Proteínas',
  'lomo de merluza': 'Proteínas',
  'merluza': 'Proteínas',
  'lomo de bacalao': 'Proteínas',
  'bacalao': 'Proteínas',
  'atún en agua': 'Proteínas',
  'atún': 'Proteínas',
  'ternera': 'Proteínas',
  'tofu firme': 'Proteínas',
  'tofu': 'Proteínas',
  'huevos': 'Lácteos y Huevos',
  'huevo': 'Lácteos y Huevos',
  'proteína whey': 'Proteínas',
  'jamón york': 'Proteínas',

  // Carbohidratos
  'arroz blanco': 'Carbohidratos',
  'arroz integral': 'Carbohidratos',
  'arroz': 'Carbohidratos',
  'avena': 'Carbohidratos',
  'avena en copos': 'Carbohidratos',
  'avena molida': 'Carbohidratos',
  'avena en copos finos': 'Carbohidratos',
  'quinoa': 'Carbohidratos',
  'pan integral': 'Carbohidratos',
  'pan integral de molde': 'Carbohidratos',
  'patata': 'Carbohidratos',
  'boniato': 'Carbohidratos',
  'garbanzos': 'Carbohidratos',
  'lentejas': 'Carbohidratos',
  'maíz dulce': 'Carbohidratos',
  'granola': 'Carbohidratos',
  'tortitas de arroz': 'Carbohidratos',

  // Frutas
  'plátano': 'Frutas',
  'plátano congelado': 'Frutas',
  'plátano grande': 'Frutas',
  'plátano maduro': 'Frutas',
  'manzana': 'Frutas',
  'frutos rojos': 'Frutas',
  'frutos rojos congelados': 'Frutas',
  'cherry tomatoes': 'Frutas',
  'tomate cherry': 'Frutas',
  'limón': 'Frutas',

  // Verduras
  'brócoli': 'Verduras y Hortalizas',
  'espinacas': 'Verduras y Hortalizas',
  'espinacas frescas': 'Verduras y Hortalizas',
  'espinacas congeladas': 'Verduras y Hortalizas',
  'espárragos verdes': 'Verduras y Hortalizas',
  'espárragos': 'Verduras y Hortalizas',
  'champiñones': 'Verduras y Hortalizas',
  'pimiento rojo': 'Verduras y Hortalizas',
  'pimiento': 'Verduras y Hortalizas',
  'calabacín': 'Verduras y Hortalizas',
  'berenjena': 'Verduras y Hortalizas',
  'cebolla': 'Verduras y Hortalizas',
  'cebolla roja': 'Verduras y Hortalizas',
  'tomate': 'Verduras y Hortalizas',
  'tomate triturado': 'Verduras y Hortalizas',
  'zanahoria': 'Verduras y Hortalizas',
  'judías verdes': 'Verduras y Hortalizas',
  'guisantes': 'Verduras y Hortalizas',
  'guisantes congelados': 'Verduras y Hortalizas',
  'lechuga': 'Verduras y Hortalizas',
  'lechuga mix': 'Verduras y Hortalizas',
  'rúcula': 'Verduras y Hortalizas',
  'puerro': 'Verduras y Hortalizas',
  'ajo': 'Verduras y Hortalizas',

  // Lácteos
  'leche semidesnatada': 'Lácteos y Huevos',
  'leche': 'Lácteos y Huevos',
  'yogur': 'Lácteos y Huevos',
  'yogur griego': 'Lácteos y Huevos',
  'queso': 'Lácteos y Huevos',
  'queso fresco': 'Lácteos y Huevos',
  'queso fresco batido': 'Lácteos y Huevos',
  'queso fresco light': 'Lácteos y Huevos',
  'requesón': 'Lácteos y Huevos',

  // Grasas
  'aceite de oliva': 'Grasas y Aceites',
  'aceite de oliva virgen extra': 'Grasas y Aceites',
  'aceite de coco': 'Grasas y Aceites',
  'aceite de sésamo': 'Grasas y Aceites',
  'mantequilla de cacahuete': 'Grasas y Aceites',
  'mantequilla de cacahuete natural': 'Grasas y Aceites',
  'aguacate': 'Grasas y Aceites',
  'leche de coco': 'Grasas y Aceites',
  'frutos secos': 'Grasas y Aceites',
  'nueces': 'Grasas y Aceites',
  'almendras': 'Grasas y Aceites',

  // Bebidas vegetales (no lácteos)
  'leche de almendras': 'Otros',
  'leche de avena': 'Otros',
  'leche de soja': 'Otros',
};

// Claves normalizadas y ordenadas de más específica a más genérica, para que
// "leche de coco" gane a "leche" y el match sea por palabra completa
// ("repollo" ya no cae en "pollo").
const CATEGORY_ENTRIES = Object.entries(CATEGORY_MAP)
  .map(([key, cat]) => ({ key: ` ${normalizeText(key)} `, cat }))
  .sort((a, b) => b.key.length - a.key.length);

function categorizeIngredient(name: string): ShoppingCategoryName {
  const normalName = ` ${normalizeText(name)} `;
  for (const { key, cat } of CATEGORY_ENTRIES) {
    if (normalName.includes(key)) return cat;
  }
  return 'Otros';
}

// Sinónimos de unidad → forma canónica, para que "gr"/"gramos" se agregue con "g"
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  l: 'l', litro: 'l', litros: 'l',
  ud: 'unidad', uds: 'unidad', u: 'unidad', unidad: 'unidad', unidades: 'unidad',
  pieza: 'unidad', piezas: 'unidad',
  cda: 'cda', cdas: 'cda', cucharada: 'cda', cucharadas: 'cda',
  cdta: 'cdta', cdtas: 'cdta', cucharadita: 'cdta', cucharaditas: 'cdta',
};

function normalizeUnit(unit: string): string {
  const u = (unit ?? '').toLowerCase().trim().replace(/\.+$/, '');
  return UNIT_ALIASES[u] ?? u;
}

const CATEGORY_ORDER: ShoppingCategoryName[] = [
  'Proteínas',
  'Carbohidratos',
  'Verduras y Hortalizas',
  'Frutas',
  'Lácteos y Huevos',
  'Grasas y Aceites',
  'Otros',
];

export const shoppingListService = {
  generateFromMenu(menu: WeeklyMenu): ShoppingList {
    const aggregated = new Map<string, ShoppingItem>();
    // Clave normalizada: un desajuste de acentos/mayúsculas entre weekMenu y
    // recipes no debe dejar una comida sin ingredientes en la lista.
    const recipeMap = new Map<string, BaseRecipe>(menu.recipes.map(r => [normalizeText(r.name), r]));

    for (const day of menu.days) {
      const mealEntries = [
        { meal: 'desayuno', mealData: day.meals.desayuno },
        { meal: 'pre-entreno', mealData: day.meals.preEntreno },
        { meal: 'comida principal', mealData: day.meals.principal },
        { meal: 'post-entreno', mealData: day.meals.postEntreno },
        { meal: 'cena', mealData: day.meals.cena },
      ];

      for (const { mealData } of mealEntries) {
        if (mealData.isSkipped) continue;
        const recipe = recipeMap.get(normalizeText(mealData.recipeName));
        if (!recipe) {
          console.warn(`[ShoppingList] Receta "${mealData.recipeName}" sin ficha — sus ingredientes no entran en la lista`);
          continue;
        }

        for (const ingredient of recipe.ingredients) {
          this.aggregateIngredient(aggregated, ingredient, mealData.recipeName);
        }
      }
    }

    // Group by category
    const categoryMap = new Map<ShoppingCategoryName, ShoppingItem[]>();
    for (const item of aggregated.values()) {
      const cat = categorizeIngredient(item.name);
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(item);
    }

    const categories: ShoppingCategory[] = CATEGORY_ORDER
      .filter(cat => categoryMap.has(cat))
      .map(cat => ({
        category: cat,
        items: categoryMap.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
      }));

    const plannedMealCount = menu.days.reduce((acc, d) => {
      let n = 0;
      for (const m of [d.meals.desayuno, d.meals.preEntreno, d.meals.principal, d.meals.postEntreno, d.meals.cena]) {
        if (!m.isSkipped) n++;
      }
      return acc + n;
    }, 0);

    return {
      id: `shopping-${menu.id}-${Date.now()}`,
      menuId: menu.id,
      generatedAt: new Date().toISOString(),
      categories,
      notes: `Lista de la compra para ${plannedMealCount} comida(s). Cantidades para 1 persona.`,
    };
  },

  aggregateIngredient(
    map: Map<string, ShoppingItem>,
    ingredient: Ingredient,
    recipeName: string
  ): void {
    // Gemini puede devolver amounts como string o nulos: coercer a número
    // finito para no propagar NaN a la lista.
    const parsed = Number(ingredient.amount);
    let amount = Number.isFinite(parsed) ? parsed : 0;
    let unit = normalizeUnit(ingredient.unit);

    // kg y l se agregan en g/ml para fusionarse con el resto de cantidades
    if (unit === 'kg') { amount *= 1000; unit = 'g'; }
    if (unit === 'l') { amount *= 1000; unit = 'ml'; }

    const key = `${normalizeText(ingredient.name)}_${unit}`;

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.totalAmount += amount;
      if (!existing.mealsContaining.includes(recipeName)) {
        existing.mealsContaining.push(recipeName);
      }
    } else {
      map.set(key, {
        name: ingredient.name,
        totalAmount: amount,
        unit,
        purchased: false,
        mealsContaining: [recipeName],
      });
    }
  },

  /**
   * Traslada el estado "comprado" de una lista anterior a una recién
   * generada (p. ej. al cambiar una sola comida): un ítem sigue comprado si
   * conserva nombre, unidad y cantidad; si la cantidad cambió, se desmarca
   * para que el usuario revise si necesita comprar más.
   */
  mergePurchasedState(newList: ShoppingList, previous: ShoppingList | null): ShoppingList {
    if (!previous) return newList;
    const purchasedAmounts = new Map<string, number>();
    for (const cat of previous.categories) {
      for (const item of cat.items) {
        if (item.purchased) {
          purchasedAmounts.set(`${normalizeText(item.name)}_${item.unit}`, item.totalAmount);
        }
      }
    }
    if (purchasedAmounts.size === 0) return newList;
    return {
      ...newList,
      categories: newList.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item =>
          purchasedAmounts.get(`${normalizeText(item.name)}_${item.unit}`) === item.totalAmount
            ? { ...item, purchased: true }
            : item
        ),
      })),
    };
  },

  /**
   * Marca como "ya en casa" los items de la lista que coinciden con
   * ingredientes de la despensa. Match por palabras completas en cualquier
   * dirección: "arroz" en despensa marca "arroz integral" en la lista, y
   * "pechuga de pollo" en despensa marca "pollo" en la lista. "leche entera"
   * sigue sin marcar "leche de coco" (ninguna contiene todas las palabras de
   * la otra).
   */
  markPantryItems(list: ShoppingList, pantryNames: string[]): ShoppingList {
    if (pantryNames.length === 0) return list;
    const normalizedPantry = pantryNames.map(normalizeText).filter(p => p.length > 0);

    const matches = (itemName: string): boolean => {
      const item = normalizeText(itemName);
      const itemWords = item.split(' ').filter(w => w.length >= 3);
      const itemSet = new Set(itemWords);
      return normalizedPantry.some(pantry => {
        if (item === pantry) return true;
        const pantryWords = pantry.split(' ').filter(w => w.length >= 3);
        if (pantryWords.length === 0 || itemWords.length === 0) return false;
        const pantrySet = new Set(pantryWords);
        return pantryWords.every(pw => itemSet.has(pw)) || itemWords.every(iw => pantrySet.has(iw));
      });
    };

    return {
      ...list,
      categories: list.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item =>
          matches(item.name) ? { ...item, inPantry: true } : item
        ),
      })),
    };
  },

  toggleItem(list: ShoppingList, categoryName: ShoppingCategoryName, itemName: string): ShoppingList {
    return {
      ...list,
      categories: list.categories.map(cat => {
        if (cat.category !== categoryName) return cat;
        return {
          ...cat,
          items: cat.items.map(item => {
            if (item.name !== itemName) return item;
            return { ...item, purchased: !item.purchased };
          }),
        };
      }),
    };
  },

  getTextSummary(list: ShoppingList): string {
    const lines = [`LISTA DE LA COMPRA — BatchFit\n`];
    for (const cat of list.categories) {
      lines.push(`\n📦 ${cat.category.toUpperCase()}`);
      for (const item of cat.items) {
        const check = item.purchased ? '✓' : '□';
        const pantryTag = item.inPantry ? ' (ya en casa)' : '';
        const qty = item.totalAmount > 0 ? `: ${Math.round(item.totalAmount)}${item.unit}` : '';
        lines.push(`${check} ${item.name}${qty}${pantryTag}`);
      }
    }
    return lines.join('\n');
  },

  getCompletionPercentage(list: ShoppingList): number {
    let total = 0;
    let done = 0;
    for (const cat of list.categories) {
      total += cat.items.length;
      done += cat.items.filter(i => i.purchased).length;
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
  },
};
