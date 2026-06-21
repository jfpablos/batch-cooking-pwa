import type {
  WeeklyMenu,
  ShoppingList,
  ShoppingCategory,
  ShoppingCategoryName,
  ShoppingItem,
  Ingredient,
  BaseRecipe,
} from '../types';

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
  'yogur griego': 'Lácteos y Huevos',
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
};

function categorizeIngredient(name: string): ShoppingCategoryName {
  const normalName = name.toLowerCase().trim();

  // Exact match
  if (CATEGORY_MAP[normalName]) return CATEGORY_MAP[normalName];

  // Partial match
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (normalName.includes(key) || key.includes(normalName)) return cat;
  }

  return 'Otros';
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
    const recipeMap = new Map<string, BaseRecipe>(menu.recipes.map(r => [r.name, r]));

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
        const recipe = recipeMap.get(mealData.recipeName);
        if (!recipe) continue;

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
    const key = `${ingredient.name.toLowerCase()}_${ingredient.unit}`;

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.totalAmount += ingredient.amount;
      if (!existing.mealsContaining.includes(recipeName)) {
        existing.mealsContaining.push(recipeName);
      }
    } else {
      map.set(key, {
        name: ingredient.name,
        totalAmount: ingredient.amount,
        unit: ingredient.unit,
        purchased: false,
        mealsContaining: [recipeName],
      });
    }
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
        lines.push(`${check} ${item.name}: ${Math.round(item.totalAmount)}${item.unit}`);
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
