import type { BaseRecipe, MealKey, MealSelection, RecipeCategory, RecipeScheduleEntry, UserProfile, VideoRecipe } from '../types';
import { DAYS, MEAL_KEYS, DEFAULT_PROFILE, scaledMealTargets } from './constants';
import type { MealTarget } from './constants';

// =============================================
// ESTACIONALIDAD
// =============================================

export type Season = 'invierno' | 'primavera' | 'verano' | 'otoño';

export function getCurrentSeason(date: Date = new Date()): Season {
  const m = date.getMonth(); // 0-11, hemisferio norte
  if (m === 11 || m <= 1) return 'invierno';
  if (m <= 4) return 'primavera';
  if (m <= 7) return 'verano';
  return 'otoño';
}

const SEASON_GUIDANCE: Record<Season, string> = {
  invierno:
    'Estamos en INVIERNO: prioriza platos calientes y reconfortantes (guisos, estofados, cremas de verduras, legumbres, horneados). Verduras de temporada en España: col, coliflor, brócoli, calabaza, puerro, espinacas, acelgas; fruta: naranja, mandarina, kiwi, plátano, manzana, pera.',
  primavera:
    'Estamos en PRIMAVERA: combina platos templados con opciones más ligeras (salteados, arroces, primeras ensaladas). Verduras de temporada en España: espárragos, guisantes, habas, alcachofa, espinacas; fruta: fresas, níspero, plátano, manzana.',
  verano:
    'Estamos en VERANO: prioriza platos frescos y ligeros que apetezcan con calor (ensaladas completas, bowls fríos, gazpacho/salmorejo, pescados a la plancha, cremas frías). Evita guisos pesados y horneados largos. Verduras de temporada en España: tomate, pimiento, pepino, calabacín, berenjena, judías verdes; fruta: sandía, melón, melocotón, nectarina, ciruela.',
  otoño:
    'Estamos en OTOÑO: vuelve progresivamente a platos templados y de cuchara (cremas, salteados, legumbres suaves, horneados). Verduras de temporada en España: calabaza, boniato, setas, coles, puerro; fruta: uva, granada, caqui, manzana, pera, plátano.',
};

export const buildSeasonSection = (season: Season = getCurrentSeason()): string => `
ESTACIONALIDAD (OBLIGATORIO):
${SEASON_GUIDANCE[season]}
Adapta el estilo de las recetas y usa ingredientes de temporada siempre que encajen con los macros.
`;

// =============================================
// SYSTEM PROMPT DEL MENÚ (parametrizado por perfil)
// =============================================

const fmtMeal = (label: string, t: MealTarget, note = '') =>
  `${label} ~${t.kcal} kcal | ${t.protein}g prot | ${t.carbs}g carbos | ${t.fat}g grasa${note}`;

