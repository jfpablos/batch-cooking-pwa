import { type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  clickable?: boolean;
}

export function Card({ children, padding = 'md', clickable = false, className, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={clsx(
        'bg-card rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800',
        paddings[padding],
        clickable && 'cursor-pointer active:scale-[0.98] transition-transform touch-manipulation',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
