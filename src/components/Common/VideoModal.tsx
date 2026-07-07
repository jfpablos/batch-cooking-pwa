import { useState } from 'react';
import { X, Play } from 'lucide-react';
import type { YouTubeVideo } from '../../types';
import { youtubeService } from '../../services/youtubeService';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: YouTubeVideo | null;
}

export function VideoModal({ isOpen, onClose, video }: VideoModalProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeStarted, setIframeStarted] = useState(false);
  useModalDismiss(isOpen && !!video, onClose);

  if (!isOpen || !video) return null;

  const embedUrl = youtubeService.getEmbedUrl(video.id);

  const handleStartVideo = () => {
    setIframeStarted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-semibold text-sm flex-1 pr-4 line-clamp-2">
            {video.title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Cerrar vídeo"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video container */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
          {!iframeStarted ? (
            /* Lazy load: show thumbnail + play button until user taps */
            <div className="relative w-full h-full cursor-pointer" onClick={handleStartVideo}>
              <img
                src={video.thumbnail || youtubeService.getThumbnailUrl(video.id)}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50 hover:scale-110 transition-transform">
                  <Play size={28} fill="white" className="text-white ml-1" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              <iframe
                src={embedUrl}
                title={video.title}
                className="w-full h-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                onLoad={() => setIframeLoaded(true)}
              />
            </>
          )}
        </div>

        <p className="text-center text-white/50 text-xs mt-3">
          Toca fuera del vídeo para cerrar
        </p>
      </div>
    </div>
  );
}