export function buildMenuSystemPrompt(profile: UserProfile = DEFAULT_PROFILE): string {
  const t = scaledMealTargets(profile);
  const perKg = (g: number) => (g / profile.weightKg).toFixed(1).replace('.', ',');
  return `Eres un nutricionista deportivo especializado en crossfit y fuerza funcional.
Generas menús semanales de batch cooking para el siguiente perfil:

PERFIL DEL ATLETA:
- ${profile.weightKg.toLocaleString('es-ES')} kg
- Crossfit intenso de lunes a viernes (5 sesiones/semana)
- Objetivo: rendimiento deportivo + recuperación muscular

NECESIDADES NUTRICIONALES DIARIAS (días de entreno L-V):
- Calorías totales: ~${profile.calories.toLocaleString('es-ES')} kcal/día
- Proteína: ${profile.protein} g/día (${perKg(profile.protein)} g/kg)
- Carbohidratos: ${profile.carbs} g/día (${perKg(profile.carbs)} g/kg)
- Grasas: ${profile.fat} g/día (${perKg(profile.fat)} g/kg)

DISTRIBUCIÓN POR COMIDA:
1. ${fmtMeal('Desayuno (07:00):', t.desayuno)}
2. ${fmtMeal('Pre-entreno (11:30):', t.preEntreno, '  ← mínima grasa')}
3. ${fmtMeal('Comida principal (14:00):', t.principal, '  ← mayor ingesta')}
4. ${fmtMeal('Post-entreno (18:00):', t.postEntreno, '  ← ventana anabólica')}
5. ${fmtMeal('Cena (21:00):', t.cena, '  ← ligera, menos carbos')}

REGLAS DE BATCH COOKING (se prepara el domingo para L-V):
- Todas las recetas deben conservarse ≥4 días en frigorífico
- Las recetas deben ser escalables fácilmente a ×5 raciones
- Preferir proteínas que congelan bien (pollo, pavo, ternera, pescado)
- Batidos post-entreno se preparan frescos (no batch), incluir ingredientes en lista
- Variar fuentes de proteína a lo largo de la semana
- NO repetir la misma fuente de proteína en 2 comidas del mismo día

VARIEDAD SEMANAL (OBLIGATORIO):
- En comida principal y cena: una misma receta puede aparecer como MÁXIMO en 2 días de la semana,
  y debe haber al menos 3 recetas diferentes entre los 5 días
- NUNCA el mismo plato principal todos los días — eso arruina la semana
- Si repites la base proteica de un plato en 2 días, cambia la guarnición y usa un nombre distinto
  (ej: "Ternera guisada con arroz integral" el lunes y "Ternera guisada con puré de boniato" el jueves);
  en el batch se cocina la base una sola vez y se reparten guarniciones distintas
- En desayuno, pre-entreno y post-entreno la repetición es aceptable (son tomas funcionales),
  pero intenta ofrecer 2-3 opciones distintas en la semana

REGLAS CULINARIAS:
- Solo ingredientes disponibles en supermercados españoles
- Tiempos de elaboración ≤45 min por receta
- Las recetas deben ser sabrosas y variadas, no solo funcionales
- Incluir especias, hierbas y condimentos para sabor
- Las cenas pueden incluir huevos, pescado, pavo o legumbres como proteína
- Usar gramos exactos para todos los ingredientes (no "1 pechuga" sino "250g pechuga de pollo")

FORMATO DE RESPUESTA: JSON válido con estructura exacta definida en el prompt.
NO añadir texto fuera del JSON. NO usar markdown. Responde SOLO con el JSON.`;
}

export function buildFullSelection(): MealSelection {
  return DAYS.reduce((acc, day) => {
    acc[day] = MEAL_KEYS.reduce((m, key) => {
      m[key] = true;
      return m;
    }, {} as Record<MealKey, boolean>);
    return acc;
  }, {} as MealSelection);
}

export function countSelected(selection: MealSelection): number {
  let n = 0;
  for (const day of DAYS) {
    for (const key of MEAL_KEYS) {
      if (selection[day]?.[key]) n++;
    }
  }
  return n;
}

function buildWeekMenuSchema(selection: MealSelection): string {
  const lines: string[] = [];
  for (const day of DAYS) {
    const selectedKeys = MEAL_KEYS.filter(k => selection[day]?.[k]);
    if (selectedKeys.length === 0) continue;
    const inner = selectedKeys.map(k => `"${k}": "..."`).join(', ');
    lines.push(`    "${day}": { ${inner} }`);
  }
  return `{\n${lines.join(',\n')}\n  }`;
}

export interface MenuPromptOptions {
  pantryItems?: string[];
  inspirationVideos?: { title: string; description?: string }[];
  videoRecipes?: VideoRecipe[];
  favoriteRecipes?: string[];
  season?: Season;
}

const buildFavoritesSection = (favorites: string[]): string => {
  if (favorites.length === 0) return '';
  return `
RECETAS FAVORITAS DEL USUARIO (le gustan especialmente):
${favorites.map(f => `- ${f}`).join('\n')}
Puedes incluir 1-2 si no están en la lista de recetas a evitar, o crear variaciones
en su misma línea de sabor. No es obligatorio usarlas.
`;
};

const buildPantrySection = (pantryItems: string[]): string => {
  if (pantryItems.length === 0) return '';
  return `
INGREDIENTES YA DISPONIBLES EN CASA (el usuario quiere aprovecharlos esta semana):
${pantryItems.map(p => `- ${p}`).join('\n')}
Incorpora estos ingredientes en las recetas cuando encajen con los macros y el estilo batch cooking.
No es obligatorio usarlos todos, pero prioriza recetas que los aprovechen.
Inclúyelos igualmente en los "ingredients" de cada receta con su cantidad exacta.
`;
};

