import { useState } from 'react';
import { X, Clock, Flame, Play, Heart, Ban } from 'lucide-react';
import { VideoModal } from '../Common/VideoModal';
import { youtubeService } from '../../services/youtubeService';
import { useAppStore } from '../../store/useAppStore';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { CATEGORY_TO_MEAL, scaledMealTargets } from '../../utils/constants';
import type { BaseRecipe, YouTubeVideo } from '../../types';

interface RecipeDetailModalProps {
  recipe: BaseRecipe | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, { label: string; color: string; stripe: string }> = {
  'desayuno':      { label: 'Desayuno',      color: 'var(--amber)',  stripe: 'stripe-desayuno' },
  'pre-entreno':   { label: 'Pre-entreno',   color: 'var(--lime)',   stripe: 'stripe-pre' },
  'principal':     { label: 'Principal',     color: 'var(--orange)', stripe: 'stripe-principal' },
  'post-entreno':  { label: 'Post-entreno',  color: 'var(--teal)',   stripe: 'stripe-post' },
  'cena':          { label: 'Cena',          color: 'var(--plum)',   stripe: 'stripe-cena' },
};

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontWeight: 600 }}>
          <span className="dot" style={{ background: color }} /> {label}
        </span>
        <span className="num"><b style={{ fontWeight: 700 }}>{value}</b><span style={{ color: 'var(--muted-2)' }}>/{target}g</span></span>
      </div>
      <div className="bar"><i style={{ width: pct + '%', background: color }} /></div>
    </div>
  );
}

