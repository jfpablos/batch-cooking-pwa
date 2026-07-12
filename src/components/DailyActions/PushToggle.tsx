import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { pushService, isPushSupported, type PushStatus } from '../../services/pushService';
import { useAppStore } from '../../store/useAppStore';

/**
 * Activa/desactiva los recordatorios Web Push de descongelación (21:00).
 * Oculto si el entorno no soporta push (modo local, sin VAPID, navegador).
 */
export function PushToggle() {
  const showToast = useAppStore(s => s.showToast);
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pushService.getStatus().then(s => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, []);

  if (!isPushSupported() || status === 'loading' || status === 'unsupported') return null;

  const subscribed = status === 'subscribed';
  const denied = status === 'denied';

  const toggle = async () => {
    if (busy || denied) return;
    setBusy(true);
    try {
      if (subscribed) {
        await pushService.unsubscribe();
        setStatus('unsubscribed');
        showToast('Recordatorios desactivados', 'info');
      } else {
        await pushService.subscribe();
        setStatus('subscribed');
        showToast('Recordatorios activados: aviso a las 21:00 si hay que descongelar', 'success');
      }
    } catch (e) {
      setStatus(await pushService.getStatus());
      showToast(e instanceof Error ? e.message : 'No se pudo cambiar el recordatorio', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line-2)' }}>
      <button
        onClick={toggle}
        disabled={busy || denied}
        style={{
          all: 'unset', boxSizing: 'border-box', width: '100%', minHeight: 44,
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px',
          cursor: denied ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        {subscribed
          ? <Bell size={15} strokeWidth={2.2} style={{ color: 'var(--orange)' }} />
          : <BellOff size={15} strokeWidth={2} style={{ color: 'var(--muted)' }} />}
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: subscribed ? 'var(--ink)' : 'var(--muted)' }}>
          Recordatorio de descongelar (21:00)
        </span>
        {/* Interruptor visual */}
        <span style={{
          width: 38, height: 22, borderRadius: 999, flexShrink: 0, position: 'relative',
          background: subscribed ? 'var(--orange)' : 'var(--line-2)',
          transition: 'background .15s',
        }}>
          <span style={{
            position: 'absolute', top: 3, left: subscribed ? 19 : 3,
            width: 16, height: 16, borderRadius: 999, background: '#fff',
            transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }} />
        </span>
      </button>
      {denied && (
        <p style={{ margin: '4px 0 0', fontSize: 11, lineHeight: 1.4, color: 'var(--muted)' }}>
          Las notificaciones están bloqueadas para esta web. Actívalas en los ajustes del
          navegador (Configuración del sitio → Notificaciones) y recarga la app.
        </p>
      )}
    </div>
  );
}