const buildVideoRecipesSection = (videoRecipes: VideoRecipe[]): string => {
  if (videoRecipes.length === 0) return '';
  const lines = videoRecipes.map((r, i) => {
    const ingredients = r.mainIngredients?.length ? ` · ingredientes: ${r.mainIngredients.join(', ')}` : '';
    return `${i + 1}. "${r.name}"${r.type === 'rapida' ? ' (rápida)' : ''}${ingredients} — del vídeo "${r.videoTitle}" [videoId: ${r.videoId}]`;
  });
  return `
RECETAS DE LOS VÍDEOS DEL USUARIO (extraídas de su playlist de batch cooking en YouTube):
${lines.join('\n')}
Incluye 1-3 de estas recetas en el menú cuando encajen con los targets de macros y las reglas
de batch cooking (adapta ingredientes a gramos exactos para cumplir los macros).
El resto de recetas deben ser creación tuya — NO uses solo recetas de esta lista.
En cada receta del menú basada en una de estas, mantén un nombre similar y añade el campo
"sourceVideoId" con el videoId indicado entre corchetes.
`;
};

const buildInspirationSection = (videos: { title: string; description?: string }[]): string => {
  if (videos.length === 0) return '';
  const lines = videos.map((v, i) => {
    const desc = v.description?.trim();
    return `${i + 1}. "${v.title}"${desc ? ` — ${desc}` : ''}`;
  });
  return `
RECETAS DE INSPIRACIÓN (playlist de batch cooking del usuario en YouTube):
${lines.join('\n')}
Puedes basar 1-3 recetas del menú en estos vídeos cuando encajen con los targets de macros
y las reglas de batch cooking (adapta cantidades a gramos exactos para cumplir los macros).
El resto de recetas deben ser creación tuya — NO uses solo recetas de la lista.
Si adaptas un vídeo, usa un nombre de receta similar al título del vídeo.
`;
};

export const generateMenuPrompt = (
  excludeRecipeNames: string[],
  weekNumber: number,
  year: number,
  selection: MealSelection = buildFullSelection(),
  opts: MenuPromptOptions = {}
): string => {
  const totalMeals = countSelected(selection);
  const weekMenuSchema = buildWeekMenuSchema(selection);
  const selectedDays = DAYS.filter(d => MEAL_KEYS.some(k => selection[d]?.[k]));

  return `
Genera el menú de batch cooking para la semana ${weekNumber} de ${year}.

ALCANCE DE ESTA GENERACIÓN: el usuario solo necesita ${totalMeals} comida(s), distribuidas en ${selectedDays.length} día(s) (${selectedDays.join(', ')}).
Genera ÚNICAMENTE las recetas para las claves día/comida que aparecen en el esquema "weekMenu" de abajo.
NO inventes recetas para días o comidas no listados — el usuario comerá fuera o no necesita esa toma.
El array "recipes" debe contener SOLO las recetas referenciadas en "weekMenu" (ni más, ni menos).

RECETAS A EVITAR ESTA SEMANA (usadas en las últimas 4 semanas o vetadas por el usuario):
${excludeRecipeNames.length > 0
  ? excludeRecipeNames.map(r => `- ${r}`).join('\n')
  : '- (ninguna restricción esta semana — primera generación)'}
${buildSeasonSection(opts.season)}${buildFavoritesSection(opts.favoriteRecipes ?? [])}${buildPantrySection(opts.pantryItems ?? [])}${
  // El catálogo de recetas por vídeo es más preciso; los títulos solo son el fallback
  opts.videoRecipes?.length
    ? buildVideoRecipesSection(opts.videoRecipes)
    : buildInspirationSection(opts.inspirationVideos ?? [])
}
ESTRUCTURA REQUERIDA DEL JSON (responde EXACTAMENTE con este formato):
{
  "weekMenu": ${weekMenuSchema},
  "recipes": [
    {
      "name": "Nombre exacto (debe coincidir con los usados en weekMenu)",
      "category": "desayuno|pre-entreno|principal|post-entreno|cena",
      "prepTime": 10,
      "cookTime": 20,
      "servings": 1,
      "ingredients": [
        { "name": "pechuga de pollo", "amount": 250, "unit": "g" },
        { "name": "arroz integral", "amount": 150, "unit": "g" }
      ],
      "steps": ["Paso 1: ...", "Paso 2: ..."],
      "nutrition": {
        "calories": 935,
        "protein": 50,
        "carbs": 123,
        "fat": 27,
        "fiber": 8
      },
      "storage": {
        "days": 5,
        "instructions": "Guardar en tupper hermético en nevera",
        "freezable": true
      },
      "batchNotes": "Para preparar ×5: duplicar todos los ingredientes por 5...",
      "tags": ["pollo", "batch-friendly", "alto-proteína"],
      "prepStyle": "batch",
      "sourceVideoId": null
    }
  ],
  "batchCookingGuide": {
    "estimatedTotalTime": 120,
    "tasks": [
      {
        "order": 1,
        "title": "Título de la tarea",
        "description": "Descripción detallada de qué hacer",
        "duration": 30,
        "parallelWith": null,
        "storageResult": "Cómo guardar el resultado de esta tarea"
      }
    ]
  },
  "weeklyNutrition": {
    "avgDailyCalories": 3290,
    "avgDailyProtein": 165,
    "avgDailyCarbs": 454,
    "avgDailyFat": 91,
    "notes": "Observaciones nutricionales de esta semana"
  }
}

IMPORTANTE:
- Cada nombre en weekMenu debe coincidir EXACTAMENTE con el campo "name" de una receta en el array "recipes"
- El array "recipes" SOLO contiene las recetas de las celdas seleccionadas (${totalMeals} celdas) — no añadas extras
- "prepStyle": usa "al-momento" para recetas rápidas que se hacen frescas cada día en ≤15 min
  (batidos, gachas de avena, yogur con fruta, tostadas...) — no tiene sentido prepararlas el domingo.
  Usa "batch" para todo lo que sí se cocina el domingo para la semana.
- "batchCookingGuide" solo describe pasos para las recetas con "prepStyle": "batch" — NO incluyas
  tareas para las recetas "al-momento"
- "sourceVideoId": solo si la receta está basada en una de las RECETAS DE LOS VÍDEOS DEL USUARIO
  (usa el videoId indicado); en caso contrario usa null
- VARIEDAD: en "principal" y "cena" ninguna receta puede aparecer en más de 2 días, y debe haber
  al menos 3 recetas distintas en cada una de esas comidas a lo largo de la semana. Si repites una
  base 2 días, cambia la guarnición y el nombre de la receta
- "weeklyNutrition" debe ser el promedio de los días con al menos una comida planificada
- No incluir recetas que aparecen en la lista de "RECETAS A EVITAR"
- Los valores nutricionales deben aproximarse a los targets indicados por comida
- Todas las cantidades en gramos exactos
`;
};

