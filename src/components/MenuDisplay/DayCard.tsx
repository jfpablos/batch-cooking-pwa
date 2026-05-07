import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MealCard } from './MealCard';
import type { DayMenu, BaseRecipe } from '../../types';

interface DayCardProps {
  dayMenu: DayMenu;
  onRecipeClick: (recipe: BaseRecipe) => void;
  getRecipe: (name: string) => BaseRecipe | undefined;
  defaultExpanded?: boolean;
}

const DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

const MEAL_CONFIG = [
  { key: 'desayuno', label: 'Desayuno', icon: '🍳' },
  { key: 'preEntreno', label: 'Pre-entreno', icon: '⚡' },
  { key: 'principal', label: 'Comida principal', icon: '🍽️' },
  { key: 'postEntreno', label: 'Post-entreno', icon: '💪' },
  { key: 'cena', label: 'Cena', icon: '🌙' },
];

export function DayCard({ dayMenu, onRecipeClick, getRecipe, defaultExpanded = false }: DayCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const total = dayMenu.totalNutrition;

  return (
    <div className="bg-card dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Day header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 touch-manipulation active:bg-gray-50 dark:active:bg-gray-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="font-bold text-primary text-sm">
              {DAY_LABELS[dayMenu.day]?.charAt(0) ?? dayMenu.day.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 dark:text-white">
              {DAY_LABELS[dayMenu.day] ?? dayMenu.day}
            </p>
            <p className="text-xs text-gray-500">
              {total.calories} kcal · {total.protein}g prot · {total.carbs}g carbos
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {/* Meals */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {MEAL_CONFIG.map(({ key, label, icon }) => {
            const meal = dayMenu.meals[key as keyof typeof dayMenu.meals];
            if (!meal) return null;

            return (
              <MealCard
                key={key}
                mealType={key}
                mealLabel={label}
                meal={meal}
                mealIcon={icon}
                onClick={() => {
                  const recipe = getRecipe(meal.recipeName);
                  if (recipe) onRecipeClick(recipe);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
