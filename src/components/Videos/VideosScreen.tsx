import { useState, useEffect } from 'react';
import { Search, Youtube, RefreshCw } from 'lucide-react';
import { VideoModal } from '../Common/VideoModal';
import { VideoGridSkeleton } from '../Common/Loading';
import { Button } from '../Common/Button';
import { useAppStore } from '../../store/useAppStore';
import { youtubeService } from '../../services/youtubeService';
import type { YouTubeVideo } from '../../types';

export function VideosScreen() {
  const { youtubeVideos, setYoutubeVideos } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  const isConfigured = youtubeService.isConfigured();

  const loadVideos = async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const videos = await youtubeService.getPlaylistVideos();
      setYoutubeVideos(videos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando vídeos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && youtubeVideos.length === 0) {
      loadVideos();
    }
  }, []);

  const filteredVideos = search.trim()
    ? youtubeVideos.filter(v =>
        v.title.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes(
            search.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          )
      )
    : youtubeVideos;

  if (!isConfigured) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-5">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <Youtube size={32} className="text-red-500" />
        </div>
        <div className="space-y-2 max-w-xs">
          <p className="font-bold text-gray-800 dark:text-white text-lg">YouTube no configurado</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Para ver los vídeos de tu playlist, añade tu API key en el archivo <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">.env.local</code>
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-left text-xs font-mono space-y-1 w-full max-w-sm">
          <p className="text-gray-500">// .env.local</p>
          <p className="text-gray-700 dark:text-gray-300">VITE_YOUTUBE_API_KEY=<span className="text-primary">tu-key</span></p>
          <p className="text-gray-700 dark:text-gray-300">VITE_YOUTUBE_PLAYLIST_ID=<span className="text-primary">PLxxx...</span></p>
        </div>
        <div className="text-xs text-gray-400 max-w-xs">
          Obtén tu key gratis en{' '}
          <span className="text-secondary font-medium">console.cloud.google.com</span>
          {' '}→ YouTube Data API v3
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="px-4 pt-2 pb-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar vídeo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && <VideoGridSkeleton />}

          {!loading && error && (
            <div className="p-4 text-center space-y-3">
              <p className="text-sm text-error">{error}</p>
              <Button variant="ghost" size="sm" onClick={loadVideos} icon={<RefreshCw size={14} />}>
                Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && youtubeVideos.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No se encontraron vídeos en la playlist</p>
              <Button className="mt-3" variant="ghost" size="sm" onClick={loadVideos} icon={<RefreshCw size={14} />}>
                Recargar
              </Button>
            </div>
          )}

          {!loading && filteredVideos.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">
                  {filteredVideos.length} vídeo{filteredVideos.length !== 1 ? 's' : ''}
                  {search && ` para "${search}"`}
                </p>
                <button
                  onClick={() => { youtubeService.invalidateCache(); loadVideos(); }}
                  className="text-xs text-gray-400 flex items-center gap-1 hover:text-primary"
                >
                  <RefreshCw size={12} /> Actualizar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredVideos.map(video => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="text-left active:scale-95 transition-transform touch-manipulation"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-1.5">
                      <img
                        src={video.thumbnail || youtubeService.getThumbnailUrl(video.id)}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                      {video.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo}
      />
    </>
  );
}
