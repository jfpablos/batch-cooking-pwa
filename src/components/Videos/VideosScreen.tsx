import { useState, useEffect, useCallback } from 'react';
import { Search, Play, X, RefreshCw, Sparkles } from 'lucide-react';
import { VideoModal } from '../Common/VideoModal';
import { useAppStore } from '../../store/useAppStore';
import { youtubeService } from '../../services/youtubeService';
import { geminiService } from '../../services/geminiService';
import { videoRecipeService } from '../../services/videoRecipeService';
import type { AnalyzeProgress } from '../../services/videoRecipeService';
import type { YouTubeVideo } from '../../types';

// Tones for video thumbnail placeholders when no thumbnail available
const TONES = [
  'var(--orange)', 'var(--orange-2)', 'var(--amber)', 'var(--char)',
  'var(--cobalt)', 'var(--lime)', 'var(--amber)', 'var(--plum)',
];

export function VideosScreen() {
  const { youtubeVideos, setYoutubeVideos, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [analyzing, setAnalyzing] = useState<AnalyzeProgress | null>(null);

  const isConfigured = youtubeService.isConfigured();

  // Registro de recetas por vídeo (la IA analiza el contenido de cada vídeo)
  const recipesByVideo = new Map<string, string[]>();
  for (const entry of videoRecipeService.getCachedCatalog()) {
    const list = recipesByVideo.get(entry.videoId) ?? [];
    list.push(entry.name);
    recipesByVideo.set(entry.videoId, list);
  }
  const pendingVideos = videoRecipeService.getPendingVideos(youtubeVideos);
  const canAnalyze = geminiService.isConfigured() && pendingVideos.length > 0;

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing({ done: 0, total: pendingVideos.length, currentTitle: '' });
    try {
      const res = await videoRecipeService.analyzePending(youtubeVideos, p => setAnalyzing({ ...p }));
      showToast(
        res.analyzed > 0
          ? `${res.recipesFound} receta${res.recipesFound === 1 ? '' : 's'} extraída${res.recipesFound === 1 ? '' : 's'} de ${res.analyzed} vídeo${res.analyzed === 1 ? '' : 's'}${res.failed ? ` · ${res.failed} fallido${res.failed === 1 ? '' : 's'}` : ''}`
          : 'No se pudo analizar ningún vídeo — revisa la consola',
        res.analyzed > 0 ? 'success' : 'error'
      );
    } finally {
      setAnalyzing(null);
    }
  };

  const loadVideos = useCallback(async () => {
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
  }, [isConfigured, setYoutubeVideos]);

  useEffect(() => {
    if (isConfigured && youtubeVideos.length === 0) loadVideos();
  }, [isConfigured, youtubeVideos.length, loadVideos]);

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
              <button onClick={() => setSearch('')} style={{ all: 'unset' as const, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {loading ? 'Cargando…' : `${filteredVideos.length} vídeos · caché 7 días`}
            </span>
            <button
              onClick={() => { youtubeService.invalidateCache(); videoRecipeService.invalidate(); loadVideos(); }}
              style={{ all: 'unset' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}
            >
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>

          {/* Análisis de recetas de los vídeos (contenido, no descripción) */}
          {analyzing ? (
            <div style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--orange-2)' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: '2px solid rgba(255,107,53,0.25)', borderTopColor: 'var(--orange)',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block',
                }} />
                Analizando vídeo {Math.min(analyzing.done + 1, analyzing.total)} de {analyzing.total}…
              </div>
              {analyzing.currentTitle && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {analyzing.currentTitle}
                </div>
              )}
              <div className="bar" style={{ marginTop: 8 }}>
                <i style={{ width: `${analyzing.total ? Math.round(analyzing.done / analyzing.total * 100) : 0}%` }} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                La IA está viendo cada vídeo para extraer sus recetas (~1 min por vídeo). Puedes salir de esta pestaña: el progreso se guarda vídeo a vídeo.
              </p>
            </div>
          ) : canAnalyze ? (
            <button
              onClick={handleAnalyze}
              style={{
                marginTop: 10, width: '100%', minHeight: 44, boxSizing: 'border-box' as const,
                background: 'rgba(255,107,53,0.1)', color: 'var(--orange-2)',
                border: '1px solid rgba(255,107,53,0.3)', borderRadius: 12,
                fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
              }}
            >
              <Sparkles size={15} strokeWidth={2} />
              Analizar recetas de {pendingVideos.length} vídeo{pendingVideos.length === 1 ? '' : 's'}
            </button>
          ) : null}
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
                    all: 'unset' as const, cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
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
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      minHeight: 32,
                    }}>
                      {v.title}
                    </div>
                    {(recipesByVideo.get(v.id)?.length ?? 0) > 0 && (
                      <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.4, color: 'var(--muted)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--orange-2)' }}>
                          {recipesByVideo.get(v.id)!.length} receta{recipesByVideo.get(v.id)!.length === 1 ? '' : 's'}:
                        </span>{' '}
                        {recipesByVideo.get(v.id)!.slice(0, 3).join(' · ')}
                        {recipesByVideo.get(v.id)!.length > 3 && ` · +${recipesByVideo.get(v.id)!.length - 3} más`}
                      </div>
                    )}
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
