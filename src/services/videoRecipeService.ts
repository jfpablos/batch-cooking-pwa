import type { VideoRecipe, VideoRecipeCatalog } from '../types';
import { geminiService } from './geminiService';
import { youtubeService } from './youtubeService';
import { storageService } from './storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(id => setA.has(id));
}

export const videoRecipeService = {
  /**
   * Catálogo de recetas por vídeo. Se construye con Gemini a partir de
   * título + descripción de cada vídeo y se cachea en localStorage;
   * solo se reconstruye cuando cambia el contenido de la playlist.
   */
  async getCatalog(): Promise<VideoRecipe[]> {
    if (!youtubeService.isConfigured() || !geminiService.isConfigured()) return [];

    const videos = await youtubeService.getPlaylistVideos().catch(() => []);
    if (videos.length === 0) return [];

    const videoIds = videos.map(v => v.id);
    const cached = storageService.get<VideoRecipeCatalog>(STORAGE_KEYS.VIDEO_RECIPES);
    if (cached && Array.isArray(cached.entries) && sameIds(cached.videoIds ?? [], videoIds)) {
      return cached.entries;
    }

    const entries = await geminiService.extractVideoRecipes(videos);
    if (entries.length > 0) {
      const catalog: VideoRecipeCatalog = { entries, builtAt: Date.now(), videoIds };
      storageService.set(STORAGE_KEYS.VIDEO_RECIPES, catalog);
    }
    return entries;
  },

  /** Lectura síncrona del catálogo cacheado (para la UI de la pestaña Vídeos). */
  getCachedCatalog(): VideoRecipe[] {
    const cached = storageService.get<VideoRecipeCatalog>(STORAGE_KEYS.VIDEO_RECIPES);
    return cached?.entries ?? [];
  },

  invalidate(): void {
    storageService.remove(STORAGE_KEYS.VIDEO_RECIPES);
  },
};
