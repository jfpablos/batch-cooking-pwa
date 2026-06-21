import { Check } from 'lucide-react';
import type { ShoppingItem } from '../../types';

interface IngredientItemProps {
  item: ShoppingItem;
  isFirst: boolean;
  onToggle: () => void;
}

export function IngredientItem({ item, isFirst, onToggle }: IngredientItemProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderTop: isFirst ? 'none' : '1px solid var(--line)',
        opacity: item.purchased ? 0.55 : 1,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          all: 'unset' as any, cursor: 'pointer',
          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
          background: item.purchased ? 'var(--orange)' : 'transparent',
          border: '1.6px solid ' + (item.purchased ? 'var(--orange)' : 'var(--line-2)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {item.purchased && <Check size={14} strokeWidth={3} stroke="#fff" />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600,
          textDecoration: item.purchased ? 'line-through' : 'none',
          color: item.purchased ? 'var(--muted)' : 'var(--ink)',
        }}>
          {item.name}
        </div>
        {item.mealsContaining.length > 0 && !item.purchased && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            en {item.mealsContaining.length} comida{item.mealsContaining.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
        <span className="num" style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 15 }}>
          {Math.round(item.totalAmount)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{item.unit}</span>
      </div>
    </div>
  );
}
