import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { syncService } from '../../services/syncService';
import { useAppStore } from '../../store/useAppStore';
import { LoginScreen } from './LoginScreen';

type GateStatus = 'loading' | 'signedOut' | 'syncing' | 'ready';

/**
 * Puerta de autenticación y sincronización:
 *  - Sin Supabase configurado → modo local (comportamiento antiguo, sin login).
 *  - Con Supabase → exige sesión de Google; tras autenticar hace el pull
 *    inicial del estado del servidor y re-hidrata el store antes de mostrar la app.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>(isSupabaseConfigured ? 'loading' : 'ready');
  const syncStarted = useRef(false);
  const hydrateFromStorage = useAppStore(s => s.hydrateFromStorage);

  useEffect(() => {
    if (!supabase) return;

    const startSync = async (userId: string) => {
      if (syncStarted.current) return;
      syncStarted.current = true;
      setStatus('syncing');
      try {
        await syncService.initialSync(userId);
        hydrateFromStorage();
      } catch (e) {
        console.error('[AuthGate] Sincronización inicial falló, seguimos con datos locales:', e);
      }
      setStatus('ready');
    };

    // getSession procesa también el hash de la redirección OAuth
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void startSync(data.session.user.id);
      else setStatus('signedOut');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void startSync(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        syncStarted.current = false;
        syncService.signOut();
        setStatus('signedOut');
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [hydrateFromStorage]);

  if (status === 'signedOut') return <LoginScreen />;

  if (status === 'loading' || status === 'syncing') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--cream)', color: 'var(--ink)' }}
      >
        <div style={{ fontSize: 44 }}>🍱</div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {status === 'syncing' ? 'Sincronizando tus datos…' : 'Cargando…'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
