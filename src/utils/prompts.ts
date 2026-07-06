import type { BaseRecipe, DayName, MealKey, MealSelection, RecipeScheduleEntry } from '../types';

export const GEMINI_SYSTEM_PROMPT = `Eres un nutricionista deportivo especializado en crossfit y fuerza funcional.
Generas menús semanales de batch cooking para el siguiente perfil:

PERFIL DEL ATLETA:
- Hombre, 39 años, 82,5 kg
- Crossfit intenso de lunes a viernes (5 sesiones/semana)
- Objetivo: rendimiento deportivo + recuperación muscular

NECESIDADES NUTRICIONALES DIARIAS (días de entreno L-V):
- Calorías totales: ~3.290 kcal/día
- Proteína: 165 g/día (2,0 g/kg) — 20% de las calorías
- Carbohidratos: 454 g/día (5,5 g/kg) — 55% de las calorías
- Grasas: 91 g/día (1,1 g/kg) — 25% de las calorías

DISTRIBUCIÓN POR COMIDA:
1. Desayuno (07:00):         ~680 kcal | 25g prot | 100g carbos | 20g grasa
2. Pre-entreno (11:30):      ~518 kcal | 16g prot | 100g carbos |  6g grasa  ← mínima grasa
3. Comida principal (14:00): ~935 kcal | 50g prot | 123g carbos | 27g grasa  ← mayor ingesta
4. Post-entreno (18:00):     ~573 kcal | 41g prot |  82g carbos |  9g grasa  ← ventana anabólica
5. Cena (21:00):             ~584 kcal | 33g prot |  50g carbos | 28g grasa  ← ligera, menos carbos

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

const DAYS: DayName[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const MEAL_KEYS: MealKey[] = ['desayuno', 'preEntreno', 'principal', 'postEntreno', 'cena'];

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
}

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

RECETAS A EVITAR ESTA SEMANA (usadas en las últimas 4 semanas):
${excludeRecipeNames.length > 0
  ? excludeRecipeNames.map(r => `- ${r}`).join('\n')
  : '- (ninguna restricción esta semana — primera generación)'}
${buildPantrySection(opts.pantryItems ?? [])}${buildInspirationSection(opts.inspirationVideos ?? [])}
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
      "prepStyle": "batch"
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
