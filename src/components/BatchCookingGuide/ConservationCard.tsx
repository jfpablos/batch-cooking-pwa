import type { ReactNode } from 'react';
import { Refrigerator, Snowflake, Flame, Package, ArrowDownToLine } from 'lucide-react';
import type { ConservationEntry } from '../../types';

const METHOD_STYLE = {
  nevera:     { label: 'Nevera',     bg: 'rgba(59,130,246,0.1)',  color: '#2563EB' },
  congelador: { label: 'Congelador', bg: 'rgba(14,165,233,0.12)', color: '#0284C7' },
  mixto:      { label: 'Mixto',      bg: 'rgba(139,92,246,0.1)',  color: '#7C3AED' },
} as const;

const DAY_SHORT: Record<string, string> = {
  lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V',
};

interface Row {
  icon: ReactNode;
  label: string;
  text: string;
}

export function ConservationCard({ entry }: { entry: ConservationEntry }) {
  const method = METHOD_STYLE[entry.method] ?? METHOD_STYLE.nevera;

  const candidates: (Row | '' | undefined)[] = [
    entry.portions && {
      icon: <Package size={13} strokeWidth={2} />,
      label: 'Raciones',
      text: entry.portions,
    },
    entry.container && {
      icon: <ArrowDownToLine size={13} strokeWidth={2} />,
      label: 'Envase',
      text: entry.container,
    },
    entry.freezeInstructions && {
      icon: <Snowflake size={13} strokeWidth={2} />,
      label: 'Congelar',
      text: entry.freezeInstructions,
    },
    entry.thawInstructions && {
      icon: <Refrigerator size={13} strokeWidth={2} />,
      label: 'Descongelar',
      text: entry.thawInstructions,
    },
    entry.reheatInstructions && {
      icon: <Flame size={13} strokeWidth={2} />,
      label: 'Recalentar',
      text: entry.reheatInstructions,
    },
  ];
  const rows = candidates.filter((r): r is Row => Boolean(r));

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: '12px 14px',
      marginTop: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="display" style={{ fontSize: 13.5, flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          {entry.recipeName}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          background: method.bg, color: method.color,
          borderRadius: 999, padding: '3px 9px', flexShrink: 0,
        }}>
          {entry.method === 'congelador' ? <Snowflake size={11} strokeWidth={2.4} /> : <Refrigerator size={11} strokeWidth={2.4} />}
          {method.label}
          {entry.method !== 'congelador' && entry.fridgeDays > 0 && ` · ${entry.fridgeDays}d`}
        </span>
      </div>

      {/* Target days */}
      {entry.targetDays.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {entry.targetDays.map(d => (
            <span key={d} className="num" style={{
              width: 22, height: 22, borderRadius: 7,
              background: 'var(--cream-2)', border: '1px solid var(--line)',
              color: 'var(--ink-2)', fontSize: 10.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {DAY_SHORT[d.toLowerCase()] ?? d.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ marginTop: 6 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '7px 0',
            borderTop: i ? '1px dashed var(--line-2)' : 'none',
          }}>
            <span style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>{row.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
                {row.label}
              </span>
              <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 1, color: 'var(--ink-2)' }}>{row.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
