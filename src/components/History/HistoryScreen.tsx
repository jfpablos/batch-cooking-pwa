import { Trash2, History } from 'lucide-react';
import { Button } from '../Common/Button';
import { useAppStore } from '../../store/useAppStore';
import { useHistoryRotation } from '../../hooks/useHistoryRotation';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { formatDateTime } from '../../utils/dateUtils';

export function HistoryScreen() {
  const { menuHistory, setMenuHistory, setActiveTab } = useAppStore();
  const { clearHistory } = useHistoryRotation();

  const handleClear = () => {
    clearHistory();
    storageService.remove(STORAGE_KEYS.MENU_HISTORY);
    setMenuHistory([]);
  };

  if (menuHistory.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl">
          📊
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">Sin historial</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Los menús generados aparecerán aquí
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveTab(0)}>
          Generar primer menú
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Historial</h2>
            <p className="text-sm text-gray-500">Últimas {menuHistory.length} semanas</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            icon={<Trash2 size={14} />}
            className="text-error border-error/30 hover:bg-error/10"
          >
            Limpiar
          </Button>
        </div>

        {/* Info anti-repetición */}
        <div className="bg-secondary/10 rounded-xl p-3 text-sm text-secondary dark:text-secondary-300 flex gap-2">
          <History size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Sistema anti-repetición activo. Las recetas usadas en estas semanas no se repetirán en el próximo menú.
          </p>
        </div>

        {/* History list */}
        {menuHistory.map((week, i) => (
          <div key={week.menuId} className="bg-card dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-secondary px-2 py-0.5 rounded-full">
                    S{week.weekNumber}
                  </span>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Semana {week.weekNumber} · {week.year}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(week.generatedAt)}</p>
              </div>
              {i === 0 && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Actual
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">
                {week.recipeNames.length} recetas usadas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {week.recipeNames.slice(0, 8).map(name => (
                  <span
                    key={name}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full truncate max-w-[140px]"
                  >
                    {name}
                  </span>
                ))}
                {week.recipeNames.length > 8 && (
                  <span className="text-xs text-gray-400 px-2 py-0.5">
                    +{week.recipeNames.length - 8} más
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
