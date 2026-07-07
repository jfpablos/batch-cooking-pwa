import { useEffect, useState } from 'react';
import { Sparkles, Calendar, RotateCcw, Check, History, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useMenuGeneration } from '../../hooks/useMenuGeneration';
import { formatDateTime, getCurrentWeekAndYear } from '../../utils/dateUtils';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { geminiService } from '../../services/geminiService';
import { buildFullSelection, countSelected } from '../../utils/prompts';
import { MealSelector } from './MealSelector';
import { PantrySection } from './PantrySection';
import { ProfileSection } from './ProfileSection';
import type { MealSelection } from '../../types';

const GEN_STEPS = [
  { l: 'Analizando tus targets',        s: 'Objetivos de tu perfil · L–V' },
  { l: 'Buscando recetas variadas',     s: '+ histórico · despensa · vídeos' },
  { l: 'Equilibrando macros por comida',s: '5 tomas · ventana anabólica' },
  { l: 'Detallando guía batch',         s: 'Pasos exactos + plan de conservación' },
  { l: 'Generando lista de la compra',  s: 'Agrupando ingredientes ×5' },
];

// Real progress milestones set by useMenuGeneration. The long waits are the
// two AI calls (10→40 menu, 45→70 detailed guide), so the bar creeps toward
// the next milestone meanwhile.
const PROGRESS_MILESTONES = [10, 40, 45, 70, 80, 92, 100];

