import { Check, Refrigerator, Snowflake, Tag, Lightbulb } from 'lucide-react';
import type { RecipeAssembly, TupperDestination } from '../../utils/tupperAssembly';
import { formatIngredientAmount } from '../../utils/tupperAssembly';

const DEST_STYLE: Record<TupperDestination, { label: string; color: string; bg: string; Icon: typeof Snowflake }> = {
  nevera:     { label: 'Nevera',     color: '#2563EB', bg: 'rgba(37,99,235,0.08)',  Icon: Refrigerator },
  congelador: { label: 'Congelador', color: '#0284C7', bg: 'rgba(14,165,233,0.12)', Icon: Snowflake },
};

interface Props {
  assembly: RecipeAssembly;
  packed: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], packed: boolean) => void;
}

/**
 * Tarjeta de montaje de una receta: cuántos tupers, qué lleva cada uno,
 * cómo etiquetarlos y a dónde va cada tuper (nevera / congelador).
 */
export function TupperAssemblyCard({ assembly, packed, onToggle, onToggleAll }: Props) {
  const { recipeName, units, perTupper, fridgeCount, freezerCount, notes } = assembly;
  const packedCount = units.filter(u => packed.has(u.id)).length;
  const allPacked = units.length > 0 && packedCount === units.length;

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid ' + (allPacked ? 'rgba(90,154,46,0.4)' : 'var(--line)'),
      borderRadius: 14,
      padding: '12px 14px',
      marginTop: 10,
      opacity: allPacked ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 13.5, lineHeight: 1.25 }}>{recipeName}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
            {fridgeCount > 0 && <DestChip dest="nevera" count={fridgeCount} />}
            {freezerCount > 0 && <DestChip dest="congelador" count={freezerCount} />}
          </div>
        </div>
        <button
          onClick={() => onToggleAll(units.map(u => u.id), !allPacked)}
          aria-label={allPacked ? 'Desmarcar todos los tupers' : 'Marcar todos los tupers como montados'}
          style={{
            all: 'unset' as const, cursor: 'pointer', flexShrink: 0,
            minHeight: 44, padding: '0 10px', borderRadius: 11,
            display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
            background: allPacked ? 'rgba(90,154,46,0.12)' : 'rgba(255,107,53,0.1)',
            color: allPacked ? '#5A9A2E' : 'var(--orange-2)',
          }}
        >
          <span className="num display-tight" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
            {packedCount}<span style={{ fontSize: 11, opacity: 0.7 }}>/{units.length}</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: 2 }}>
            tupers
          </span>
        </button>
      </div>

      {/* Contents per tupper */}
      {perTupper.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
            Cada tuper lleva
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginTop: 6 }}>
            {perTupper.map((ing, i) => (
              <span key={i} className="chip" style={{ fontSize: 11.5, padding: '4px 8px', display: 'inline-flex', gap: 4, alignItems: 'baseline' }}>
                <span className="num" style={{ fontWeight: 700, fontFamily: 'var(--ff-mono)' }}>{formatIngredientAmount(ing)}</span>
                <span>{ing.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* One row per tupper */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
        {units.map(u => {
          const isPacked = packed.has(u.id);
          const dest = DEST_STYLE[u.destination];
          const Icon = dest.Icon;
          return (
            <div
              key={u.id}
              role="checkbox"
              aria-checked={isPacked}
              tabIndex={0}
              onClick={() => onToggle(u.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(u.id); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                minHeight: 44, padding: '6px 8px', borderRadius: 11, boxSizing: 'border-box' as const,
                background: isPacked ? 'transparent' : 'var(--cream-2)',
                opacity: isPacked ? 0.55 : 1,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                background: isPacked ? '#5A9A2E' : 'var(--card)',
                border: '2px solid ' + (isPacked ? '#5A9A2E' : 'var(--line-2)'),
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPacked && <Check size={13} strokeWidth={3} />}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                <Tag size={12} strokeWidth={2.2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span className="num" style={{
                  fontSize: 13, fontWeight: 700, fontFamily: 'var(--ff-display)',
                  textDecoration: isPacked ? 'line-through' : 'none',
                }}>
                  {u.label}
                </span>
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                background: dest.bg, color: dest.color, borderRadius: 999, padding: '3px 8px',
              }}>
                <Icon size={11} strokeWidth={2.4} /> {dest.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      {notes.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line-2)' }}>
          {notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: i ? 4 : 0, fontSize: 11.5, lineHeight: 1.4, color: 'var(--muted)' }}>
              <Lightbulb size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DestChip({ dest, count }: { dest: TupperDestination; count: number }) {
  const s = DEST_STYLE[dest];
  const Icon = s.Icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      background: s.bg, color: s.color, borderRadius: 999, padding: '3px 8px',
    }}>
      <Icon size={11} strokeWidth={2.4} />
      <span className="num">{count}</span> {s.label}
    </span>
  );
}
