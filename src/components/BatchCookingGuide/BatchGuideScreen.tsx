import { useState, useEffect } from 'react';
import { Play, Timer, Check, Sparkles, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface NormTask {
  order: number;
  title: string;
  note: string;
  dur: number;
  parallel: number | null;
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

export function BatchGuideScreen() {
  const { currentMenu, batchGuide, setActiveTab } = useAppStore();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);

  // Scroll the active task into view when step-by-step mode advances.
  useEffect(() => {
    if (current == null) return;
    document
      .getElementById(`batch-task-${current}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [current]);

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

  // Use the AI-generated guide when it matches the current menu; otherwise fall back.
  const usingGuide = !!batchGuide && batchGuide.menuId === currentMenu.id && batchGuide.tasks.length > 0;
  const tasks: NormTask[] = (usingGuide ? batchGuide!.tasks.map(t => ({
    order: t.order,
    title: t.title,
    note: t.description,
    dur: t.duration,
    parallel: t.parallelWith,
  })) : DEFAULT_TASKS).slice().sort((a, b) => a.order - b.order);

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
    s.has(n) ? s.delete(n) : s.add(n);
    return s;
  });

  const totalTasks = tasks.length;
  const totalDone = done.size;
  const pct = totalTasks ? Math.round(totalDone * 100 / totalTasks) : 0;
  const totalMin = usingGuide ? batchGuide!.estimatedTotalTime : tasks.reduce((a, t) => a + t.dur, 0);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

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
          <span className="display" style={{ fontSize: 13 }}>{usingGuide ? 'Generada por IA' : 'Guía base'}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 18, top: 8, bottom: 8, width: 2, background: 'var(--line)', borderRadius: 1 }} />
          {tasks.map((t) => {
            const isDone = done.has(t.order);
            const isCurrent = cooking && current === t.order;
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

                <button
                  onClick={() => toggle(t.order)}
                  style={{
                    all: 'unset' as any, cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const,
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
                    <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--ff-mono)', flexShrink: 0 }}>
                      <Timer size={12} strokeWidth={2.2} /> {t.dur}m
                    </span>
                  </div>
                  {t.note && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.4 }}>{t.note}</div>}
                  {t.parallel && (
                    <div style={{
                      marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                      background: 'rgba(255,107,53,0.1)', color: 'var(--orange-2)', borderRadius: 999,
                    }}>
                      ⇄ paralelo con tarea {t.parallel}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Storage guide ── */}
      <div style={{ padding: '8px 18px 28px' }}>
        <div style={{ padding: 14, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-2)' }}>
          <div className="eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>Conservación</div>
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
      </div>
    </div>
  );
}
