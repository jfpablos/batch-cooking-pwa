import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerationConfig } from '@google/generative-ai';
import {
  GEMINI_SYSTEM_PROMPT,
  GEMINI_GUIDE_SYSTEM_PROMPT,
  generateMenuPrompt,
  generateBatchGuidePrompt,
  buildFullSelection,
} from '../utils/prompts';
import type { MenuPromptOptions } from '../utils/prompts';
import {
  validateMenuResponse,
  sanitizeMenuResponse,
  validateGuideResponse,
  sanitizeGuideResponse,
} from '../utils/validators';
import type {
  BaseRecipe,
  GeneratedGuideResponse,
  GeneratedMenuResponse,
  MealSelection,
  RecipeScheduleEntry,
} from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// El SDK aún no tipa thinkingConfig, pero la API lo acepta.
type ThinkingGenerationConfig = GenerationConfig & {
  thinkingConfig?: { thinkingBudget: number };
};

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  private getGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!API_KEY || API_KEY === 'AIzaSy-tu-key-aqui') {
        throw new Error('VITE_GEMINI_API_KEY no configurada. Por favor, añade tu API key en .env.local');
      }
      this.genAI = new GoogleGenerativeAI(API_KEY);
    }
    return this.genAI;
  }

  isConfigured(): boolean {
    return !!(API_KEY && API_KEY !== 'AIzaSy-tu-key-aqui');
  }

  async generateWeeklyMenu(
    excludeRecipeNames: string[],
    weekNumber: number,
    year: number,
    selection: MealSelection = buildFullSelection(),
    opts: MenuPromptOptions = {}
  ): Promise<GeneratedMenuResponse> {
    const genAI = this.getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 16384,
        // Disable "thinking": keeps responses fast (~30-40s) and stops the
        // thinking budget from truncating the menu JSON (MAX_TOKENS). The
        // prompt is already highly prescriptive, so reasoning adds little.
        thinkingConfig: { thinkingBudget: 0 },
      } as ThinkingGenerationConfig,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
    }, { timeout: 90000 }); // abort a stuck request → falls back to base recipes

    const prompt = generateMenuPrompt(excludeRecipeNames, weekNumber, year, selection, opts);

    let lastError: Error | null = null;
    let previousErrors: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // En los reintentos, adjunta los errores del intento anterior para que
        // Gemini los corrija (p. ej. falta de variedad en principal/cena).
        const fullPrompt = previousErrors.length === 0
          ? prompt
          : `${prompt}\n\nATENCIÓN: tu respuesta anterior fue RECHAZADA por estos motivos. Corrígelos todos:\n${previousErrors.map(e => `- ${e}`).join('\n')}`;

        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

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
    const genAI = this.getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.5,
        // Los sub-pasos detallados de hasta 25 recetas necesitan más espacio
        // que la llamada del menú (16384) para no truncar el JSON.
        maxOutputTokens: 24576,
        thinkingConfig: { thinkingBudget: 0 },
      } as ThinkingGenerationConfig,
      systemInstruction: GEMINI_GUIDE_SYSTEM_PROMPT,
    }, { timeout: 90000 });

    const prompt = generateBatchGuidePrompt(recipes, schedule);
    const recipeNames = schedule.map(s => s.recipeName);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

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
}

export const geminiService = new GeminiService();
