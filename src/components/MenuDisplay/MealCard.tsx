import { ChevronRight } from 'lucide-react';
import type { RecipeMeal } from '../../types';
import { clsx } from 'clsx';

interface MealCardProps {
  mealType: string;
  mealLabel: string;
  meal: RecipeMeal;
  mealIcon: string;
  onClick: () => void;
}

export function MealCard({ mealType: _mealType, mealLabel, meal, mealIcon, onClick }: MealCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
        'active:scale-[0.98] transition-all touch-manipulation text-left'
      )}
    >
      <span className="text-xl flex-shrink-0 w-8 text-center">{mealIcon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{mealLabel}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{meal.recipeName}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {meal.nutrition.calories} kcal · {meal.nutrition.protein}g prot
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  );
}
