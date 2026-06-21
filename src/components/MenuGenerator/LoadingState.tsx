import { Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const STEPS = [
  { l: 'Analizando tus targets',        s: 'Mifflin-St Jeor · 3.290 kcal · L–V' },
  { l: 'Buscando recetas variadas',      s: '+ histórico de 4 semanas' },
  { l: 'Equilibrando macros por comida', s: '5 tomas · ventana anabólica' },
  { l: 'Generando lista de la compra',  s: 'Agrupando ingredientes ×5' },
];

export function LoadingState() {
  const { generationStep: _step, generationProgress } = useAppStore();
  const stepIdx = Math.min(
    Math.floor((generationProgress / 100) * STEPS.length),
    STEPS.length - 1,
  );

  return (
    <div className="fade-in" style={{ padding: '0 18px' }}>
      <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line)' }}>
        {STEPS.map((s, i) => {
          const state = i < stepIdx ? 'done' : i === stepIdx ? 'now' : 'todo';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderTop: i ? '1px dashed var(--line-2)' : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: state === 'done' ? 'var(--orange)' : state === 'now' ? 'rgba(255,107,53,0.12)' : 'var(--line)',
                color: state === 'done' ? '#fff' : 'var(--orange)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {state === 'done' ? (
                  <Check size={12} strokeWidth={3} />
                ) : state === 'now' ? (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'spin .8s linear infinite', display: 'inline-block' }} />
                ) : (
                  <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--muted-2)', display: 'block' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: state === 'todo' ? 'var(--muted)' : 'var(--ink)' }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.s}</div>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 12 }}>
          <div className="bar"><i style={{ width: generationProgress + '%' }} /></div>
          <div style={{ marginTop: 6, textAlign: 'right' as const, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--ff-mono)' }} className="num">
            {generationProgress}%
          </div>
        </div>
      </div>
    </div>
  );
}
