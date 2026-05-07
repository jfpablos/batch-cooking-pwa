import { clsx } from 'clsx';
import type { ShoppingItem } from '../../types';

interface IngredientItemProps {
  item: ShoppingItem;
  onToggle: () => void;
}

export function IngredientItem({ item, onToggle }: IngredientItemProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-3 px-1 active:bg-gray-50 dark:active:bg-gray-800 rounded-lg touch-manipulation text-left"
    >
      {/* Checkbox */}
      <div className={clsx(
        'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
        item.purchased
          ? 'bg-success border-success'
          : 'border-gray-300 dark:border-gray-600'
      )}>
        {item.purchased && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={clsx(
          'text-sm text-gray-800 dark:text-gray-200',
          item.purchased && 'line-through text-gray-400 dark:text-gray-600'
        )}>
          {item.name}
        </span>
        {item.mealsContaining.length > 0 && !item.purchased && (
          <p className="text-xs text-gray-400 truncate">
            {item.mealsContaining.slice(0, 2).join(', ')}
            {item.mealsContaining.length > 2 && ` +${item.mealsContaining.length - 2}`}
          </p>
        )}
      </div>

      {/* Amount */}
      <span className={clsx(
        'text-sm font-bold flex-shrink-0',
        item.purchased ? 'text-gray-400' : 'text-gray-900 dark:text-white'
      )}>
        {Math.round(item.totalAmount)}{item.unit}
      </span>
    </button>
  );
}
