import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  iconBackground?: string;
  title: string;
  subtitle: ReactNode;
  ctaLabel?: ReactNode;
  onCta?: () => void;
  ctaBackground?: string;
  ctaColor?: string;
  children?: ReactNode;
}

/** Estado vacío estándar de las pantallas (emoji + título + CTA opcional). */
export function EmptyState({
  icon,
  iconBackground = 'var(--cream-2)',
  title,
  subtitle,
  ctaLabel,
  onCta,
  ctaBackground = 'var(--orange)',
  ctaColor = '#fff',
  children,
}: EmptyStateProps) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center p-8 text-center gap-5"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div style={{ width: 64, height: 64, borderRadius: 20, background: iconBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
        {icon}
      </div>
      <div>
        <p className="display" style={{ fontSize: 22 }}>{title}</p>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, maxWidth: 300 }}>{subtitle}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{
            minHeight: 48, padding: '0 24px', background: ctaBackground, color: ctaColor,
            border: 'none', borderRadius: 12, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      )}
      {children}
    </div>
  );
}
