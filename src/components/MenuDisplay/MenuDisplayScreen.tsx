import { useState } from 'react';
import { ShoppingCart, Flame, Bot, Database } from 'lucide-react';
import { DayCard } from './DayCard';
import { RecipeDetailModal } from './RecipeDetailModal';
import { Button } from '../Common/Button';
import { useAppStore } from '../../store/useAppStore';
import { menuService } from '../../services/menuService';
import type { BaseRecipe } from '../../types';

export function MenuDisplayScreen() {
  const { currentMenu, setActiveTab } = useAppStore();
  const [selectedRecipe, setSelectedRecipe] = useState<BaseRecipe | null>(null);

  if (!currentMenu) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl">
          📅
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">Sin menú generado</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Ve a "Generar" y crea tu menú semanal
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveTab(0)} icon={<Flame size={18} />}>
          Ir a Generar
        </Button>
      </div>
    );
  }

  const getRecipe = (name: string) => menuService.getRecipeFromMenu(currentMenu, name);

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">

          {/* Header summary */}
          <div className="bg-secondary rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-white/70">Semana {currentMenu.weekNumber} · {currentMenu.year}</p>
                <p className="font-bold text-lg">Tu menú semanal</p>
              </div>
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
                {currentMenu.source === 'gemini' ? (
                  <><Bot size={14} /><span className="text-xs font-medium">IA</span></>
                ) : (
                  <><Database size={14} /><span className="text-xs font-medium">Base</span></>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Kcal/día', value: currentMenu.nutritionSummary.avgDailyCalories },
                { label: 'Proteína', value: `${currentMenu.nutritionSummary.avgDailyProtein}g` },
                { label: 'Carbos', value: `${currentMenu.nutritionSummary.avgDailyCarbs}g` },
                { label: 'Grasa', value: `${currentMenu.nutritionSummary.avgDailyFat}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-white font-bold text-base">{value}</p>
                  <p className="text-white/60 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" size="sm" fullWidth icon={<ShoppingCart size={16} />} onClick={() => setActiveTab(2)}>
              Lista de compra
            </Button>
            <Button variant="ghost" size="sm" fullWidth icon={<Flame size={16} />} onClick={() => setActiveTab(3)}>
              Guía Batch
            </Button>
          </div>

          {/* Days */}
          {currentMenu.days.map((day, i) => (
            <DayCard
              key={day.day}
              dayMenu={day}
              onRecipeClick={setSelectedRecipe}
              getRecipe={getRecipe}
              defaultExpanded={i === 0}
            />
          ))}

          {currentMenu.nutritionSummary.notes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
              💡 {currentMenu.nutritionSummary.notes}
            </div>
          )}
        </div>
      </div>

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </>
  );
}
