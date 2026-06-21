import type { DayName, MealKey, MealSelection } from '../types';

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

export const generateMenuPrompt = (
  excludeRecipeNames: string[],
  weekNumber: number,
  year: number,
  selection: MealSelection = buildFullSelection()
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
      "tags": ["pollo", "batch-friendly", "alto-proteína"]
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
- "batchCookingGuide" solo describe pasos para las recetas listadas
- "weeklyNutrition" debe ser el promedio de los días con al menos una comida planificada
- No incluir recetas que aparecen en la lista de "RECETAS A EVITAR"
- Los valores nutricionales deben aproximarse a los targets indicados por comida
- Todas las cantidades en gramos exactos
`;
};
