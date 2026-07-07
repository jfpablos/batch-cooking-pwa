import { useState } from 'react';
import { ChevronDown, UserRound, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_PROFILE } from '../../utils/constants';
import type { UserProfile } from '../../types';

const FIELDS: { key: keyof UserProfile; label: string; unit: string; step: number; min: number; max: number }[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', step: 0.5, min: 40, max: 200 },
  { key: 'calories', label: 'Calorías', unit: 'kcal/día', step: 10, min: 1200, max: 6000 },
  { key: 'protein', label: 'Proteína', unit: 'g/día', step: 5, min: 50, max: 400 },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g/día', step: 5, min: 50, max: 800 },
  { key: 'fat', label: 'Grasa', unit: 'g/día', step: 5, min: 20, max: 250 },
];

/**
 * Perfil nutricional editable: alimenta el prompt de la IA y los objetivos
 * mostrados en toda la app. Se sincroniza entre dispositivos como el resto
 * del estado.
 */
export function ProfileSection() {
  const profile = useAppStore(s => s.profile);
  const setProfile = useAppStore(s => s.setProfile);
  const showToast = useAppStore(s => s.showToast);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);

  const isDirty = FIELDS.some(f => draft[f.key] !== profile[f.key]);

  const updateField = (key: keyof UserProfile, raw: string) => {
    const value = Number(raw.replace(',', '.'));
    setDraft(d => ({ ...d, [key]: Number.isFinite(value) ? value : d[key] }));
  };

  const handleSave = () => {
    const clamped = { ...draft };
    for (const f of FIELDS) {
      clamped[f.key] = Math.min(f.max, Math.max(f.min, clamped[f.key]));
    }
    setDraft(clamped);
    setProfile(clamped);
    showToast('Perfil guardado — se aplicará en la próxima generación', 'success');
  };

  const handleReset = () => {
    setDraft(DEFAULT_PROFILE);
    setProfile(DEFAULT_PROFILE);
    showToast('Perfil restaurado a los valores por defecto', 'info');
  };

  return (
    <div style={{
      marginTop: 10,
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => { setOpen(o => !o); setDraft(profile); }}
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
          background: 'rgba(0,78,137,0.08)', color: 'var(--cobalt)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <UserRound size={15} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--ff-display)' }}>
            Perfil nutricional
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }} className="num">
            {profile.weightKg.toLocaleString('es-ES')} kg · {profile.calories.toLocaleString('es-ES')} kcal · {profile.protein}P/{profile.carbs}C/{profile.fat}F
          </div>
        </div>
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

      {open && (
        <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12 }}>
            {FIELDS.map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' as const }}>
                  {f.label} <span style={{ textTransform: 'none' as const }}>({f.unit})</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft[f.key]}
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  onChange={e => updateField(f.key, e.target.value)}
                  style={{
                    minHeight: 44,
                    padding: '0 12px',
                    borderRadius: 11,
                    border: '1px solid var(--line)',
                    background: 'var(--cream-2)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    fontFamily: 'var(--ff-display)',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                    width: '100%',
                  }}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              style={{
                flex: 1, minHeight: 44,
                background: isDirty ? 'var(--ink)' : 'var(--cream-2)',
                color: isDirty ? 'var(--cream)' : 'var(--muted-2)',
                border: 'none', borderRadius: 11,
                fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13.5,
                cursor: isDirty ? 'pointer' : 'not-allowed',
              }}
            >
              Guardar perfil
            </button>
            <button
              onClick={handleReset}
              aria-label="Restaurar valores por defecto"
              style={{
                minHeight: 44, padding: '0 14px',
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                fontSize: 12.5, color: 'var(--muted)', fontWeight: 600,
              }}
            >
              <RotateCcw size={13} /> Por defecto
            </button>
          </div>

          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Estos objetivos alimentan a la IA y los indicadores de toda la app. El reparto
            por comida (desayuno, pre/post-entreno…) se escala automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
