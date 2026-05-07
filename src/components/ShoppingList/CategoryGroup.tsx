import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IngredientItem } from './IngredientItem';
import type { ShoppingCategory, ShoppingCategoryName } from '../../types';
import { clsx } from 'clsx';

interface CategoryGroupProps {
  category: ShoppingCategory;
  onToggleItem: (categoryName: ShoppingCategoryName, itemName: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Proteínas': '🥩',
  'Carbohidratos': '🌾',
  'Verduras y Hortalizas': '🥦',
  'Frutas': '🍌',
  'Lácteos y Huevos': '🥛',
  'Grasas y Aceites': '🫒',
  'Otros': '🛒',
};

export function CategoryGroup({ category, onToggleItem }: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const totalItems = category.items.length;
  const purchasedItems = category.items.filter(i => i.purchased).length;
  const allDone = totalItems === purchasedItems;

  return (
    <div className="bg-card dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 touch-manipulation"
      >
        <span className="text-xl">{CATEGORY_ICONS[category.category] ?? '📦'}</span>
        <div className="flex-1 text-left">
          <p className={clsx(
            'font-bold text-sm',
            allDone ? 'text-success' : 'text-gray-800 dark:text-white'
          )}>
            {category.category}
          </p>
          <p className="text-xs text-gray-400">{purchasedItems}/{totalItems} productos</p>
        </div>

        {/* Progress mini */}
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
              ✓ Listo
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-2 divide-y divide-gray-50 dark:divide-gray-800">
          {category.items.map(item => (
            <IngredientItem
              key={item.name}
              item={item}
              onToggle={() => onToggleItem(category.category, item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
