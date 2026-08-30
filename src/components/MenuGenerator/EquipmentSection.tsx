import { useState } from 'react';
import { Check, ChevronDown, CookingPot, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { APPLIANCES } from '../../utils/equipment';

export function EquipmentSection() {
  const equipmentPrefs = useAppStore(s => s.equipmentPrefs);
  const toggleAppliance = useAppStore(s => s.toggleAppliance);
  const [open, setOpen] = useState(false);

  const excludedCount = equipmentPrefs.excluded.filter(id =>
    APPLIANCES.some(a => a.id === id)
  ).length;

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
          background: excludedCount ? 'rgba(239,68,68,0.1)' : 'var(--cream-2)',
          color: excludedCount ? '#DC2626' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CookingPot size={15} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-display)' }}>
            Equipamiento de cocina
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {excludedCount === 0
              ? 'Todo disponible · toca para excluir aparatos'
              : `${excludedCount} aparato${excludedCount === 1 ? '' : 's'} excluido${excludedCount === 1 ? '' : 's'} de las recetas`}
          </div>
        </div>
        {excludedCount > 0 && (
          <span className="chip" style={{
            background: 'rgba(239,68,68,0.08)',
            color: '#DC2626',
            borderColor: 'rgba(239,68,68,0.25)',
            fontSize: 10.5,
          }}>
            {excludedCount}
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 12 }}>
            {APPLIANCES.map(appliance => {
              const excluded = equipmentPrefs.excluded.includes(appliance.id);
              return (
                <button
                  key={appliance.id}
                  onClick={() => toggleAppliance(appliance.id)}
                  aria-pressed={!excluded}
                  aria-label={excluded
                    ? `${appliance.label}: no disponible, toca para volver a usarlo`
                    : `${appliance.label}: disponible, toca para excluirlo de las recetas`}
                  style={{
                    all: 'unset' as const,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    minHeight: 44,
                    padding: '0 14px',
                    borderRadius: 999,
                    boxSizing: 'border-box' as const,
                    background: excluded ? 'rgba(239,68,68,0.08)' : 'rgba(127,203,74,0.1)',
                    border: '1px solid ' + (excluded ? 'rgba(239,68,68,0.3)' : 'rgba(127,203,74,0.25)'),
                    color: 'var(--ink)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: excluded ? 'line-through' : 'none',
                    opacity: excluded ? 0.75 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {excluded
                    ? <X size={13} strokeWidth={2.6} style={{ color: '#DC2626' }} />
                    : <Check size={13} strokeWidth={2.6} style={{ color: '#5A9A2E' }} />}
                  {appliance.label}
                </button>
              );
            })}
          </div>

          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Excluye lo que no tengas, esté estropeado o no te apetezca usar (¿horno roto?
            no pasa nada). Las próximas generaciones y cambios de receta evitarán esos aparatos
            y adaptarán la técnica a lo disponible — p. ej. <strong>air fryer en vez de horno</strong>.
            Se recuerda entre semanas: vuelve a activarlo cuando lo recuperes.
          </p>
        </div>
      )}
    </div>
  );
}
