import { useState, useEffect } from 'react';
import { Play, Pause, Timer, Check, Sparkles, ArrowRight, ArrowLeft, RotateCcw, Flame, UtensilsCrossed, Zap } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { menuService } from '../../services/menuService';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { buildBasicConservationPlan } from '../../utils/conservationFallback';
import { useTimer, formatTimer } from '../../hooks/useTimer';
import { unlockAudio } from '../../utils/alarm';
import { ConservationCard } from './ConservationCard';
import type { BaseRecipe, BatchProgress, ConservationEntry } from '../../types';

interface NormTask {
  order: number;
  title: string;
  note: string;
  dur: number;
  parallel: number | null;
  steps?: string[];
  seasoning?: string;
  equipment?: string;
}

// Fallback guide for menus generated from the base recipe bank (no AI batch guide).
const DEFAULT_TASKS: NormTask[] = [
  { order: 1, title: 'Lavar y trocear todas las verduras', dur: 15, parallel: null,
    note: 'Brócoli, espárragos, espinacas, cebolla, judías. Reservar en bols.' },
  { order: 2, title: 'Pesar y dosificar arroces y cereales', dur: 10, parallel: null,
    note: 'Tener 750 g arroz integral y 1 kg arroz blanco listos para cocer.' },
  { order: 3, title: 'Cocer arroz integral (750 g)', dur: 25, parallel: 4,
    note: 'Olla 1, agua salada. Mientras, avanza con el horno.' },
  { order: 4, title: 'Hornear proteínas + boniatos', dur: 35, parallel: 3,
    note: '200 °C. Bandejas separadas, papel de horno.' },
  { order: 5, title: 'Saltear pechugas de pollo', dur: 20, parallel: null,
    note: 'Tandas de 500 g. Salpimentar. Reservar parte para platos con salsa.' },
  { order: 6, title: 'Plancha de pavo (600 g)', dur: 14, parallel: null,
    note: 'Fuego alto, 2 min/lado. Reservar para martes y jueves.' },
  { order: 7, title: 'Hervir huevos (8 ud)', dur: 12, parallel: 8,
    note: '10 min desde ebullición. Pelar bajo agua fría.' },
  { order: 8, title: 'Cocer arroz blanco (1 kg)', dur: 18, parallel: 7,
    note: 'Para post-entreno y pre-entreno de la semana.' },
  { order: 9, title: 'Repartir en tuppers', dur: 11, parallel: null,
    note: 'Etiquetar L–V por comida. Salsas en bote aparte.' },
];

function loadProgress(): BatchProgress | null {
  const menu = useAppStore.getState().currentMenu;
  const p = storageService.get<BatchProgress>(STORAGE_KEYS.BATCH_PROGRESS);
  return p && menu && p.menuId === menu.id ? p : null;
}

