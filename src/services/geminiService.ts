import {
  buildMenuSystemPrompt,
  GEMINI_GUIDE_SYSTEM_PROMPT,
  GEMINI_SINGLE_MEAL_SYSTEM_PROMPT,
  GEMINI_VIDEO_ANALYSIS_SYSTEM_PROMPT,
  generateMenuPrompt,
  generateBatchGuidePrompt,
  generateSingleMealPrompt,
  generateVideoAnalysisPrompt,
  buildFullSelection,
} from '../utils/prompts';
import type { MenuPromptOptions, Season } from '../utils/prompts';
import type { MealTarget } from '../utils/constants';
import {
  validateMenuResponse,
  sanitizeMenuResponse,
  validateGuideResponse,
  sanitizeGuideResponse,
} from '../utils/validators';
import type {
  BaseRecipe,
  GeminiRecipe,
  GeneratedGuideResponse,
  GeneratedMenuResponse,
  MealSelection,
  RecipeCategory,
  RecipeScheduleEntry,
  UserProfile,
  VideoRecipe,
  YouTubeVideo,
} from '../types';
import { isSupabaseConfigured, invokeFunction, functionErrorMessage } from '../lib/supabase';

const MODEL = 'gemini-2.5-flash';

// Cuerpo de la petición REST de Gemini (generateContent). La API key nunca
// llega al cliente: la Edge Function gemini-proxy la añade en el servidor.
interface GeminiPart {
  text?: string;
  fileData?: { fileUri: string; mimeType: string };
}

interface GeminiRequestBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: 'user'; parts: GeminiPart[] }[];
  generationConfig: {
    responseMimeType: string;
    temperature: number;
    maxOutputTokens: number;
    // Sin "thinking": respuestas rápidas y sin truncar el JSON por presupuesto.
    thinkingConfig: { thinkingBudget: number };
    mediaResolution?: string;
  };
}

interface GeminiRestResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

