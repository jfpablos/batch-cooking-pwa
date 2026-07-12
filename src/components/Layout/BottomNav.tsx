import { Sparkles, UtensilsCrossed, ShoppingCart, ChefHat, Play, History } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDailyActions } from '../../hooks/useDailyActions';

const TABS = [
  { icon: Sparkles,       label: 'Generar',   tab: 0 },
  { icon: UtensilsCrossed,label: 'Mi menú',   tab: 1 },
  { icon: ShoppingCart,   label: 'Compra',    tab: 2 },
  { icon: ChefHat,        label: 'Batch',     tab: 3 },
  { icon: Play,           label: 'Vídeos',    tab: 4 },
  { icon: History,        label: 'Histórico', tab: 5 },
];

export function BottomNav() {
  const activeTab = useAppStore(s => s.activeTab);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  // Punto en la pestaña Batch si hoy quedan acciones de conservación pendientes
  const { pendingCount } = useDailyActions();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: 'rgba(250,249,247,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div
        className="flex items-stretch justify-between px-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}
      >
        {TABS.map(({ icon: Icon, label, tab }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] touch-manipulation"
              style={{
                all: 'unset',
                flex: 1,
                minHeight: 56,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: active ? 'var(--orange)' : 'var(--muted-2)',
              }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <div
                style={{
                  position: 'relative',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      background: 'rgba(255,107,53,0.12)',
                      borderRadius: 10,
                    }}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.2 : 1.7}
                    stroke={active ? 'var(--orange)' : 'var(--muted-2)'}
                  />
                  {tab === 3 && pendingCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -2, right: -3, width: 7, height: 7,
                      borderRadius: 999, background: 'var(--orange)',
                    }} />
                  )}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 9.5,
                  fontWeight: active ? 700 : 600,
                  letterSpacing: '0.02em',
                  color: active ? 'var(--orange)' : 'var(--muted)',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
