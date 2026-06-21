import { useState } from 'react';
import { Play, Timer, Check, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const DEFAULT_TASKS = [
  {
    order: 1, phase: 'Mise en place',
    title: 'Lavar y trocear todas las verduras', dur: 15, parallel: null,
    note: 'Brócoli, espárragos, espinacas, cebolla, judías. Reservar en bols.',
  },
  {
    order: 2, phase: 'Mise en place',
    title: 'Pesar y dosificar arroces y cereales', dur: 10, parallel: null,
    note: 'Tener 750 g arroz integral y 1 kg arroz blanco listos para cocer.',
  },
  {
    order: 3, phase: 'Cocción larga',
    title: 'Cocer arroz integral (750 g)', dur: 25, parallel: 4,
    note: 'Olla 1, agua salada. Mientras, avanza con el horno.',
  },
  {
    order: 4, phase: 'Cocción larga',
    title: 'Hornear proteínas + boniatos', dur: 35, parallel: 3,
    note: '200 °C. Bandejas separadas, papel de horno.',
  },
  {
    order: 5, phase: 'Proteínas plancha',
    title: 'Saltear pechugas de pollo', dur: 20, parallel: null,
    note: 'Tandas de 500 g. Salpimentar. Reservar parte para platos con salsa.',
  },
  {
    order: 6, phase: 'Proteínas plancha',
    title: 'Plancha de pavo (600 g)', dur: 14, parallel: null,
    note: 'Fuego alto, 2 min/lado. Reservar para martes y jueves.',
  },
  {
    order: 7, phase: 'Acabado',
    title: 'Hervir huevos (8 ud)', dur: 12, parallel: 8,
    note: '10 min desde ebullición. Pelar bajo agua fría.',
  },
  {
    order: 8, phase: 'Acabado',
    title: 'Cocer arroz blanco (1 kg)', dur: 18, parallel: 7,
    note: 'Para post-entreno y pre-entreno de la semana.',
  },
  {
    order: 9, phase: 'Acabado',
    title: 'Repartir en tuppers', dur: 11, parallel: null,
    note: 'Etiquetar L–V por comida. Salsas en bote aparte.',
  },
];

type Task = typeof DEFAULT_TASKS[number];

const phases = Array.from(new Set(DEFAULT_TASKS.map(t => t.phase)));

export function BatchGuideScreen() {
  const { currentMenu, setActiveTab } = useAppStore();
  const [done, setDone] = useState<Set<number>>(new Set([1]));

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

  const toggle = (n: number) => setDone(prev => {
    const s = new Set(prev);
    s.has(n) ? s.delete(n) : s.add(n);
    return s;
  });

  const totalTasks = DEFAULT_TASKS.length;
  const totalDone = done.size;
  const pct = Math.round(totalDone * 100 / totalTasks);
  const totalMin = DEFAULT_TASKS.reduce((a, t) => a + t.dur, 0);
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
            <button style={{
              flex: 1, height: 44, background: '#fff', color: 'var(--orange-2)',
              border: 'none', borderRadius: 11, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
            }}>
              <Play size={14} fill="currentColor" stroke="none" /> Empezar a cocinar
            </button>
            <button style={{
              width: 44, height: 44, background: 'rgba(255,255,255,0.18)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Timer size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Timeline by phase ── */}
      <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {phases.map((phase, pi) => {
          const tasks: Task[] = DEFAULT_TASKS.filter(t => t.phase === phase);
          return (
            <div key={phase}>
              {/* Phase header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.14em' }}>
                  FASE {pi + 1}
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span className="display" style={{ fontSize: 13 }}>{phase}</span>
              </div>

              {/* Tasks */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 18, top: 8, bottom: 8, width: 2, background: 'var(--line)', borderRadius: 1 }} />
                {tasks.map((t) => {
                  const isDone = done.has(t.order);
                  return (
                    <div key={t.order} style={{ position: 'relative', paddingLeft: 50, paddingBottom: 12 }}>
                      {/* Node */}
                      <div className="num" style={{
                        position: 'absolute', left: 8, top: 6,
                        width: 22, height: 22, borderRadius: 999, zIndex: 1,
                        background: isDone ? 'var(--orange)' : 'var(--card)',
                        border: '2px solid ' + (isDone ? 'var(--orange)' : 'var(--line-2)'),
                        color: isDone ? '#fff' : 'var(--ink)',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isDone ? <Check size={12} strokeWidth={3} /> : t.order}
                      </div>

                      <button
                        onClick={() => toggle(t.order)}
                        style={{
                          all: 'unset' as any, cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const,
                          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
                          padding: '10px 12px', display: 'block',
                          opacity: isDone ? 0.55 : 1,
                        }}
                      >
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
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.4 }}>{t.note}</div>
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
          );
        })}
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
