import { useState } from 'react';
import { IngredientItem } from './IngredientItem';
import type { ShoppingCategory, ShoppingCategoryName } from '../../types';

interface CategoryGroupProps {
  category: ShoppingCategory;
  onToggleItem: (categoryName: ShoppingCategoryName, itemName: string) => void;
}

const CATEGORY_META: Record<string, { glyph: string; color: string }> = {
  'Proteínas':            { glyph: '🥩', color: 'var(--cobalt)' },
  'Carbohidratos':        { glyph: '🌾', color: 'var(--lime)' },
  'Verduras y Hortalizas':{ glyph: '🥦', color: 'var(--lime)' },
  'Frutas':               { glyph: '🍌', color: 'var(--orange)' },
  'Lácteos y Huevos':     { glyph: '🥛', color: 'var(--cobalt)' },
  'Grasas y Aceites':     { glyph: '🫒', color: 'var(--amber)' },
  'Otros':                { glyph: '📦', color: 'var(--muted)' },
};

export function CategoryGroup({ category, onToggleItem }: CategoryGroupProps) {
  const [open, setOpen] = useState(true);
  const total = category.items.length;
  const checked = category.items.filter(i => i.purchased).length;
  const meta = CATEGORY_META[category.category] ?? { glyph: '📦', color: 'var(--muted)' };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset' as any, width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {meta.glyph}
        </div>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{category.category}</div>
        </div>
        <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{checked}/{total}</span>
      </button>

      {open && (
        <div style={{ marginTop: 4, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {category.items.map((item, ii) => (
            <IngredientItem
              key={item.name}
              item={item}
              isFirst={ii === 0}
              onToggle={() => onToggleItem(category.category, item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
