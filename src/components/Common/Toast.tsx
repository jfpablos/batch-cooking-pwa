import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';

export function Toast() {
  const { toastMessage, toastType, clearToast } = useAppStore();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(clearToast, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle size={20} className="text-success flex-shrink-0" />,
    error: <XCircle size={20} className="text-error flex-shrink-0" />,
    info: <Info size={20} className="text-secondary flex-shrink-0" />,
  };

  const styles = {
    success: 'border-success/30 bg-success/10',
    error: 'border-error/30 bg-error/10',
    info: 'border-secondary/30 bg-secondary/10',
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none"
      style={{ top: 'calc(var(--safe-area-top) + 16px)' }}>
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg pointer-events-auto',
          'bg-white dark:bg-gray-900 max-w-sm w-full',
          styles[toastType]
        )}
        style={{ animation: 'toastIn 0.3s ease-out' }}
      >
        {icons[toastType]}
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{toastMessage}</p>
        <button onClick={clearToast} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={16} />
        </button>
      </div>
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
