import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { syncService } from '../../services/syncService';

/** Muestra la cuenta activa y permite cerrar sesión. Nada en modo local. */
export function AccountFooter() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  if (!isSupabaseConfigured) return null;

  const handleSignOut = async () => {
    if (!supabase) return;
    await syncService.flushPending();
    syncService.signOut();
    await supabase.auth.signOut();
  };

  return (
    <div
      style={{
        marginTop: 24, padding: 14, borderRadius: 16,
        background: 'var(--card)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 10 }}>Cuenta</div>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email ?? '…'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          Datos sincronizados en todos tus dispositivos
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="min-h-[44px]"
        style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, color: 'var(--muted)', padding: '10px 12px',
          background: 'var(--cream-2)', borderRadius: 10, border: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <LogOut size={14} /> Salir
      </button>
    </div>
  );
}
