import { useEffect } from 'react';

// Pila de modales abiertos: con modales apilados (vídeo sobre ficha de
// receta) Escape debe cerrar solo el de arriba, no todos a la vez.
const dismissStack: Array<() => void> = [];

/**
 * Comportamiento común de los modales/hojas: bloquea el scroll del fondo
 * mientras están abiertos y permite cerrarlos con Escape (solo el modal
 * superior de la pila responde).
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    dismissStack.push(onClose);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissStack[dismissStack.length - 1] === onClose) onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      const idx = dismissStack.lastIndexOf(onClose);
      if (idx !== -1) dismissStack.splice(idx, 1);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);
}
