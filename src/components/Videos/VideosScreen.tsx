import { useState, useEffect } from 'react';
import { Search, Play, X, RefreshCw } from 'lucide-react';
import { VideoModal } from '../Common/VideoModal';
import { useAppStore } from '../../store/useAppStore';
import { youtubeService } from '../../services/youtubeService';
import type { YouTubeVideo } from '../../types';

// Tones for video thumbnail placeholders when no thumbnail available
const TONES = [
  'var(--orange)', 'var(--orange-2)', 'var(--amber)', 'var(--char)',
  'var(--cobalt)', 'var(--lime)', 'var(--amber)', 'var(--plum)',
];

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
    if (isConfigured && youtubeVideos.length === 0) loadVideos();
  }, []);

  const filteredVideos = search.trim()
    ? youtubeVideos.filter(v =>
        v.title.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes(search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      )
    : youtubeVideos;

  if (!isConfigured) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 text-center gap-5"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
          ▶️
        </div>
        <div>
          <p className="display" style={{ fontSize: 22 }}>YouTube no configurado</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, maxWidth: 280 }}>
            Añade tu API key y playlist ID en <code style={{ background: 'var(--cream-2)', padding: '2px 6px', borderRadius: 5, fontSize: 12 }}>.env.local</code> para ver los vídeos
          </p>
        </div>
        <div style={{ background: 'var(--cream-2)', borderRadius: 16, padding: '14px 16px', textAlign: 'left', width: '100%', maxWidth: 320, fontFamily: 'var(--ff-mono)', fontSize: 12, lineHeight: 1.8 }}>
          <div style={{ color: 'var(--muted)' }}>// .env.local</div>
          <div>VITE_YOUTUBE_API_KEY=<span style={{ color: 'var(--orange)' }}>tu-key</span></div>
          <div>VITE_YOUTUBE_PLAYLIST_ID=<span style={{ color: 'var(--orange)' }}>PLxxx…</span></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '14px 18px 12px' }}>
          <div className="eyebrow">Playlist YouTube</div>
          <div className="display" style={{ fontSize: 26, marginTop: 2 }}>Vídeos de recetas</div>

          {/* Search */}
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px',
          }}>
            <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar receta…"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--ff-body)', fontSize: 14, color: 'var(--ink)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ all: 'unset' as any, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {loading ? 'Cargando…' : `${filteredVideos.length} vídeos · caché 7 días`}
            </span>
            <button
              onClick={() => { youtubeService.invalidateCache(); loadVideos(); }}
              style={{ all: 'unset' as any, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}
            >
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '16/10', borderRadius: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, marginBottom: 5 }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, width: '70%' }} />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredVideos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {filteredVideos.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVideo(v)}
                  style={{
                    all: 'unset' as any, cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                    background: 'var(--card)', border: '1px solid var(--line)',
                  }}
                >
                  {/* Thumb */}
                  <div style={{
                    aspectRatio: '16 / 10', position: 'relative' as const,
                    background: v.thumbnail ? 'var(--char)' : `linear-gradient(135deg, ${TONES[idx % TONES.length]} 0%, var(--char) 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {v.thumbnail && (
                      <img
                        src={v.thumbnail || youtubeService.getThumbnailUrl(v.id)}
                        alt={v.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const }}
                        loading="lazy"
                      />
                    )}
                    <div className="grain" style={{ opacity: 0.35 }} />
                    <div style={{
                      position: 'relative', zIndex: 1,
                      width: 40, height: 40, borderRadius: 999,
                      background: 'rgba(255,255,255,0.9)', color: 'var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Play size={16} fill="currentColor" stroke="none" />
                    </div>
                  </div>
                  <div style={{ padding: '10px 11px 12px' }}>
                    <div className="display" style={{
                      fontSize: 12.5, lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                      minHeight: 32,
                    }}>
                      {v.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && youtubeVideos.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
              No se encontraron vídeos en la playlist
            </div>
          )}

          <div style={{ height: 16 }} />
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
