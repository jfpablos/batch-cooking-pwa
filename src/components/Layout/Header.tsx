import { Dumbbell } from 'lucide-react';
import { formatWeekLabel, getCurrentWeekAndYear } from '../../utils/dateUtils';

export function Header() {
  const { weekNumber, year } = getCurrentWeekAndYear();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 safe-top"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Dumbbell size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">BatchFit</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {formatWeekLabel(weekNumber, year)}
          </span>
        </div>
      </div>
    </header>
  );
}