// =============================================
// SWAP DE UNA SOLA COMIDA
// =============================================

export const GEMINI_SINGLE_MEAL_SYSTEM_PROMPT = `Eres un nutricionista deportivo especializado en crossfit.
Generas UNA sola receta de batch cooking que sustituye a otra en un menú semanal ya creado.
FORMATO DE RESPUESTA: JSON válido con la estructura exacta del prompt. Sin markdown ni texto extra.`;

export function generateSingleMealPrompt(params: {
  category: RecipeCategory;
  targets: MealTarget;
  excludeNames: string[];
  replacedName: string;
  pantryItems?: string[];
  season?: Season;
}): string {
  const { category, targets, excludeNames, replacedName, pantryItems = [], season } = params;
  return `
Genera UNA receta nueva de tipo "${category}" para sustituir a "${replacedName}" en el menú de esta semana.

TARGETS NUTRICIONALES DE ESTA COMIDA (aproxímate lo máximo posible):
~${targets.kcal} kcal | ${targets.protein} g proteína | ${targets.carbs} g carbohidratos | ${targets.fat} g grasa
${buildSeasonSection(season)}
RECETAS A EVITAR (ya usadas, vetadas o presentes en el menú actual):
${excludeNames.length > 0 ? excludeNames.map(r => `- ${r}`).join('\n') : '- (ninguna)'}
${pantryItems.length > 0 ? `\nINGREDIENTES YA EN CASA que puedes aprovechar: ${pantryItems.join(', ')}\n` : ''}
REGLAS:
- Apta para batch cooking (se cocina el domingo y se conserva ≥4 días en nevera), salvo que sea
  una toma funcional rápida (batido, gachas...) — en ese caso usa "prepStyle": "al-momento"
- Solo ingredientes de supermercados españoles, cantidades en gramos exactos
- Tiempo total ≤45 min

ESTRUCTURA REQUERIDA DEL JSON (responde EXACTAMENTE con este formato — un solo objeto, sin array):
{
  "name": "Nombre de la receta",
  "category": "${category}",
  "prepTime": 10,
  "cookTime": 20,
  "servings": 1,
  "ingredients": [ { "name": "pechuga de pollo", "amount": 250, "unit": "g" } ],
  "steps": ["Paso 1: ...", "Paso 2: ..."],
  "nutrition": { "calories": ${targets.kcal}, "protein": ${targets.protein}, "carbs": ${targets.carbs}, "fat": ${targets.fat}, "fiber": 6 },
  "storage": { "days": 4, "instructions": "Tupper hermético en nevera", "freezable": true },
  "batchNotes": "Notas para escalar la preparación",
  "tags": ["..."],
  "prepStyle": "batch",
  "sourceVideoId": null
}
`;
}

