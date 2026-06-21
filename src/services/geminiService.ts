import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_SYSTEM_PROMPT, generateMenuPrompt, buildFullSelection } from '../utils/prompts';
import { validateMenuResponse, sanitizeMenuResponse } from '../utils/validators';
import type { GeneratedMenuResponse, MealSelection } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

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
    selection: MealSelection = buildFullSelection()
  ): Promise<GeneratedMenuResponse> {
    const genAI = this.getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      systemInstruction: GEMINI_SYSTEM_PROMPT,
    });

    const prompt = generateMenuPrompt(excludeRecipeNames, weekNumber, year, selection);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
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
}

export const geminiService = new GeminiService();
