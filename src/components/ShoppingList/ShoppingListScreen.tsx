import { useState } from 'react';
import { Share2, FileDown, Sparkles } from 'lucide-react';
import { CategoryGroup } from './CategoryGroup';
import { EmptyState } from '../Common/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { shoppingListService } from '../../services/shoppingListService';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import type { ShoppingCategoryName } from '../../types';

export function ShoppingListScreen() {
  const shoppingList = useAppStore(s => s.shoppingList);
  const setShoppingList = useAppStore(s => s.setShoppingList);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const currentMenu = useAppStore(s => s.currentMenu);
  const showToast = useAppStore(s => s.showToast);
  const [copying, setCopying] = useState(false);

  if (!shoppingList) {
    return (
      <EmptyState
        icon="🛒"
        title="Sin lista de compra"
        subtitle="Genera un menú primero para obtener tu lista"
        ctaLabel={<><Sparkles size={18} /> Generar menú</>}
        onCta={() => setActiveTab(0)}
      />
    );
  }

  const completion = shoppingListService.getCompletionPercentage(shoppingList);
  const totalItems = shoppingList.categories.reduce((acc, c) => acc + c.items.length, 0);
  const purchasedItems = shoppingList.categories.reduce((acc, c) => acc + c.items.filter(i => i.purchased).length, 0);

  const handleToggle = (categoryName: ShoppingCategoryName, itemName: string) => {
    const updated = shoppingListService.toggleItem(shoppingList, categoryName, itemName);
    setShoppingList(updated);
    storageService.set(STORAGE_KEYS.SHOPPING_LIST, updated);
  };

  const handleCopy = async () => {
    const text = shoppingListService.getTextSummary(shoppingList);
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch {
      showToast('No se pudo copiar la lista al portapapeles', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ format: 'a4', unit: 'mm' });
      const text = shoppingListService.getTextSummary(shoppingList);
      const lines = text.split('\n');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('BatchFit — Lista de la compra', 15, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let y = 35;
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        if (!line.trim()) { y += 3; continue; }
        if (line.startsWith('📦')) { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); y += 4; }
        else { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); }
        doc.text(line.replace(/[📦✓□]/gu, '').trim(), 15, y);
        y += 6;
      }
      doc.save(`batchfit-compra-semana-${shoppingList.menuId}.pdf`);
    } catch (e) {
      console.error('Error PDF:', e);
      showToast('No se pudo generar el PDF', 'error');
    }
  };

  return (
    <div
      className="h-full overflow-y-auto fade-in"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div style={{ padding: '14px 18px 28px' }}>

        {/* ── Header ── */}
        <div className="eyebrow">Lista · S{currentMenu?.weekNumber ?? ''}</div>
        <div className="display" style={{ fontSize: 26, marginTop: 2 }}>Compra del domingo</div>

        {/* ── Progress card ── */}
        <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="num display-tight" style={{ fontSize: 28 }}>
              {purchasedItems}<span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>/{totalItems}</span>
            </span>
            <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
              {completion}%
            </span>
          </div>
          <div className="bar" style={{ marginTop: 10 }}>
            <i style={{ width: completion + '%' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
            {totalItems - purchasedItems} ítems pendientes
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, minHeight: 44, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer',
              color: copying ? 'var(--orange)' : 'var(--ink)',
            }}
          >
            <Share2 size={15} strokeWidth={1.8} /> {copying ? '¡Copiado!' : 'Compartir'}
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              flex: 1, minHeight: 44, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer',
            }}
          >
            <FileDown size={15} strokeWidth={1.8} /> PDF
          </button>
        </div>

        {/* ── Categories ── */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shoppingList.categories.map(cat => (
            <CategoryGroup
              key={cat.category}
              category={cat}
              onToggleItem={handleToggle}
            />
          ))}
        </div>

        {shoppingList.notes && (
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{shoppingList.notes}</p>
        )}
      </div>
    </div>
  );
}