async function callGemini(body: GeminiRequestBody, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await invokeFunction('gemini-proxy', {
      json: { model: MODEL, body },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await functionErrorMessage(res));
    }
    const data = (await res.json()) as GeminiRestResponse;
    if (data.error?.message) throw new Error(`Gemini: ${data.error.message}`);
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('');
    if (!text) throw new Error('Gemini devolvió una respuesta vacía');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export class GeminiService {
  /**
   * La IA está disponible cuando hay backend Supabase (las keys viven en el
   * servidor). AuthGate garantiza que hay sesión antes de renderizar la app.
   */
  isConfigured(): boolean {
    return isSupabaseConfigured;
  }

  async generateWeeklyMenu(
    excludeRecipeNames: string[],
    weekNumber: number,
    year: number,
    selection: MealSelection = buildFullSelection(),
    opts: MenuPromptOptions = {},
    profile?: UserProfile
  ): Promise<GeneratedMenuResponse> {
    const prompt = generateMenuPrompt(excludeRecipeNames, weekNumber, year, selection, opts);
    const systemPrompt = buildMenuSystemPrompt(profile);

    let lastError: Error | null = null;
    let previousErrors: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // En los reintentos, adjunta los errores del intento anterior para que
        // Gemini los corrija (p. ej. falta de variedad en principal/cena).
        const fullPrompt = previousErrors.length === 0
          ? prompt
          : `${prompt}\n\nATENCIÓN: tu respuesta anterior fue RECHAZADA por estos motivos. Corrígelos todos:\n${previousErrors.map(e => `- ${e}`).join('\n')}`;

        const text = await callGemini({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }, 90000); // aborta una petición colgada → fallback a recetas base

        let parsed: GeneratedMenuResponse;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Gemini no devolvió JSON válido');
        }

        const { valid, errors } = validateMenuResponse(parsed, selection);
        if (!valid) {
          console.warn('[Gemini] Respuesta con errores de validación:', errors);
          previousErrors = errors;
          if (attempt === 3) {
            // En el tercer intento, usar lo que tenemos aunque no sea perfecto
            return sanitizeMenuResponse(parsed, selection);
          }
          continue;
        }

        return sanitizeMenuResponse(parsed, selection);
      } catch (error) {
        lastError = error as Error;
        console.error(`[Gemini] Intento ${attempt} fallido:`, error);

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError ?? new Error('Error desconocido al generar el menú con Gemini');
  }

  /**
   * Segunda llamada: guía batch ultra-detallada + plan de conservación.
   * El menú ya existe cuando se llama, así que solo 2 intentos y en caso de
   * fallo el llamante usa la guía básica de la primera llamada.
   */
  async generateBatchGuide(
    recipes: BaseRecipe[],
    schedule: RecipeScheduleEntry[]
  ): Promise<GeneratedGuideResponse> {
    const prompt = generateBatchGuidePrompt(recipes, schedule);
    const recipeNames = schedule.map(s => s.recipeName);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await callGemini({
          systemInstruction: { parts: [{ text: GEMINI_GUIDE_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.5,
            // Los sub-pasos detallados de hasta 25 recetas necesitan más espacio
            // que la llamada del menú (16384) para no truncar el JSON.
            maxOutputTokens: 24576,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }, 90000);

        let parsed: GeneratedGuideResponse;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Gemini no devolvió JSON válido para la guía');
        }

        const { valid, errors } = validateGuideResponse(parsed);
        if (!valid) {
          console.warn('[Gemini] Guía con errores de validación:', errors);
          if (attempt === 2) {
            return sanitizeGuideResponse(parsed, recipeNames);
          }
          continue;
        }

        return sanitizeGuideResponse(parsed, recipeNames);
      } catch (error) {
        lastError = error as Error;
        console.error(`[Gemini] Guía — intento ${attempt} fallido:`, error);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError ?? new Error('Error desconocido al generar la guía batch');
  }

  /**
   * Genera UNA receta nueva para sustituir una comida concreta del menú
   * (swap). 2 intentos; en caso de fallo el llamante recurre al banco base.
   */
  async generateSingleMeal(params: {
    category: RecipeCategory;
    targets: MealTarget;
    excludeNames: string[];
    replacedName: string;
    pantryItems?: string[];
    season?: Season;
  }): Promise<GeminiRecipe> {
    const prompt = generateSingleMealPrompt(params);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await callGemini({
          systemInstruction: { parts: [{ text: GEMINI_SINGLE_MEAL_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }, 60000);

        const parsed = JSON.parse(text) as GeminiRecipe;
        if (!parsed?.name || !Array.isArray(parsed.ingredients) || !parsed.nutrition) {
          throw new Error('Receta de sustitución incompleta');
        }
        const badAmount = parsed.ingredients.some(
          i => typeof i.amount !== 'number' || !Number.isFinite(i.amount) || !i.name
        );
        if (badAmount) throw new Error('Receta de sustitución con ingredientes inválidos');
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Gemini] Swap — intento ${attempt} fallido:`, error);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw lastError ?? new Error('No se pudo generar la receta de sustitución');
  }

  /**
   * Analiza el CONTENIDO de un vídeo de YouTube (audio + imagen, vía URL) y
   * extrae las recetas que se elaboran en él. Las descripciones no bastan:
   * en los recopilatorios las recetas solo están dentro del vídeo.
   * Puede tardar 30-90s por vídeo; el llamante gestiona el progreso.
   */
  async extractRecipesFromVideo(video: YouTubeVideo): Promise<VideoRecipe[]> {
    const text = await callGemini({
      systemInstruction: { parts: [{ text: GEMINI_VIDEO_ANALYSIS_SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${video.id}`,
              mimeType: 'video/*',
            },
          },
          { text: generateVideoAnalysisPrompt(video.title) },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
        // Resolución baja: suficiente para identificar recetas y reduce
        // mucho los tokens de vídeo consumidos.
        mediaResolution: 'MEDIA_RESOLUTION_LOW',
      },
    }, 240000);

    const parsed = JSON.parse(text) as {
      recipes?: { name?: string; type?: string; mainIngredients?: string[] }[];
    };

    if (!Array.isArray(parsed.recipes)) {
      throw new Error(`Análisis del vídeo "${video.title}" con formato inesperado`);
    }

    return parsed.recipes
      .filter(r => r.name && typeof r.name === 'string')
      .map(r => ({
        name: r.name!,
        videoId: video.id,
        videoTitle: video.title,
        type: r.type === 'rapida' ? 'rapida' : 'batch',
        mainIngredients: Array.isArray(r.mainIngredients)
          ? r.mainIngredients.filter((i): i is string => typeof i === 'string').slice(0, 6)
          : undefined,
      }));
  }
}

export const geminiService = new GeminiService();
