import { useState } from 'react';
import { ChevronDown, Package, Plus, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function PantrySection() {
  const { pantryItems, addPantryItem, removePantryItem } = useAppStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const name = value.trim();
    if (!name) return;
    addPantryItem(name);
    setValue('');
  };

  return (
    <div style={{
      marginTop: 10,
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
          background: pantryItems.length ? 'rgba(127,203,74,0.12)' : 'var(--cream-2)',
          color: pantryItems.length ? '#5A9A2E' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Package size={15} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-display)' }}>
            En casa · a gastar
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {pantryItems.length === 0
              ? 'Añade lo que quieras aprovechar esta semana'
              : `${pantryItems.length} ingrediente${pantryItems.length === 1 ? '' : 's'} para aprovechar`}
          </div>
        </div>
        {pantryItems.length > 0 && (
          <span className="chip" style={{
            background: 'rgba(127,203,74,0.1)',
            color: '#5A9A2E',
            borderColor: 'rgba(127,203,74,0.25)',
            fontSize: 10.5,
          }}>
            {pantryItems.length}
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
          <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              enterKeyHint="done"
              placeholder="Ej: salsa de soja, pimentón…"
              aria-label="Ingrediente que ya tienes en casa"
              style={{
                flex: 1,
                minHeight: 44,
                padding: '0 12px',
                borderRadius: 11,
                border: '1px solid var(--line)',
                background: 'var(--cream-2)',
                color: 'var(--ink)',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!value.trim()}
              aria-label="Añadir ingrediente"
              style={{
                all: 'unset' as const,
                cursor: value.trim() ? 'pointer' : 'not-allowed',
                width: 44, minHeight: 44,
                borderRadius: 11,
                background: value.trim() ? 'var(--orange)' : 'var(--cream-2)',
                color: value.trim() ? '#fff' : 'var(--muted-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .15s',
              }}
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>
          </div>

          {pantryItems.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {pantryItems.map(item => (
                <span key={item.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '7px 6px 7px 12px',
                  borderRadius: 999,
                  background: 'rgba(127,203,74,0.1)',
                  border: '1px solid rgba(127,203,74,0.25)',
                  color: 'var(--ink)',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}>
                  {item.name}
                  <button
                    onClick={() => removePantryItem(item.id)}
                    aria-label={`Quitar ${item.name}`}
                    style={{
                      all: 'unset' as const,
                      cursor: 'pointer',
                      width: 26, height: 26,
                      borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <X size={13} strokeWidth={2.4} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Salsas, especias o sobras que quieres aprovechar esta semana. La IA intentará usarlas
            en las recetas y se marcarán como <strong>"ya en casa"</strong> en la lista de la compra.
            La lista se mantiene entre semanas: borra lo que ya hayas gastado.
          </p>
        </div>
      )}
    </div>
  );
}