export function BatchGuideScreen() {
  const { currentMenu, batchGuide, setActiveTab, startTimer, pauseTimer, resumeTimer, resetTimer } = useAppStore();
  const { activeTimer, remaining } = useTimer();
  const [done, setDone] = useState<Set<number>>(() => new Set(loadProgress()?.done ?? []));
  const [cooking, setCooking] = useState(() => loadProgress()?.cooking ?? false);
  const [current, setCurrent] = useState<number | null>(() => loadProgress()?.current ?? null);

  // Scroll the active task into view when step-by-step mode advances.
  useEffect(() => {
    if (current == null) return;
    document
      .getElementById(`batch-task-${current}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [current]);

  // Persist progress so it survives tab switches and reloads.
  useEffect(() => {
    if (!currentMenu) return;
    const progress: BatchProgress = { menuId: currentMenu.id, done: [...done], current, cooking };
    storageService.set(STORAGE_KEYS.BATCH_PROGRESS, progress);
  }, [done, current, cooking, currentMenu]);

  if (!currentMenu) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 text-center gap-5"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
          🔥
        </div>
        <div>
          <p className="display" style={{ fontSize: 22 }}>Sin guía disponible</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Genera un menú primero para obtener tu guía</p>
        </div>
        <button
          onClick={() => setActiveTab(0)}
          style={{
            minHeight: 48, padding: '0 24px', background: 'var(--orange)', color: '#fff',
            border: 'none', borderRadius: 12, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          }}
        >
          <Sparkles size={18} /> Generar menú
        </button>
      </div>
    );
  }

  // Recetas "al momento": se hacen frescas en el día, no entran en el batch.
  const freshRecipes: BaseRecipe[] = menuService.buildRecipeSchedule(currentMenu)
    .map(s => currentMenu.recipes.find(r => r.name === s.recipeName))
    .filter((r): r is BaseRecipe => !!r && menuService.isFreshRecipe(r));
  const freshNames = new Set(freshRecipes.map(r => r.name));

  // Use the AI-generated guide when it matches the current menu; otherwise fall back.
  const usingGuide = !!batchGuide && batchGuide.menuId === currentMenu.id && batchGuide.tasks.length > 0;
  const tasks: NormTask[] = (usingGuide ? batchGuide!.tasks
    // Oculta tareas que solo preparan recetas al momento (guías antiguas)
    .filter(t => !(t.recipeNames?.length && t.recipeNames.every(n => freshNames.has(n))))
    .map(t => ({
    order: t.order,
    title: t.title,
    note: t.description,
    dur: t.duration,
    parallel: t.parallelWith,
    steps: t.steps,
    seasoning: t.seasoning,
    equipment: t.equipment,
  })) : DEFAULT_TASKS).slice().sort((a, b) => a.order - b.order);

  // Plan de conservación: el detallado de la IA si existe; si no, derivado
  // de los campos storage de las recetas del menú actual.
  const conservationEntries: ConservationEntry[] = (
    usingGuide && batchGuide!.conservationPlan?.length
      ? batchGuide!.conservationPlan
      : buildBasicConservationPlan(currentMenu)
  ).filter(e => !freshNames.has(e.recipeName));

  const nextPending = (doneSet: Set<number>): number | null =>
    tasks.find(t => !doneSet.has(t.order))?.order ?? null;

  const startCooking = () => {
    let start = nextPending(done);
    if (start == null) { // all complete → restart
      setDone(new Set());
      start = tasks[0]?.order ?? null;
    }
    setCooking(true);
    setCurrent(start);
  };

  const completeCurrent = () => {
    if (current == null) return;
    const s = new Set(done);
    s.add(current);
    setDone(s);
    if (activeTimer?.taskOrder === current) resetTimer();
    const next = nextPending(s);
    setCurrent(next);
    if (next == null) setCooking(false); // finished the whole route
  };

  const goBack = () => {
    // Step to the previous task and re-open it (unmark) so it becomes current again.
    const idx = current == null ? tasks.length : tasks.findIndex(t => t.order === current);
    const prev = tasks[idx - 1];
    if (!prev) return;
    const s = new Set(done);
    s.delete(prev.order);
    setDone(s);
    setCurrent(prev.order);
    setCooking(true);
  };

  const canGoBack = cooking && (current == null
    ? tasks.length > 0
    : tasks.findIndex(t => t.order === current) > 0);

  const stopCooking = () => { setCooking(false); setCurrent(null); };

  const toggle = (n: number) => setDone(prev => {
    const s = new Set(prev);
    if (s.has(n)) s.delete(n);
    else s.add(n);
    return s;
  });

  const handleStartTimer = (t: NormTask) => {
    unlockAudio();
    startTimer(t.order, t.dur * 60);
  };

  const totalTasks = tasks.length;
  const totalDone = done.size;
  const pct = totalTasks ? Math.round(totalDone * 100 / totalTasks) : 0;
  const totalMin = usingGuide ? batchGuide!.estimatedTotalTime : tasks.reduce((a, t) => a + t.dur, 0);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  const timerTask = activeTimer ? tasks.find(t => t.order === activeTimer.taskOrder) : null;

  return (
    <div
      className="h-full overflow-y-auto fade-in"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '14px 18px 0' }}>
        <div className="eyebrow">Batch · domingo</div>
        <div className="display" style={{ fontSize: 26, marginTop: 2 }}>Ruta de cocina</div>

        {/* Orange hero */}
        <div style={{
          marginTop: 14, position: 'relative', overflow: 'hidden',
          padding: 18, borderRadius: 18,
          background: 'linear-gradient(135deg, var(--orange) 0%, #C44116 100%)',
          color: '#fff',
        }}>
          <div className="grain" style={{ opacity: 0.3 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Tiempo estimado</div>
              <div className="num display-tight" style={{ fontSize: 44, marginTop: 4 }}>
                {hrs}h {mins > 0 ? `${mins}` : ''}<span style={{ fontSize: 18, opacity: 0.7, fontWeight: 600 }}>min</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Tareas</div>
              <div className="num display-tight" style={{ fontSize: 28, marginTop: 4 }}>
                {totalDone}<span style={{ fontSize: 14, opacity: 0.7, fontWeight: 600 }}>/{totalTasks}</span>
              </div>
            </div>
          </div>

          <div className="bar" style={{ marginTop: 14, background: 'rgba(255,255,255,0.18)' }}>
            <i style={{ width: pct + '%', background: '#fff' }} />
          </div>

          {/* Active timer pill */}
          {activeTimer && timerTask && (
            <div style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 11.5, fontWeight: 700,
            }}>
              <Timer size={12} strokeWidth={2.2} />
              Tarea {timerTask.order} ·{' '}
              <span className="num" style={{ fontFamily: 'var(--ff-mono)' }}>
                {activeTimer.status === 'finished' ? '0:00 ✓' : formatTimer(remaining)}
              </span>
              {activeTimer.status === 'paused' && ' (pausa)'}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {cooking && (
              <button
                onClick={goBack}
                disabled={!canGoBack}
                title="Paso anterior"
                style={{
                  width: 44, height: 44, background: 'rgba(255,255,255,0.18)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: 11,
                  cursor: canGoBack ? 'pointer' : 'not-allowed', opacity: canGoBack ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <ArrowLeft size={16} strokeWidth={2.2} />
              </button>
            )}
            <button
              onClick={cooking ? completeCurrent : startCooking}
              style={{
                flex: 1, height: 44, background: '#fff', color: 'var(--orange-2)',
                border: 'none', borderRadius: 11, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
              }}
            >
              {cooking ? (
                <><Check size={14} strokeWidth={3} /> Tarea hecha · siguiente <ArrowRight size={14} strokeWidth={2.5} /></>
              ) : (
                <><Play size={14} fill="currentColor" stroke="none" /> {totalDone > 0 ? 'Reanudar' : 'Empezar a cocinar'}</>
              )}
            </button>
            <button
              onClick={cooking ? stopCooking : startCooking}
              title={cooking ? 'Detener modo paso a paso' : 'Empezar a cocinar'}
              style={{
                width: 44, height: 44, background: 'rgba(255,255,255,0.18)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {cooking ? <RotateCcw size={16} strokeWidth={1.8} /> : <Timer size={16} strokeWidth={1.8} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.14em' }}>
            RUTA
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="display" style={{ fontSize: 13 }}>
            {usingGuide ? (batchGuide!.detailLevel === 'detailed' ? 'Detallada por IA' : 'Generada por IA') : 'Guía base'}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 18, top: 8, bottom: 8, width: 2, background: 'var(--line)', borderRadius: 1 }} />
          {tasks.map((t) => {
            const isDone = done.has(t.order);
            const isCurrent = cooking && current === t.order;
            const isTimerTask = activeTimer?.taskOrder === t.order;
            const timerRunning = isTimerTask && activeTimer!.status === 'running';
            const timerPaused = isTimerTask && activeTimer!.status === 'paused';
            const timerFinished = isTimerTask && activeTimer!.status === 'finished';
            return (
              <div key={t.order} id={`batch-task-${t.order}`} style={{ position: 'relative', paddingLeft: 50, paddingBottom: 12 }}>
                {/* Node */}
                <div className="num" style={{
                  position: 'absolute', left: 8, top: 6,
                  width: 22, height: 22, borderRadius: 999, zIndex: 1,
                  background: isDone ? 'var(--orange)' : 'var(--card)',
                  border: '2px solid ' + (isDone || isCurrent ? 'var(--orange)' : 'var(--line-2)'),
                  color: isDone ? '#fff' : 'var(--ink)',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(255,107,53,0.18)' : 'none',
                }}>
                  {isDone ? <Check size={12} strokeWidth={3} /> : t.order}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(t.order)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(t.order); } }}
                  style={{
                    cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const,
                    background: isCurrent ? 'rgba(255,107,53,0.07)' : 'var(--card)',
                    border: '1px solid ' + (isCurrent ? 'var(--orange)' : 'var(--line)'), borderRadius: 14,
                    padding: '10px 12px', display: 'block',
                    opacity: isDone ? 0.55 : 1,
                  }}
                >
                  {isCurrent && (
                    <div className="eyebrow" style={{ fontSize: 9.5, color: 'var(--orange-2)', marginBottom: 4 }}>
                      ● En curso
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="display" style={{
                      fontSize: 14, lineHeight: 1.25, flex: 1,
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {t.title}
                    </span>

                    {/* Timer chip / controls */}
                    {isTimerTask ? (
                      <span
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                      >
                        <span className="num" style={{
                          fontSize: 13, fontWeight: 700, fontFamily: 'var(--ff-mono)',
                          color: timerFinished ? '#5A9A2E' : remaining < 60 && timerRunning ? '#DC2626' : 'var(--orange)',
                        }}>
                          {timerFinished ? '¡Fin!' : formatTimer(remaining)}
                        </span>
                        {!timerFinished && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (timerPaused) resumeTimer();
                              else pauseTimer();
                            }}
                            aria-label={timerPaused ? 'Reanudar temporizador' : 'Pausar temporizador'}
                            style={{
                              all: 'unset' as const, cursor: 'pointer',
                              width: 30, height: 30, borderRadius: 9,
                              background: 'rgba(255,107,53,0.12)', color: 'var(--orange-2)',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {timerPaused ? <Play size={13} fill="currentColor" stroke="none" /> : <Pause size={13} fill="currentColor" stroke="none" />}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); resetTimer(); }}
                          aria-label="Descartar temporizador"
                          style={{
                            all: 'unset' as const, cursor: 'pointer',
                            width: 30, height: 30, borderRadius: 9,
                            background: 'var(--cream-2)', color: 'var(--muted)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <RotateCcw size={13} strokeWidth={2.2} />
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--ff-mono)' }}>
                          <Timer size={12} strokeWidth={2.2} /> {t.dur}m
                        </span>
                        {!isDone && t.dur > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStartTimer(t); }}
                            aria-label={`Iniciar temporizador de ${t.dur} minutos`}
                            title={`Temporizador ${t.dur} min`}
                            style={{
                              all: 'unset' as const, cursor: 'pointer',
                              width: 30, height: 30, borderRadius: 9,
                              background: 'rgba(255,107,53,0.12)', color: 'var(--orange-2)',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Play size={13} fill="currentColor" stroke="none" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>

                  {t.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.4 }}>{t.note}</div>}

                  {/* v2 detail: equipment / seasoning / sub-steps */}
                  {t.equipment && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 7, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                      <UtensilsCrossed size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{t.equipment}</span>
                    </div>
                  )}
                  {t.seasoning && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 5, fontSize: 11.5, lineHeight: 1.4, color: 'var(--orange-2)' }}>
                      <Flame size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Sazón:</strong> {t.seasoning}</span>
                    </div>
                  )}
                  {t.steps && t.steps.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line-2)' }}>
                      {t.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i ? 6 : 0 }}>
                          <span className="num" style={{
                            width: 17, height: 17, borderRadius: 999, flexShrink: 0, marginTop: 1,
                            background: 'var(--cream-2)', border: '1px solid var(--line)',
                            color: 'var(--ink-2)', fontSize: 9.5, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)' }}>
                            {step.replace(/^\d+[.)]\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {t.parallel && (
                    <div style={{
                      marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                      background: 'rgba(255,107,53,0.1)', color: 'var(--orange-2)', borderRadius: 999,
                    }}>
                      ⇄ paralelo con tarea {t.parallel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Al momento (no entra en el batch) ── */}
      {freshRecipes.length > 0 && (
        <div style={{ padding: '8px 18px 0' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Zap size={13} strokeWidth={2.4} style={{ color: '#0D9488' }} fill="currentColor" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#0D9488' }}>
                Al momento · no entra en el batch
              </span>
            </div>
            {freshRecipes.map((r, i) => (
              <div key={r.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                padding: '7px 0', borderTop: i ? '1px dashed rgba(20,184,166,0.2)' : 'none',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1, minWidth: 0 }}>{r.name}</span>
                <span className="num" style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', fontFamily: 'var(--ff-mono)', flexShrink: 0 }}>
                  {r.prepTime + r.cookTime} min
                </span>
              </div>
            ))}
            <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
              Estas recetas se preparan frescas cada día en pocos minutos. Sus ingredientes sí están en la lista de la compra.
            </p>
          </div>
        </div>
      )}

      {/* ── Conservation plan ── */}
      <div style={{ padding: '8px 18px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.14em' }}>
            CONSERVACIÓN
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="display" style={{ fontSize: 13 }}>
            {usingGuide && batchGuide!.conservationPlan?.length ? 'Plan por receta' : 'Orientativa'}
          </span>
        </div>

        {conservationEntries.length > 0 ? (
          conservationEntries.map(entry => (
            <ConservationCard key={entry.recipeName} entry={entry} />
          ))
        ) : (
          <div style={{ marginTop: 10, padding: 14, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-2)' }}>
            {[
              ['Proteínas cocinadas', '4–5 días nevera'],
              ['Cereales cocidos',    '4–5 días nevera'],
              ['Verduras salteadas',  '3–4 días nevera'],
              ['Pescado cocinado',    '2–3 días nevera'],
            ].map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
