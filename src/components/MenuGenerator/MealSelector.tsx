import { useState } from 'react';
import { ChevronDown, Check, Sliders } from 'lucide-react';
import type { DayName, MealKey, MealSelection } from '../../types';
import { countSelected } from '../../utils/prompts';

const DAYS: { key: DayName; short: string }[] = [
  { key: 'lunes',     short: 'L' },
  { key: 'martes',    short: 'M' },
  { key: 'miercoles', short: 'X' },
  { key: 'jueves',    short: 'J' },
  { key: 'viernes',   short: 'V' },
];

const MEALS: { key: MealKey; label: string; short: string; color: string }[] = [
  { key: 'desayuno',    label: 'Desayuno',     short: 'Des',  color: 'var(--amber)' },
  { key: 'preEntreno',  label: 'Pre-entreno',  short: 'Pre',  color: 'var(--lime)' },
  { key: 'principal',   label: 'Principal',    short: 'Pri',  color: 'var(--orange)' },
  { key: 'postEntreno', label: 'Post-entreno', short: 'Post', color: 'var(--teal)' },
  { key: 'cena',        label: 'Cena',         short: 'Cena', color: 'var(--plum)' },
];

const TOTAL_CELLS = DAYS.length * MEALS.length;

interface Props {
  selection: MealSelection;
  onChange: (next: MealSelection) => void;
}

function cloneSelection(s: MealSelection): MealSelection {
  const next = {} as MealSelection;
  for (const d of DAYS) {
    next[d.key] = { ...s[d.key] };
  }
  return next;
}

export function MealSelector({ selection, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = countSelected(selection);
  const allOn = selected === TOTAL_CELLS;
  const isPartial = selected < TOTAL_CELLS;

  const toggleCell = (day: DayName, meal: MealKey) => {
    const next = cloneSelection(selection);
    next[day][meal] = !next[day][meal];
    onChange(next);
  };

  const setAll = (value: boolean) => {
    const next = {} as MealSelection;
    for (const d of DAYS) {
      next[d.key] = MEALS.reduce((acc, m) => {
        acc[m.key] = value;
        return acc;
      }, {} as Record<MealKey, boolean>);
    }
    onChange(next);
  };

  const toggleColumn = (meal: MealKey, value: boolean) => {
    const next = cloneSelection(selection);
    for (const d of DAYS) {
      next[d.key][meal] = value;
    }
    onChange(next);
  };

  const toggleRow = (day: DayName, value: boolean) => {
    const next = cloneSelection(selection);
    for (const m of MEALS) {
      next[day][m.key] = value;
    }
    onChange(next);
  };

  const isColumnAllOn = (meal: MealKey) => DAYS.every(d => selection[d.key]?.[meal]);
  const isRowAllOn = (day: DayName) => MEALS.every(m => selection[day]?.[m.key]);

  return (
    <div style={{
      marginTop: 14,
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset' as const,
          cursor: 'pointer',
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: isPartial ? 'rgba(255,107,53,0.12)' : 'var(--cream-2)',
          color: isPartial ? 'var(--orange-2)' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sliders size={15} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-display)' }}>
            Personalizar selección
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {allOn
              ? 'Toda la semana · 25 comidas'
              : selected === 0
                ? 'Sin comidas seleccionadas'
                : `${selected} de ${TOTAL_CELLS} comidas`}
          </div>
        </div>
        {isPartial && (
          <span className="chip" style={{
            background: 'rgba(255,107,53,0.1)',
            color: 'var(--orange-2)',
            borderColor: 'rgba(255,107,53,0.2)',
            fontSize: 10.5,
          }}>
            Parcial
          </span>
        )}
        <ChevronDown
          size={18}
          style={{
            color: 'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform .2s',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line-2)' }}>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 0' }}>
            <button
              onClick={() => setAll(true)}
              style={{
                all: 'unset' as const,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 999,
                background: allOn ? 'var(--ink)' : 'var(--cream-2)',
                color: allOn ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (allOn ? 'var(--ink)' : 'var(--line)'),
              }}
            >
              Toda la semana
            </button>
            <button
              onClick={() => setAll(false)}
              style={{
                all: 'unset' as const,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'var(--cream-2)',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              Quitar todo
            </button>
            <button
              onClick={() => toggleColumn('cena', false)}
              style={{
                all: 'unset' as const,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'var(--cream-2)',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              Sin cenas
            </button>
            <button
              onClick={() => toggleColumn('preEntreno', false)}
              style={{
                all: 'unset' as const,
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'var(--cream-2)',
                color: 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              Sin pre-entrenos
            </button>
          </div>

          {/* Grid */}
          <div style={{ overflowX: 'auto', margin: '0 -14px', padding: '0 14px' }}>
            <div style={{ display: 'inline-block', minWidth: '100%' }}>
              {/* Header row: meal labels */}
              <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(5, 1fr)', gap: 6, alignItems: 'center' }}>
                <div />
                {MEALS.map(m => {
                  const colOn = isColumnAllOn(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleColumn(m.key, !colOn)}
                      title={`Activar/quitar ${m.label} todos los días`}
                      style={{
                        all: 'unset' as const,
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: '6px 2px',
                        borderRadius: 8,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                        color: m.color,
                        background: colOn ? 'transparent' : 'rgba(0,0,0,0.02)',
                        border: '1px dashed transparent',
                      }}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>

              {/* Day rows */}
              {DAYS.map(d => {
                const rowOn = isRowAllOn(d.key);
                return (
                  <div
                    key={d.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px repeat(5, 1fr)',
                      gap: 6,
                      alignItems: 'center',
                      marginTop: 6,
                    }}
                  >
                    <button
                      onClick={() => toggleRow(d.key, !rowOn)}
                      title={`Activar/quitar todas las comidas del ${d.key}`}
                      style={{
                        all: 'unset' as const,
                        cursor: 'pointer',
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--ff-display)',
                        color: rowOn ? 'var(--ink)' : 'var(--muted)',
                        borderRadius: 8,
                      }}
                    >
                      {d.short}
                    </button>
                    {MEALS.map(m => {
                      const on = !!selection[d.key]?.[m.key];
                      return (
                        <button
                          key={m.key}
                          onClick={() => toggleCell(d.key, m.key)}
                          aria-pressed={on}
                          aria-label={`${d.key} ${m.label}: ${on ? 'incluido' : 'excluido'}`}
                          style={{
                            all: 'unset' as const,
                            cursor: 'pointer',
                            height: 38,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            background: on ? m.color : 'var(--cream-2)',
                            color: on ? '#fff' : 'var(--muted-2)',
                            border: '1px solid ' + (on ? m.color : 'var(--line)'),
                            transition: 'all .12s',
                          }}
                        >
                          {on && <Check size={15} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Las comidas no seleccionadas se marcarán como <strong>"Comer fuera"</strong> en tu menú y no aparecerán en la lista de la compra.
          </p>
        </div>
      )}
    </div>
  );
}