// =============================================
// SEGUNDA LLAMADA: GUÍA BATCH DETALLADA + CONSERVACIÓN
// =============================================

export const GEMINI_GUIDE_SYSTEM_PROMPT = `Eres un chef profesional especializado en batch cooking y conservación de alimentos.
Recibirás las recetas de una semana y qué días/comidas se consumirá cada una.
Tu trabajo tiene dos partes:
1. Una guía de cocinado del domingo ULTRA-DETALLADA, a prueba de principiantes absolutos:
   cualquier persona sin experiencia debe poder acabar con todas las recetas hechas.
2. Un plan de conservación para que cada plato llegue en perfecto estado a su día de consumo,
   teniendo en cuenta la perecibilidad de cada alimento.

FORMATO DE RESPUESTA: JSON válido con la estructura exacta definida en el prompt.
NO añadir texto fuera del JSON. NO usar markdown. Responde SOLO con el JSON.`;

const MEAL_LABELS: Record<MealKey, string> = {
  desayuno: 'desayuno',
  preEntreno: 'pre-entreno',
  principal: 'comida principal',
  postEntreno: 'post-entreno',
  cena: 'cena',
};

export const generateBatchGuidePrompt = (
  recipes: BaseRecipe[],
  schedule: RecipeScheduleEntry[]
): string => {
  // Recetas compactas con su calendario de consumo
  const recipeBlocks = schedule.map(entry => {
    const recipe = recipes.find(r => r.name === entry.recipeName);
    const servings = entry.occurrences.length;
    const when = entry.occurrences
      .map(o => `${o.day} ${MEAL_LABELS[o.meal]}`)
      .join(', ');
    if (!recipe) {
      return `### ${entry.recipeName} (se come: ${when} → preparar ×${servings})`;
    }
    const ingredients = recipe.ingredients
      .map(i => `${i.amount}${i.unit} ${i.name}`)
      .join(', ');
    const steps = recipe.steps.map((s, i) => `${i + 1}) ${s}`).join(' ');
    return `### ${recipe.name} (se come: ${when} → preparar ×${servings})
Ingredientes (por ración): ${ingredients}
Pasos originales: ${steps}
Conservación indicada: ${recipe.storage.days} días nevera, congelable: ${recipe.storage.freezable ? 'sí' : 'no'}`;
  });

  // Calendario por día
  const calendarLines = DAYS.map(day => {
    const meals = schedule
      .flatMap(s => s.occurrences
        .filter(o => o.day === day)
        .map(o => `${s.recipeName} (${MEAL_LABELS[o.meal]})`));
    return meals.length > 0 ? `- ${day}: ${meals.join(', ')}` : null;
  }).filter(Boolean);

  return `
Genera la guía de batch cooking del domingo para estas recetas.

RECETAS (con raciones totales de la semana):
${recipeBlocks.join('\n\n')}

CALENDARIO DE CONSUMO (el batch cooking se hace el DOMINGO anterior):
${calendarLines.join('\n')}

INSTRUCCIONES PARA LA GUÍA DE COCINADO ("tasks"):
- Máximo 15 tareas, ordenadas para minimizar el tiempo total (usa "parallelWith" para tareas simultáneas)
- Cada tarea debe ser INFALIBLE: incluye en "steps" sub-pasos numerados con cantidades exactas,
  temperaturas (°C), intensidad del fuego (bajo/medio/alto), tiempos por sub-paso y señales visuales
  ("hasta que el borde esté dorado", "cuando el agua rompa a hervir")
- Máximo 6 sub-pasos por tarea, cada uno de 1-2 frases
- "seasoning": especias y condimentos EXACTOS de la tarea (ej: "5 g sal, 1 cdta pimentón dulce, 2 dientes de ajo picados")
- "equipment": utensilios y preparación previa (ej: "olla grande 5L + horno precalentado a 200 °C")
- "recipeNames": recetas a las que pertenece la tarea
- Agrupa por técnica (todo el horno junto, todas las cocciones de cereal juntas), no por receta
- Las cantidades de "steps" y "seasoning" son para el TOTAL de raciones de la semana (multiplica por las raciones indicadas)

INSTRUCCIONES PARA EL PLAN DE CONSERVACIÓN ("conservationPlan") — una entrada POR RECETA:
- Decide nevera vs congelador según los días de consumo reales del calendario de arriba:
  si una ración se come más de 3-4 días después del domingo y la receta es congelable,
  usa "method": "mixto" o "congelador" y detalla qué raciones congelar
- "portions": reparto de raciones (ej: "3 raciones nevera + 2 congelador")
- "container": envase recomendado (ej: "5 tuppers herméticos individuales")
- "freezeInstructions": qué congelar y cómo (ej: "Congela 2 raciones en tuppers aptos, sin la salsa")
- "thawInstructions": cuándo bajar a nevera con día concreto (ej: "Baja las raciones de jueves y
  viernes a la nevera el miércoles por la noche")
- "reheatInstructions": método, potencia/temperatura y tiempo, y trucos (añadir un chorrito de agua al arroz)
- "targetDays": días de la semana en que se come esa receta
- Sé concreto y breve: máximo 3 frases por campo

ESTRUCTURA REQUERIDA DEL JSON (responde EXACTAMENTE con este formato):
{
  "estimatedTotalTime": 150,
  "tasks": [
    {
      "order": 1,
      "title": "Título corto de la tarea",
      "description": "Resumen en 1 frase",
      "duration": 20,
      "parallelWith": null,
      "storageResult": "Cómo guardar el resultado de esta tarea",
      "recipeNames": ["Nombre de receta"],
      "equipment": "Utensilios y preparación previa",
      "seasoning": "Condimentación exacta",
      "steps": ["1. Sub-paso detallado...", "2. Sub-paso detallado..."]
    }
  ],
  "conservationPlan": [
    {
      "recipeName": "nombre EXACTO de la receta",
      "method": "nevera",
      "container": "...",
      "portions": "...",
      "fridgeDays": 4,
      "freezeInstructions": "...",
      "thawInstructions": "...",
      "reheatInstructions": "...",
      "targetDays": ["lunes", "jueves"]
    }
  ]
}

IMPORTANTE:
- "method" solo puede ser "nevera", "congelador" o "mixto"
- "recipeName" y "recipeNames" deben coincidir EXACTAMENTE con los nombres de receta dados arriba
- "estimatedTotalTime" y cada "duration" en minutos
- Todo el texto en español
`;
};

