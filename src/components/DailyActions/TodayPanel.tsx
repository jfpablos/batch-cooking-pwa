import { Check, Snowflake, Refrigerator, UtensilsCrossed, CalendarX } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDailyActions, type TodayAction } from '../../hooks/useDailyActions';
import { PushToggle } from './PushToggle';

const TYPE_STYLE = {
  thaw:   { icon: Refrigerator, color: '#2563EB', bg: 'rgba(37,99,235,0.08)',  label: 'Esta noche' },
  freeze: { icon: Snowflake,    color: '#0D9488', bg: 'rgba(13,148,166,0.08)', label: 'Hoy' },
} as const;

function ActionRow({ action, onToggle }: { action: TodayAction; onToggle: () => void }) {
  const style = TYPE_STYLE[action.type as keyof typeof TYPE_STYLE];
  if (!style) return null;
  const Icon = style.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
        padding: '9px 10px', borderRadius: 12, minHeight: 44, boxSizing: 'border-box',
        background: action.done ? 'transparent' : style.bg,
        opacity: action.done ? 0.55 : 1,
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
        background: action.done ? style.color : 'var(--card)',
        border: '2px solid ' + style.color,
        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {action.done && <Check size={13} strokeWidth={3} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: style.color,
        }}>
          <Icon size={11} strokeWidth={2.4} /> {style.label}
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.35, marginTop: 2, color: 'var(--ink)',
          textDecoration: action.done ? 'line-through' : 'none',
        }}>
          {action.message}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel "Hoy": qué toca hacer hoy con los platos del batch (descongelar esta
 * noche, congelar el domingo) y qué se come. Encabeza la pestaña Batch.
 */
export function TodayPanel() {
  const currentMenu = useAppStore(s => s.currentMenu);
  const toggleDailyAction = useAppStore(s => s.toggleDailyAction);
  const { todayActions, isMenuCurrent } = useDailyActions();

  if (!currentMenu) return null;

  const dateLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
  const tasks = todayActions.filter(a => a.type === 'thaw' || a.type === 'freeze');
  const eats = todayActions.filter(a => a.type === 'eat');

  return (
    <div style={{ padding: '14px 18px 0' }}>
      <div style={{
        padding: '12px 12px 10px', borderRadius: 16,
        background: 'var(--card)', border: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0 2px' }}>
          <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 11, fontWeight: 700, color: 'var(--orange-2)', letterSpacing: '0.14em' }}>
            HOY
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span className="display" style={{ fontSize: 13, textTransform: 'capitalize' }}>{dateLabel}</span>
        </div>

        {!isMenuCurrent ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 2px 2px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--muted)' }}>
            <CalendarX size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Este menú es de otra semana. Genera el nuevo para ver las tareas del día.</span>
          </div>
        ) : (
          <>
            {tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tasks.map(a => (
                  <ActionRow key={a.id} action={a} onToggle={() => toggleDailyAction(currentMenu.id, a.id)} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '2px 2px 4px', fontSize: 12.5, color: 'var(--muted)' }}>
                <Check size={14} strokeWidth={2.6} style={{ color: '#5A9A2E' }} />
                Nada que hacer con el congelador hoy
              </div>
            )}

            {eats.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line-2)' }}>
                {eats.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '3px 2px', fontSize: 11.5, lineHeight: 1.4, color: 'var(--muted)' }}>
                    <UtensilsCrossed size={11} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <PushToggle />
      </div>
    </div>
  );
}
