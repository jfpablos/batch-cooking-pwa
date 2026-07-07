import { Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useHistoryRotation } from '../../hooks/useHistoryRotation';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { formatDateTime } from '../../utils/dateUtils';
import { AccountFooter } from '../Auth/AccountFooter';

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(245,243,238,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        <span className="dot" style={{ background: color }} />{label}
      </span>
      <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 10, color: 'rgba(245,243,238,0.5)', marginLeft: 2, fontWeight: 600 }}>g</span>
      </span>
    </div>
  );
}

export function HistoryScreen() {
  const { menuHistory, setMenuHistory, setActiveTab } = useAppStore();
  const { clearHistory } = useHistoryRotation();

  const handleClear = () => {
    clearHistory();
    storageService.remove(STORAGE_KEYS.MENU_HISTORY);
    setMenuHistory([]);
  };

  if (menuHistory.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 text-center gap-5"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
          📊
        </div>
        <div>
          <p className="display" style={{ fontSize: 22 }}>Sin historial</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Los menús generados aparecerán aquí</p>
        </div>
        <button
          onClick={() => setActiveTab(0)}
          style={{
            minHeight: 48, padding: '0 24px', background: 'var(--ink)', color: 'var(--cream)',
            border: 'none', borderRadius: 12, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Generar primer menú
        </button>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <AccountFooter />
        </div>
      </div>
    );
  }

  // Use first (most recent) week's recipe count as proxy
  const totalRecipes = menuHistory.reduce((s, w) => s + w.recipeNames.length, 0);

  return (
    <div
      className="h-full overflow-y-auto fade-in"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div style={{ padding: '14px 18px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">Historial</div>
            <div className="display" style={{ fontSize: 26, marginTop: 2 }}>Últimas {menuHistory.length} semanas</div>
          </div>
          <button
            onClick={handleClear}
            style={{
              all: 'unset' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: '#EF4444', padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <Trash2 size={14} /> Limpiar
          </button>
        </div>

        {/* ── Aggregate hero ── */}
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 18,
          background: 'var(--ink)', color: 'var(--cream)', position: 'relative', overflow: 'hidden',
        }}>
          <div className="grain" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ color: 'rgba(245,243,238,0.5)' }}>Anti-repetición activo</div>
              <div className="num display-tight" style={{ fontSize: 38, marginTop: 6 }}>
                {totalRecipes}<span style={{ fontSize: 14, opacity: 0.6, marginLeft: 4, fontWeight: 600 }}>recetas</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div className="eyebrow" style={{ color: 'rgba(245,243,238,0.5)' }}>Vetadas</div>
              <div className="num display-tight" style={{ fontSize: 22, marginTop: 6, color: 'var(--orange)' }}>
                {menuHistory.length} sem.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 14 }}>
            <MacroChip label="Semanas" value={menuHistory.length} color="var(--cobalt)" />
            <MacroChip label="Total recetas" value={totalRecipes} color="var(--lime)" />
            <MacroChip label="Por semana" value={Math.round(totalRecipes / menuHistory.length)} color="var(--amber)" />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(245,243,238,0.5)', lineHeight: 1.5 }}>
            Las recetas usadas en estas semanas no se repetirán en el próximo menú generado.
          </div>
        </div>

        {/* ── Week cards ── */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {menuHistory.map((w, i) => (
            <div key={w.menuId} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="eyebrow" style={{ color: 'var(--orange)', fontSize: 11 }}>SEMANA</span>
                    <span className="num display-tight" style={{ fontSize: 28 }}>{w.weekNumber}</span>
                    {i === 0 && (
                      <span className="chip" style={{ fontSize: 9, padding: '3px 7px' }}>Actual</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {formatDateTime(w.generatedAt)} · {w.year} · <span className="num">{w.recipeNames.length}</span> recetas
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em' }}>
                  RECETAS USADAS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {w.recipeNames.slice(0, 8).map(name => (
                    <span
                      key={name}
                      style={{
                        fontSize: 11.5, background: 'var(--cream-2)', color: 'var(--ink-2)',
                        padding: '3px 9px', borderRadius: 999, border: '1px solid var(--line)',
                        maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        fontWeight: 500,
                      }}
                    >
                      {name}
                    </span>
                  ))}
                  {w.recipeNames.length > 8 && (
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', padding: '3px 9px' }}>
                      +{w.recipeNames.length - 8} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <AccountFooter />
      </div>
    </div>
  );
}
