import { useEffect } from 'react';

/**
 * Comportamiento común de los modales/hojas: bloquea el scroll del fondo
 * mientras están abiertos y permite cerrarlos con Escape.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);
}
