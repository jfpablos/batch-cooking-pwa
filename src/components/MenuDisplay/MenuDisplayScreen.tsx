import { useState } from 'react';
import { ShoppingCart, RotateCcw, ArrowRight, Sparkles, MapPin, Zap, Check, RefreshCw } from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';
import { EmptyState } from '../Common/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { useMealSwap } from '../../hooks/useMealSwap';
import { menuService } from '../../services/menuService';
import { dayTargetKcal, scaledMealTargets, MEAL_KEYS } from '../../utils/constants';
import type { BaseRecipe, DayMenu, MealKey } from '../../types';

const DAY_LABELS: Record<string, { short: string; label: string; date: string }> = {
  lunes:     { short: 'LUN', label: 'Lunes',     date: '' },
  martes:    { short: 'MAR', label: 'Martes',    date: '' },
  miercoles: { short: 'MIÉ', label: 'Miércoles', date: '' },
  jueves:    { short: 'JUE', label: 'Jueves',    date: '' },
  viernes:   { short: 'VIE', label: 'Viernes',   date: '' },
};

const MEAL_CONFIG = [
  { key: 'desayuno',    label: 'Desayuno',     time: '07:00', stripe: 'desayuno',  color: 'var(--amber)' },
  { key: 'preEntreno',  label: 'Pre-entreno',  time: '11:30', stripe: 'pre',       color: 'var(--lime)' },
  { key: 'principal',   label: 'Principal',    time: '14:00', stripe: 'principal', color: 'var(--orange)' },
  { key: 'postEntreno', label: 'Post-entreno', time: '18:00', stripe: 'post',      color: 'var(--teal)' },
  { key: 'cena',        label: 'Cena',         time: '21:00', stripe: 'cena',      color: 'var(--plum)' },
];

interface MacroChipProps { label: string; value: number | string; color: string }
function MacroChip({ label, value, color }: MacroChipProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        <span className="dot" style={{ background: color }} />{label}
      </span>
      <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2, fontWeight: 600 }}>g</span>
      </span>
    </div>
  );
}

