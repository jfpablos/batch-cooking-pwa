import { Zap, CalendarDays, ShoppingCart, Flame, Youtube, History } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';

const TABS = [
  { icon: Zap, label: 'Generar', tab: 0 },
  { icon: CalendarDays, label: 'Mi Menú', tab: 1 },
  { icon: ShoppingCart, label: 'Compra', tab: 2 },
  { icon: Flame, label: 'Batch', tab: 3 },
  { icon: Youtube, label: 'Vídeos', tab: 4 },
  { icon: History, label: 'Historial', tab: 5 },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 safe-bottom"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around px-1 h-16">
        {TABS.map(({ icon: Icon, label, tab }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] min-w-[44px] rounded-xl transition-all touch-manipulation',
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={22}
                className={clsx(
                  'transition-all',
                  isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'
                )}
              />
              <span
                className={clsx(
                  'text-[10px] font-medium leading-tight',
                  isActive ? 'font-bold' : ''
                )}
              >
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-2 w-1 h-1 bg-primary rounded-full" style={{ position: 'static' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