// =============================================
// ANÁLISIS DEL CONTENIDO DE UN VÍDEO (catálogo de recetas)
// =============================================

export const GEMINI_VIDEO_ANALYSIS_SYSTEM_PROMPT = `Eres un asistente que cataloga recetas de vídeos de cocina de YouTube.
Recibirás UN vídeo. Analiza su contenido completo (lo que se dice y lo que se ve) y extrae
TODAS las recetas que se elaboran en él. Muchos vídeos son recopilatorios con varias recetas.
FORMATO DE RESPUESTA: JSON válido según el esquema del prompt. Sin markdown ni texto extra.`;

export const generateVideoAnalysisPrompt = (videoTitle: string): string => `
Analiza este vídeo de cocina titulado "${videoTitle}" y extrae todas las recetas que se elaboran en él.

INSTRUCCIONES:
- Extrae TODAS las recetas que se cocinan en el vídeo, en orden de aparición
- Nombra cada receta de forma clara y completa en español (ej: "Pollo al curry con arroz basmati",
  no "receta 2" ni "primera elaboración")
- "type": "batch" si la receta es apta para prepararse el domingo y conservarse varios días,
  "rapida" si es una receta exprés que se hace al momento
- "mainIngredients": los 3-6 ingredientes principales tal y como se usan en el vídeo
- NO inventes recetas que no aparezcan en el vídeo

ESTRUCTURA REQUERIDA DEL JSON (responde EXACTAMENTE con este formato):
{
  "recipes": [
    {
      "name": "Nombre claro de la receta",
      "type": "batch",
      "mainIngredients": ["pechuga de pollo", "arroz basmati", "leche de coco"]
    }
  ]
}
`;