export function RecipeDetailModal({ recipe, isOpen, onClose }: RecipeDetailModalProps) {
  const youtubeVideos = useAppStore(s => s.youtubeVideos);
  const profile = useAppStore(s => s.profile);
  const recipePrefs = useAppStore(s => s.recipePrefs);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const toggleBanned = useAppStore(s => s.toggleBanned);
  const [videoOpen, setVideoOpen] = useState(false);
  useModalDismiss(isOpen && !!recipe, onClose);

  if (!isOpen || !recipe) return null;

  // Enlace explícito al vídeo origen si la receta viene del catálogo de la
  // playlist; si no, matching aproximado por palabras del título.
  const matchedVideo: YouTubeVideo | null = recipe.sourceVideoId
    ? youtubeVideos.find(v => v.id === recipe.sourceVideoId) ?? {
        id: recipe.sourceVideoId,
        title: 'Vídeo de la receta',
        thumbnail: youtubeService.getThumbnailUrl(recipe.sourceVideoId),
      }
    : youtubeVideos.length > 0
      ? youtubeService.findMatchingVideo(recipe.name, youtubeVideos)
      : null;

  const cat = CATEGORY_COLORS[recipe.category] ?? { label: recipe.category, color: 'var(--orange)', stripe: '' };
  // Targets de macros de la comida a la que pertenece la receta, escalados al
  // perfil (un desayuno no se compara con la proteína de la comida principal)
  const mealTargets = scaledMealTargets(profile);
  const targets = mealTargets[CATEGORY_TO_MEAL[recipe.category]] ?? mealTargets.principal;
  const isFavorite = recipePrefs.favorites.includes(recipe.name);
  const isBanned = recipePrefs.banned.includes(recipe.name);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,12,8,0.45)', backdropFilter: 'blur(4px)',
          zIndex: 50, display: 'flex', alignItems: 'flex-end',
          animation: 'fade-in .25s ease both',
        }}
      >
        {/* Sheet */}
        <div
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={recipe.name}
          className="slide-up"
          style={{
            background: 'var(--cream)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
            width: '100%', maxHeight: '92dvh', overflowY: 'auto',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--line-2)' }} />
          </div>

          {/* Hero */}
          <div style={{ padding: '4px 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: cat.color, textTransform: 'uppercase' as const }}>{cat.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>·</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                    {recipe.prepTime + recipe.cookTime} min
                  </span>
                </div>
                <div className="display-tight" style={{ fontSize: 24, marginTop: 6, lineHeight: 1.15 }}>{recipe.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => toggleFavorite(recipe.name)}
                  aria-label={isFavorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                  aria-pressed={isFavorite}
                  title="Favorita: la IA podrá repetirla o inspirarse en ella"
                  style={{
                    width: 36, height: 36, borderRadius: 999,
                    background: isFavorite ? 'rgba(239,68,68,0.1)' : 'var(--card)',
                    border: '1px solid ' + (isFavorite ? 'rgba(239,68,68,0.4)' : 'var(--line)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <Heart size={16} style={{ color: isFavorite ? '#EF4444' : 'var(--muted)' }} fill={isFavorite ? '#EF4444' : 'none'} />
                </button>
                <button
                  onClick={() => toggleBanned(recipe.name)}
                  aria-label={isBanned ? 'Quitar veto' : 'Vetar receta'}
                  aria-pressed={isBanned}
                  title="Vetada: no volverá a aparecer en menús generados"
                  style={{
                    width: 36, height: 36, borderRadius: 999,
                    background: isBanned ? 'rgba(15,12,8,0.85)' : 'var(--card)',
                    border: '1px solid ' + (isBanned ? 'var(--ink)' : 'var(--line)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <Ban size={16} style={{ color: isBanned ? '#fff' : 'var(--muted)' }} />
                </button>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  style={{
                    width: 36, height: 36, borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <X size={16} style={{ color: 'var(--ink)' }} />
                </button>
              </div>
            </div>
            {isBanned && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ban size={12} /> Vetada: no volverá a aparecer en los próximos menús
              </div>
            )}

            {/* Meta chips */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span className="chip"><Clock size={12} strokeWidth={2} /> Prep <span className="num">{recipe.prepTime}</span>m</span>
              <span className="chip"><Flame size={12} strokeWidth={2} /> Cocción <span className="num">{recipe.cookTime}</span>m</span>
              <span className="chip" style={{ color: 'var(--teal)', borderColor: 'var(--teal)' }}>
                Conserva <span className="num">{recipe.storage.days}</span>d
              </span>
              {recipe.storage.freezable && (
                <span className="chip" style={{ color: 'var(--cobalt)', borderColor: 'var(--cobalt)' }}>❄ Congelable</span>
              )}
            </div>
          </div>

          {/* Video */}
          {matchedVideo && (
            <div style={{ padding: '0 20px 18px' }}>
              <button
                onClick={() => setVideoOpen(true)}
                style={{
                  all: 'unset' as const, cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const,
                  borderRadius: 16, overflow: 'hidden', position: 'relative' as const, display: 'block',
                  background: 'linear-gradient(135deg, var(--orange) 0%, var(--char) 100%)',
                  aspectRatio: '16 / 8',
                }}
              >
                <img src={matchedVideo.thumbnail} alt={matchedVideo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={22} fill="currentColor" stroke="none" />
                  </div>
                  <div style={{ color: '#fff', fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13 }}>Ver vídeo</div>
                </div>
              </button>
            </div>
          )}

          {/* Nutrition */}
          <div style={{ padding: '0 20px 18px' }}>
            <div className="eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Nutrición</div>
            <div style={{ display: 'flex', gap: 10, padding: 14, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <div style={{ flex: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="num display-tight" style={{ fontSize: 30 }}>{recipe.nutrition.calories}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>kcal</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>1 ración</div>
              </div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                <MacroBar label="Proteína" value={recipe.nutrition.protein} target={targets.protein} color="var(--cobalt)" />
                <MacroBar label="Carbos"   value={recipe.nutrition.carbs}   target={targets.carbs} color="var(--lime)" />
                <MacroBar label="Grasa"    value={recipe.nutrition.fat}     target={targets.fat} color="var(--amber)" />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ padding: '0 20px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div className="eyebrow" style={{ fontSize: 10 }}>Ingredientes</div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>1 ración</span>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{ing.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span className="num" style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 14.5 }}>{ing.amount}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{ing.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ padding: '0 20px 20px' }}>
            <div className="eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Elaboración</div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {recipe.steps.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div className="num" style={{
                    width: 24, height: 24, borderRadius: 999, background: 'var(--orange-soft)', color: 'var(--orange-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 12, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s}</div>
                </li>
              ))}
            </ol>
          </div>

          {/* Storage */}
          <div style={{ padding: '0 20px 20px' }}>
            <div className="eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Conservación</div>
            <div style={{ padding: 14, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-2)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              {recipe.storage.instructions} · <strong>{recipe.storage.days} días</strong> en nevera
            </div>
          </div>

          {/* Batch notes */}
          {recipe.batchNotes && (
            <div style={{ padding: '0 20px 28px' }}>
              <div className="eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Notas de batch (×5)</div>
              <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.18)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                {recipe.batchNotes}
              </div>
            </div>
          )}
        </div>
      </div>

      <VideoModal
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        video={matchedVideo}
      />
    </>
  );
}
