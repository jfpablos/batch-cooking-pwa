import type { YouTubeVideo, YouTubeCache } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PLAYLIST_ID = import.meta.env.VITE_YOUTUBE_PLAYLIST_ID as string;
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export class YouTubeService {

  isConfigured(): boolean {
    return !!(
      YT_KEY &&
      YT_KEY !== 'AIzaSy-tu-key-aqui' &&
      PLAYLIST_ID &&
      PLAYLIST_ID !== 'PLbo-TdcEj2O95G6vwvMz4ukm8hmkHHe09'
    ) || !!(
      YT_KEY &&
      YT_KEY !== 'AIzaSy-tu-key-aqui' &&
      PLAYLIST_ID
    );
  }

  async getPlaylistVideos(): Promise<YouTubeVideo[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const cached = this.getCached();
    if (cached) return cached;

    const videos: YouTubeVideo[] = [];
    let pageToken: string | undefined = undefined;

    try {
      do {
        const url = new URL(`${YT_API_BASE}/playlistItems`);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', PLAYLIST_ID);
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', YT_KEY);
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
          throw new Error(`YouTube API error: ${data.error.message}`);
        }

        data.items?.forEach((item: Record<string, unknown>) => {
          const snippet = item.snippet as Record<string, unknown>;
          const resourceId = snippet?.resourceId as Record<string, unknown>;
          if (resourceId?.kind === 'youtube#video') {
            const thumbnails = snippet.thumbnails as Record<string, Record<string, string>>;
            videos.push({
              id: resourceId.videoId as string,
              title: snippet.title as string,
              thumbnail: thumbnails?.medium?.url || thumbnails?.default?.url || '',
            });
          }
        });

        pageToken = (data as Record<string, string>).nextPageToken;
      } while (pageToken);

      this.saveCache(videos);
      return videos;
    } catch (error) {
      console.error('[YouTube] Error cargando playlist:', error);
      const staleCache = this.getCached(true);
      if (staleCache) return staleCache;
      return [];
    }
  }

  findMatchingVideo(recipeName: string, videos: YouTubeVideo[]): YouTubeVideo | null {
    if (!videos.length) return null;

    const normalize = (str: string) =>
      str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ');

    const recipeWords = normalize(recipeName)
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (recipeWords.length === 0) return null;

    let bestMatch: YouTubeVideo | null = null;
    let bestScore = 0;

    for (const video of videos) {
      const videoTitle = normalize(video.title);
      const score = recipeWords.filter(word => videoTitle.includes(word)).length;
      if (score > bestScore && score >= 1) {
        bestScore = score;
        bestMatch = video;
      }
    }

    return bestMatch;
  }

  getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }

  getThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  invalidateCache(): void {
    localStorage.removeItem(STORAGE_KEYS.YT_VIDEOS_CACHE);
  }

  private getCached(ignoreExpiry = false): YouTubeVideo[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.YT_VIDEOS_CACHE);
      if (!raw) return null;
      const { videos, timestamp }: YouTubeCache = JSON.parse(raw);
      if (!ignoreExpiry && Date.now() - timestamp > CACHE_TTL) return null;
      return videos;
    } catch {
      return null;
    }
  }

  private saveCache(videos: YouTubeVideo[]): void {
    try {
      const cache: YouTubeCache = { videos, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEYS.YT_VIDEOS_CACHE, JSON.stringify(cache));
    } catch {
      // silent — cache not critical
    }
  }
}

export const youtubeService = new YouTubeService();