export function MenuGeneratorScreen() {
  const isGenerating = useAppStore(s => s.isGenerating);
  const generationProgress = useAppStore(s => s.generationProgress);
  const error = useAppStore(s => s.error);
  const currentMenu = useAppStore(s => s.currentMenu);
  const menuHistory = useAppStore(s => s.menuHistory);
  const profile = useAppStore(s => s.profile);
  const { generateMenu } = useMenuGeneration();
  const { weekNumber, year } = getCurrentWeekAndYear();
  const lastGenDate = storageService.get<string>(STORAGE_KEYS.LAST_GEN_DATE);
  const geminiOk = geminiService.isConfigured();
  const [creepProgress, setCreepProgress] = useState(0);

  const [selection, setSelection] = useState<MealSelection>(() => {
    const stored = storageService.get<MealSelection>(STORAGE_KEYS.MEAL_SELECTION);
    return stored ?? buildFullSelection();
  });
  const selectedCount = countSelected(selection);
  const allSelected = selectedCount === 25;

  const updateSelection = (next: MealSelection) => {
    setSelection(next);
    storageService.set(STORAGE_KEYS.MEAL_SELECTION, next);
  };

  // Animate the progress bar: the displayed value snaps to the real milestone
  // and an interval creeps it toward the next one so the bar keeps moving
  // during the long AI calls. State only changes inside the interval callback.
  useEffect(() => {
    if (!isGenerating) return;
    const next = PROGRESS_MILESTONES.find(m => m > generationProgress) ?? 100;
    const ceiling = Math.max(generationProgress, next - 2);
    const id = setInterval(() => {
      setCreepProgress(c => {
        const base = Math.max(c, generationProgress);
        return base >= ceiling ? base : Math.min(ceiling, base + Math.max(0.3, (ceiling - base) * 0.035));
      });
    }, 200);
    return () => clearInterval(id);
  }, [isGenerating, generationProgress]);

  const displayProgress = isGenerating ? Math.max(creepProgress, generationProgress) : generationProgress;

  // derive active step index from progress
  const stepIdx = Math.min(Math.floor((generationProgress / 100) * GEN_STEPS.length), GEN_STEPS.length - 1);

  const handleGenerate = () => {
    setCreepProgress(0);
    generateMenu(selection);
  };

  const buttonLabel = currentMenu
    ? (allSelected ? 'Regenerar semana' : `Regenerar (${selectedCount} comidas)`)
    : (allSelected ? 'Generar semana' : `Generar ${selectedCount} comida${selectedCount === 1 ? '' : 's'}`);

  return (
    <div
      className="h-full overflow-y-auto fade-in"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div style={{ padding: '12px 18px 28px' }}>

        {/* ── Greet header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 4px 18px' }}>
          <div>
            <div className="eyebrow">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            <div className="display" style={{ fontSize: 28, marginTop: 4 }}>
              Tu semana de<br />
              <span style={{ color: 'var(--orange)' }}>combustible.</span>
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--ink)', color: 'var(--cream)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 18,
            letterSpacing: '-0.02em', flexShrink: 0,
          }}>
            B
          </div>
        </div>

        {/* ── Hero dark card ── */}
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden',
          background: 'linear-gradient(160deg, var(--char) 0%, var(--char-2) 60%, #26200E 100%)',
          color: 'var(--cream)', padding: '22px 22px 24px',
          boxShadow: '0 20px 40px -20px rgba(20,15,5,0.4)',
        }}>
          <div className="grain" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--orange)' }}>Semana {weekNumber} · {year}</div>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', borderColor: 'rgba(255,255,255,0.12)' }}>
              <Calendar size={11} strokeWidth={2} /> 5 días
            </span>
          </div>

          <div className="display-tight" style={{ fontSize: 32, marginTop: 14 }}>
            Genera tu próxima<br />
            <span style={{ color: 'var(--orange)', fontStyle: 'italic', fontWeight: 800 }}>semana de recetas</span>
          </div>

          <p style={{ marginTop: 12, color: 'rgba(245,243,238,0.72)', fontSize: 13.5, lineHeight: 1.5, maxWidth: 320 }}>
            25 comidas calibradas para {profile.weightKg.toLocaleString('es-ES')} kg · crossfit · sin repetir las últimas 4 semanas.
          </p>

          {/* Targets */}
          <div style={{
            marginTop: 18, display: 'flex', justifyContent: 'space-between',
            padding: 14, borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { k: 'kcal', v: profile.calories.toLocaleString('es-ES'), d: '/día', c: 'var(--orange)' },
              { k: 'P',    v: String(profile.protein), d: 'g', c: 'var(--cobalt)' },
              { k: 'C',    v: String(profile.carbs),   d: 'g', c: 'var(--lime)' },
              { k: 'F',    v: String(profile.fat),     d: 'g', c: 'var(--amber)' },
            ].map((m, i) => (
              <div key={m.k} style={{
                display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
                borderLeft: i ? '1px solid rgba(255,255,255,0.08)' : 'none',
                paddingLeft: i ? 10 : 0,
              }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', color: m.c, textTransform: 'uppercase' as const }}>{m.k}</span>
                <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {m.v}<span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>{m.d}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Gemini status */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(245,243,238,0.55)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: geminiOk ? '#7FCB4A' : '#F59E0B', flexShrink: 0 }} />
            {geminiOk ? '⚡ Gemini 2.5 Flash · IA activa' : 'Banco de recetas base · 25 recetas'}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedCount === 0}
            style={{
              marginTop: 18, width: '100%', minHeight: 56,
              background: isGenerating
                ? 'rgba(255,107,53,0.15)'
                : selectedCount === 0
                  ? 'rgba(255,107,53,0.15)'
                  : 'var(--orange)',
              border: 'none', borderRadius: 14,
              color: isGenerating || selectedCount === 0 ? 'var(--orange)' : '#fff',
              fontFamily: 'var(--ff-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: isGenerating ? 'wait' : selectedCount === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedCount === 0 ? 0.6 : 1,
              transition: 'all .25s',
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2.4px solid rgba(255,107,53,0.25)', borderTopColor: 'var(--orange)',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block',
                }} />
                Generando…
              </>
            ) : selectedCount === 0 ? (
              <>Selecciona al menos una comida</>
            ) : (
              <><Sparkles size={18} strokeWidth={2} /> {buttonLabel}</>
            )}
          </button>
        </div>

        {/* ── Day/meal selector ── */}
        <MealSelector selection={selection} onChange={updateSelection} />

        {/* ── Perfil nutricional editable ── */}
        <ProfileSection />

        {/* ── Pantry: ingredientes a gastar ── */}
        <PantrySection />

        {/* ── Generation progress detail ── */}
        {isGenerating && (
          <div className="fade-in" style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line)' }}>
            {GEN_STEPS.map((s, i) => {
              const state = i < stepIdx ? 'done' : i === stepIdx ? 'now' : 'todo';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                  borderTop: i ? '1px dashed var(--line-2)' : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: state === 'done' ? 'var(--orange)' : state === 'now' ? 'rgba(255,107,53,0.12)' : 'var(--line)',
                    color: state === 'done' ? '#fff' : 'var(--orange)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {state === 'done' ? <Check size={12} strokeWidth={3} /> :
                     state === 'now' ? <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin .8s linear infinite', display: 'inline-block' }} /> :
                     <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--muted-2)', display: 'block' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: state === 'todo' ? 'var(--muted)' : 'var(--ink)' }}>{s.l}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.s}</div>
                  </div>
                </div>
              );
            })}
            {/* progress bar */}
            <div style={{ marginTop: 12 }}>
              <div className="bar"><i style={{ width: Math.round(displayProgress) + '%', transition: 'width .25s linear' }} /></div>
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }} className="num">{Math.round(displayProgress)}%</div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !isGenerating && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={selectedCount === 0}
              style={{
                marginTop: 10, minHeight: 44, width: '100%', background: 'transparent',
                border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, color: '#EF4444',
                fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} strokeWidth={2} /> Reintentar generación
            </button>
          </div>
        )}

        {/* ── Info cards ── */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>Perfil</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--ff-display)', fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
              Crossfit · 5 d/sem
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }} className="num">{profile.weightKg.toLocaleString('es-ES')} kg · L–V</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>Anti-repetición</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--ff-display)', fontSize: 16, fontWeight: 700 }}>
              <span className="num">{menuHistory.reduce((acc, w) => acc + w.recipeNames.length, 0)}</span>
              {' '}<span style={{ color: 'var(--muted)' }}>vetadas</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>Últimas 4 semanas</div>
          </div>
        </div>

        {/* ── Last menu link ── */}
        {currentMenu && lastGenDate && (
          <div style={{
            marginTop: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={18} strokeWidth={1.8} style={{ color: 'var(--ink-2)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Menú actual · S{currentMenu.weekNumber}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Generado {formatDateTime(lastGenDate)}</div>
            </div>
            <RotateCcw size={15} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
          </div>
        )}

        {/* ── How it works ── */}
        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div className="eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Cómo funciona</div>
          {[
            'Pulsa "Generar semana" el domingo por la tarde',
            'Revisa las recetas día a día en "Mi menú"',
            'Haz la compra con la lista agrupada',
            'Cocina todo el domingo siguiendo la Guía Batch',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: i ? 10 : 0, borderTop: i ? '1px dashed var(--line-2)' : 'none' }}>
              <span style={{
                width: 22, height: 22, borderRadius: 999, background: 'var(--orange-soft)', color: 'var(--orange-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 12, flexShrink: 0,
              }} className="num">{i + 1}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, paddingTop: 2 }}>{text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
