import { useState } from 'react';
import { Copy, FileDown, RotateCcw, ShoppingCart } from 'lucide-react';
import { CategoryGroup } from './CategoryGroup';
import { Button } from '../Common/Button';
import { useAppStore } from '../../store/useAppStore';
import { shoppingListService } from '../../services/shoppingListService';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import type { ShoppingCategoryName } from '../../types';

export function ShoppingListScreen() {
  const { shoppingList, setShoppingList, setActiveTab } = useAppStore();
  const [copying, setCopying] = useState(false);

  if (!shoppingList) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl">
          🛒
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">Sin lista de compra</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Genera un menú primero para obtener tu lista
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveTab(0)} icon={<ShoppingCart size={18} />}>
          Generar menú
        </Button>
      </div>
    );
  }

  const completion = shoppingListService.getCompletionPercentage(shoppingList);

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
      // fallback
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
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        if (line.trim() === '') { y += 3; continue; }
        if (line.startsWith('📦')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          y += 4;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }
        doc.text(line.replace(/[📦✓□]/g, '').trim(), 15, y);
        y += 6;
      }

      doc.save(`batchfit-compra-semana-${shoppingList.menuId}.pdf`);
    } catch (e) {
      console.error('Error exportando PDF:', e);
    }
  };

  const handleReset = () => {
    const reset = {
      ...shoppingList,
      categories: shoppingList.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({ ...item, purchased: false })),
      })),
    };
    setShoppingList(reset);
    storageService.set(STORAGE_KEYS.SHOPPING_LIST, reset);
  };

  const totalItems = shoppingList.categories.reduce((acc, c) => acc + c.items.length, 0);
  const purchasedItems = shoppingList.categories.reduce(
    (acc, c) => acc + c.items.filter(i => i.purchased).length, 0
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">

        {/* Header */}
        <div className="bg-success rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-lg">Lista de la compra</p>
              <p className="text-white/70 text-sm">{purchasedItems}/{totalItems} productos</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{completion}%</p>
              <p className="text-white/70 text-xs">completado</p>
            </div>
          </div>
          {/* Progress */}
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={<Copy size={15} />}
            fullWidth
          >
            {copying ? '¡Copiado!' : 'Copiar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPDF}
            icon={<FileDown size={15} />}
            fullWidth
          >
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw size={15} />}
            fullWidth
          >
            Reiniciar
          </Button>
        </div>

        {/* Categories */}
        {shoppingList.categories.map(cat => (
          <CategoryGroup
            key={cat.category}
            category={cat}
            onToggleItem={handleToggle}
          />
        ))}

        {/* Notes */}
        {shoppingList.notes && (
          <p className="text-xs text-center text-gray-400 px-4">{shoppingList.notes}</p>
        )}
      </div>
    </div>
  );
}