export function MenuDisplayScreen() {
  const currentMenu = useAppStore(s => s.currentMenu);
  const shoppingList = useAppStore(s => s.shoppingList);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const profile = useAppStore(s => s.profile);
  const mealLog = useAppStore(s => s.mealLog);
  const toggleMealDone = useAppStore(s => s.toggleMealDone);
  const { swapMeal, swapping } = useMealSwap();
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<BaseRecipe | null>(null);

  if (!currentMenu) {
    return (
      <EmptyState
        icon="📅"
        title="Sin menú generado"
        subtitle='Ve a "Generar" y crea tu menú semanal'
        ctaLabel={<><Sparkles size={18} /> Ir a Generar</>}
        onCta={() => setActiveTab(0)}
      />
    );
  }

  const day: DayMenu = currentMenu.days[dayIdx];
  const getRecipe = (name: string) => menuService.getRecipeFromMenu(currentMenu, name);
  const dayKeys = currentMenu.days.map(d => d.day);

  // Objetivo kcal del día: solo comidas planificadas, escalado al perfil
  const mealTargets = scaledMealTargets(profile);
  const skippedByMeal = Object.fromEntries(
    Object.entries(day.meals).map(([k, m]) => [k, !!m.isSkipped])
  ) as Record<MealKey, boolean>;
  const targetKcal = dayTargetKcal(skippedByMeal, mealTargets);

  // Adherencia del día (comidas marcadas como hechas)
  const dayLog = mealLog?.menuId === currentMenu.id ? mealLog.done[day.day] ?? {} : {};
  const plannedCount = MEAL_KEYS.filter(k => !day.meals[k].isSkipped).length;
  const doneCount = MEAL_KEYS.filter(k => !day.meals[k].isSkipped && dayLog[k]).length;

  // Punto del carrito solo si quedan ítems por comprar
  const pendingShoppingItems = (shoppingList?.categories ?? [])
    .reduce((acc, c) => acc + c.items.filter(i => !i.purchased && !i.inPantry).length, 0);

  return (
    <>
      <div
        className="h-full overflow-y-auto fade-in"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '14px 18px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="eyebrow">Mi menú · S{currentMenu.weekNumber}</div>
              <div className="display" style={{ fontSize: 26, marginTop: 2 }}>
                {DAY_LABELS[day.day]?.label ?? day.day}
                {' '}
                <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                  {currentMenu.source === 'gemini' ? '· IA' : '· Base'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(2)}
              style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--line)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0,
              }}
              title="Lista de compra"
            >
              <ShoppingCart size={18} style={{ color: 'var(--ink)' }} />
              {pendingShoppingItems > 0 && (
                <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 999, background: 'var(--orange)' }} />
              )}
            </button>
          </div>
        </div>

        {/* ── Day selector ── */}
        <div style={{ padding: '6px 18px 12px', display: 'flex', gap: 8 }}>
          {dayKeys.map((key, i) => {
            const active = i === dayIdx;
            const info = DAY_LABELS[key];
            return (
              <button
                key={key}
                onClick={() => setDayIdx(i)}
                style={{
                  all: 'unset' as const,
                  flex: 1, minWidth: 0, height: 56, borderRadius: 14, cursor: 'pointer',
                  background: active ? 'var(--ink)' : 'var(--card)',
                  color: active ? 'var(--cream)' : 'var(--ink)',
                  border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'),
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  fontFamily: 'var(--ff-display)', transition: 'all .15s',
                  boxSizing: 'border-box' as const,
                }}
              >
                <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, opacity: 0.65, fontFamily: 'var(--ff-display)' }}>{info?.short ?? key.slice(0,3).toUpperCase()}</span>
                <span className="num" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* ── Day totals ── */}
        <div style={{ margin: '0 18px 12px', padding: 14, borderRadius: 16, background: 'linear-gradient(180deg, var(--cream-2), #EDE9DF)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ fontSize: 10 }}>Día {dayIdx + 1} · objetivo</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="num display-tight" style={{ fontSize: 30 }}>{day.totalNutrition.calories.toLocaleString('es-ES')}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>kcal</span>
              </div>
              {plannedCount > 0 && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: doneCount === plannedCount ? '#5A9A2E' : 'var(--muted)' }}>
                  <Check size={12} strokeWidth={2.6} />
                  <span className="num">{doneCount}/{plannedCount}</span> comidas hechas
                </div>
              )}
            </div>
            {/* progress ring */}
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--line)" strokeWidth="5"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--orange)" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="138.2"
                  strokeDashoffset={138.2 * (1 - Math.min(day.totalNutrition.calories / targetKcal, 1))}
                  transform="rotate(-90 28 28)"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--ff-display)', fontSize: 13, fontWeight: 700 }} className="num">
                {Math.round(day.totalNutrition.calories / targetKcal * 100)}%
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
            <MacroChip label="Proteína" value={day.totalNutrition.protein} color="var(--cobalt)" />
            <MacroChip label="Carbos"   value={day.totalNutrition.carbs}   color="var(--lime)" />
            <MacroChip label="Grasa"    value={day.totalNutrition.fat}     color="var(--amber)" />
          </div>
        </div>

        {/* ── Meal cards ── */}
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MEAL_CONFIG.map(({ key, label, time, stripe, color }) => {
            const meal = day.meals[key as keyof typeof day.meals];
            if (!meal) return null;

            if (meal.isSkipped) {
              return (
                <div
                  key={key}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    background: 'var(--cream-2)',
                    border: '1px dashed var(--line)',
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'stretch',
                    overflow: 'hidden',
                    opacity: 0.85,
                  }}
                >
                  <div style={{ flex: 1, padding: '14px 14px 14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--muted-2)', textTransform: 'uppercase' as const }}>{label}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>·</span>
                        <span className="num" style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 600 }}>{time}</span>
                      </div>
                      <div className="display" style={{
                        fontSize: 15, marginTop: 3, letterSpacing: '-0.01em', lineHeight: 1.25,
                        color: 'var(--muted)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <MapPin size={14} strokeWidth={2} style={{ color: 'var(--muted-2)' }} />
                        Comer fuera
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted-2)' }}>
                        Sin compra ni preparación
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const recipe = getRecipe(meal.recipeName);
            const isFresh = !!recipe && menuService.isFreshRecipe(recipe);
            const mealKey = key as MealKey;
            const isDone = !!dayLog[mealKey];
            const isSwapping = swapping?.day === day.day && swapping?.meal === mealKey;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (recipe) setSelectedRecipe(recipe);
                }}
                onKeyDown={e => {
                  // Solo la tarjeta en sí: el keydown de los botones internos
                  // (hecho/cambiar) burbujea hasta aquí y no debe abrir la ficha
                  if (e.target !== e.currentTarget) return;
                  if ((e.key === 'Enter' || e.key === ' ') && recipe) {
                    e.preventDefault();
                    setSelectedRecipe(recipe);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'stretch',
                  overflow: 'hidden',
                  opacity: isDone ? 0.6 : 1,
                  transition: 'opacity .2s',
                }}
              >
                <div className={`stripe stripe-${stripe}`} />
                <div style={{ flex: 1, padding: '14px 14px 14px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color, textTransform: 'uppercase' as const }}>{label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>·</span>
                      <span className="num" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{time}</span>
                      {isFresh && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                          background: 'rgba(20,184,166,0.12)', color: '#0D9488',
                          borderRadius: 999, padding: '2px 7px',
                        }}>
                          <Zap size={9} strokeWidth={2.6} fill="currentColor" />
                          al momento{recipe ? ` · ${recipe.prepTime + recipe.cookTime} min` : ''}
                        </span>
                      )}
                    </div>
                    <div className="display" style={{
                      fontSize: 15.5, marginTop: 3, letterSpacing: '-0.01em', lineHeight: 1.25,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {meal.recipeName}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11.5, color: 'var(--muted)' }}>
                      <span className="num"><b style={{ color: 'var(--ink-2)', fontWeight: 700 }}>{meal.nutrition.calories}</b> kcal</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span className="dot" style={{ background: 'var(--cobalt)' }}/><span className="num">{meal.nutrition.protein}</span>P
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span className="dot" style={{ background: 'var(--lime)' }}/><span className="num">{meal.nutrition.carbs}</span>C
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span className="dot" style={{ background: 'var(--amber)' }}/><span className="num">{meal.nutrition.fat}</span>F
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    {/* Área táctil de 44px (CLAUDE.md) con el círculo visual de 30px dentro */}
                    <button
                      aria-label={isDone ? 'Desmarcar comida hecha' : 'Marcar comida como hecha'}
                      aria-pressed={isDone}
                      onClick={e => { e.stopPropagation(); toggleMealDone(currentMenu.id, day.day, mealKey); }}
                      style={{
                        all: 'unset' as const, cursor: 'pointer',
                        width: 44, height: 44,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxSizing: 'border-box' as const,
                      }}
                    >
                      <span style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: isDone ? '#5A9A2E' : 'var(--cream-2)',
                        border: '1px solid ' + (isDone ? '#5A9A2E' : 'var(--line)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxSizing: 'border-box' as const,
                      }}>
                        <Check size={14} strokeWidth={2.6} style={{ color: isDone ? '#fff' : 'var(--muted-2)' }} />
                      </span>
                    </button>
                    <button
                      aria-label="Cambiar esta comida por otra receta"
                      disabled={!!swapping}
                      onClick={e => { e.stopPropagation(); void swapMeal(day.day, mealKey); }}
                      style={{
                        all: 'unset' as const, cursor: swapping ? 'wait' : 'pointer',
                        width: 44, height: 44,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxSizing: 'border-box' as const,
                        opacity: swapping && !isSwapping ? 0.4 : 1,
                      }}
                    >
                      <span style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: 'var(--cream-2)', border: '1px solid var(--line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxSizing: 'border-box' as const,
                      }}>
                        <RefreshCw
                          size={13}
                          strokeWidth={2.2}
                          style={{
                            color: 'var(--muted)',
                            animation: isSwapping ? 'spin 0.8s linear infinite' : undefined,
                          }}
                        />
                      </span>
                    </button>
                    <ArrowRight size={14} style={{ color: 'var(--muted-2)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer actions ── */}
        <div style={{ padding: '20px 18px 8px', display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab(2)}
            style={{
              flex: 1, minHeight: 48, background: 'var(--ink)', color: 'var(--cream)',
              border: 'none', borderRadius: 12, fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <ShoppingCart size={16} strokeWidth={2} /> Lista de compra
          </button>
          <button
            onClick={() => setActiveTab(0)}
            style={{
              minHeight: 48, padding: '0 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <RotateCcw size={16} strokeWidth={1.8} style={{ color: 'var(--ink)' }} />
          </button>
        </div>
      </div>

      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </>
  );
}
