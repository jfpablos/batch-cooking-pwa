import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Toast } from '../Common/Toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
      <main className="flex-1 content-with-nav overflow-hidden">
        {children}
      </main>
      <BottomNav />
      <Toast />
    </div>
  );
}
