import type { VideoRecipe, VideoRecipeCatalog, YouTubeVideo } from '../types';
import { geminiService } from './geminiService';
import { youtubeService } from './youtubeService';
import { storageService } from './storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';

export interface AnalyzeProgress {
  done: number;
  total: number;
  currentTitle: string;
}

function loadCatalog(): VideoRecipeCatalog {
  const cached = storageService.get<VideoRecipeCatalog>(STORAGE_KEYS.VIDEO_RECIPES);
  if (cached && Array.isArray(cached.entries) && Array.isArray(cached.analyzedIds)) {
    return cached;
  }
  return { entries: [], analyzedIds: [], builtAt: Date.now() };
}

function saveCatalog(catalog: VideoRecipeCatalog): void {
  storageService.set(STORAGE_KEYS.VIDEO_RECIPES, catalog);
}

/**
 * Catálogo de recetas por vídeo. Cada vídeo se analiza UNA vez con Gemini
 * (contenido completo del vídeo vía URL, no solo la descripción) y el
 * resultado se acumula en localStorage. El análisis es incremental y bajo
 * demanda (botón en la pestaña Vídeos) porque tarda ~1 min por vídeo.
 */
export const videoRecipeService = {
  /** Lectura síncrona del catálogo acumulado. */
  getCachedCatalog(): VideoRecipe[] {
    return loadCatalog().entries;
  },

  /** Vídeos de la lista que aún no se han analizado. */
  getPendingVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
    const analyzed = new Set(loadCatalog().analyzedIds);
    return videos.filter(v => !analyzed.has(v.id));
  },

  isConfigured(): boolean {
    return youtubeService.isConfigured() && geminiService.isConfigured();
  },

  /**
   * Analiza secuencialmente los vídeos pendientes y va persistiendo el
   * catálogo tras cada vídeo (si se interrumpe, no se pierde lo hecho).
   * Devuelve cuántos vídeos se analizaron con éxito y cuántos fallaron.
   */
  async analyzePending(
    videos: YouTubeVideo[],
    onProgress?: (p: AnalyzeProgress) => void
  ): Promise<{ analyzed: number; failed: number; recipesFound: number }> {
    const pending = this.getPendingVideos(videos);
    let analyzed = 0;
    let failed = 0;
    let recipesFound = 0;

    for (let i = 0; i < pending.length; i++) {
      const video = pending[i];
      onProgress?.({ done: i, total: pending.length, currentTitle: video.title });
      try {
        const recipes = await geminiService.extractRecipesFromVideo(video);
        const catalog = loadCatalog();
        catalog.entries = [
          ...catalog.entries.filter(e => e.videoId !== video.id),
          ...recipes,
        ];
        catalog.analyzedIds = [...new Set([...catalog.analyzedIds, video.id])];
        catalog.builtAt = Date.now();
        saveCatalog(catalog);
        analyzed++;
        recipesFound += recipes.length;
      } catch (error) {
        console.warn(`[VideoRecipes] Fallo analizando "${video.title}":`, error);
        failed++;
      }
      // Respiro entre vídeos para no agotar el rate limit del tier gratuito
      if (i < pending.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    onProgress?.({ done: pending.length, total: pending.length, currentTitle: '' });
    return { analyzed, failed, recipesFound };
  },

  invalidate(): void {
    storageService.remove(STORAGE_KEYS.VIDEO_RECIPES);
  },
};
