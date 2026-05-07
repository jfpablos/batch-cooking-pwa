import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Toast } from '../Common/Toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-dvh bg-bg dark:bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1 content-with-nav-header overflow-hidden">
        {children}
      </main>
      <BottomNav />
      <Toast />
    </div>
  );
}
