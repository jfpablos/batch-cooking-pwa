import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-95 select-none touch-manipulation';

  const variants = {
    primary: 'bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50',
    secondary: 'bg-secondary text-white shadow-md shadow-secondary/20 hover:bg-secondary-600 active:bg-secondary-700 disabled:opacity-50',
    ghost: 'bg-transparent text-primary border-2 border-primary hover:bg-primary/10 active:bg-primary/20 disabled:opacity-40',
    danger: 'bg-error text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-50',
  };

  const sizes = {
    sm: 'text-sm px-3 min-h-[36px]',
    md: 'text-base px-5 min-h-[44px]',
    lg: 'text-lg px-6 min-h-[52px]',
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
