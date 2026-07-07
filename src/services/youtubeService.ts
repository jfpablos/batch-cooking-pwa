import type { YouTubeVideo, YouTubeCache } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { normalizeText } from '../utils/textUtils';
import { isSupabaseConfigured, invokeFunction, functionErrorMessage } from '../lib/supabase';

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días
// v2: añade "description"; v3: descripción completa (hasta 2000 chars) para
// poder extraer las recetas de los vídeos recopilatorios
const CACHE_VERSION = 3;

export class YouTubeService {

  /**
   * La playlist se carga vía la Edge Function youtube-playlist (la API key y
   * el playlist ID viven en secrets del servidor).
   */
  isConfigured(): boolean {
    return isSupabaseConfigured;
  }

  async getPlaylistVideos(): Promise<YouTubeVideo[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const cached = this.getCached();
    if (cached) return cached;

    try {
      const res = await invokeFunction('youtube-playlist');
      if (!res.ok) {
        throw new Error(await functionErrorMessage(res));
      }
      const { videos } = (await res.json()) as { videos: YouTubeVideo[] };

      this.saveCache(videos);
      return videos;
    } catch (error) {
      console.error('[YouTube] Error cargando playlist:', error);
      const staleCache = this.getCached(true);
      if (staleCache && staleCache.length > 0) return staleCache;
      // Sin caché de respaldo: propagar para que la UI muestre el motivo
      // (p. ej. "API key not valid") en vez de una lista vacía en silencio.
      throw error;
    }
  }

  findMatchingVideo(recipeName: string, videos: YouTubeVideo[]): YouTubeVideo | null {
    if (!videos.length) return null;

    const recipeWords = normalizeText(recipeName)
      .split(' ')
      .filter(w => w.length > 3);

    if (recipeWords.length === 0) return null;

    // Palabras completas del título ("pollo" ya no casa con "repollo") y
    // umbral de 2 coincidencias: una sola palabra común ("arroz") emparejaba
    // casi cualquier vídeo equivocado.
    const minScore = Math.min(2, recipeWords.length);
    let bestMatch: YouTubeVideo | null = null;
    let bestScore = 0;

    for (const video of videos) {
      const titleWords = new Set(normalizeText(video.title).split(' '));
      const score = recipeWords.filter(word => titleWords.has(word)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = video;
      }
    }

    return bestScore >= minScore ? bestMatch : null;
  }

  getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }

  getThumbnailUrl(videoId: string): string {
    // Mismo dominio que los thumbnails de la API para que Workbox los cachee
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  }

  invalidateCache(): void {
    localStorage.removeItem(STORAGE_KEYS.YT_VIDEOS_CACHE);
  }

  private getCached(ignoreExpiry = false): YouTubeVideo[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.YT_VIDEOS_CACHE);
      if (!raw) return null;
      const { videos, timestamp, version }: YouTubeCache = JSON.parse(raw);
      // Caché de versión antigua: forzar refetch, salvo como fallback stale
      // (description es opcional en todos los consumidores).
      if (!ignoreExpiry && version !== CACHE_VERSION) return null;
      if (!ignoreExpiry && Date.now() - timestamp > CACHE_TTL) return null;
      return videos;
    } catch {
      return null;
    }
  }

  private saveCache(videos: YouTubeVideo[]): void {
    try {
      const cache: YouTubeCache = { videos, timestamp: Date.now(), version: CACHE_VERSION };
      localStorage.setItem(STORAGE_KEYS.YT_VIDEOS_CACHE, JSON.stringify(cache));
    } catch {
      // silent — cache not critical
    }
  }
}

export const youtubeService = new YouTubeService();
