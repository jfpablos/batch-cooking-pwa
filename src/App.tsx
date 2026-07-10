import { useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { MenuGeneratorScreen } from './components/MenuGenerator/MenuGeneratorScreen';
import { MenuDisplayScreen } from './components/MenuDisplay/MenuDisplayScreen';
import { ShoppingListScreen } from './components/ShoppingList/ShoppingListScreen';
import { BatchGuideScreen } from './components/BatchCookingGuide/BatchGuideScreen';
import { VideosScreen } from './components/Videos/VideosScreen';
import { HistoryScreen } from './components/History/HistoryScreen';
import { useAppStore } from './store/useAppStore';
import { STORAGE_ERROR_EVENT } from './services/storageService';
import { REMOTE_UPDATE_EVENT } from './services/syncService';

const SCREENS = [
  MenuGeneratorScreen,
  MenuDisplayScreen,
  ShoppingListScreen,
  BatchGuideScreen,
  VideosScreen,
  HistoryScreen,
];

export default function App() {
  const activeTab = useAppStore(s => s.activeTab);
  const ActiveScreen = SCREENS[activeTab] ?? MenuGeneratorScreen;

  // Aviso al usuario si una escritura en localStorage falla (cuota llena):
  // sin esto los datos se ven en pantalla pero se pierden al recargar.
  useEffect(() => {
    const onStorageError = () =>
      useAppStore.getState().showToast('No se pudo guardar: espacio de almacenamiento lleno', 'error');
    // La reconciliación del sync trajo valores más recientes del servidor
    const onRemoteUpdate = (e: Event) => {
      useAppStore.getState().hydrateFromStorage();
      const conflictKeys = (e as CustomEvent<{ conflictKeys?: string[] }>).detail?.conflictKeys;
      if (conflictKeys?.length) {
        useAppStore.getState().showToast(
          'Otro dispositivo modificó tus datos mientras estabas sin conexión: se ha conservado su versión',
          'info'
        );
      }
    };
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    window.addEventListener(REMOTE_UPDATE_EVENT, onRemoteUpdate);
    return () => {
      window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
      window.removeEventListener(REMOTE_UPDATE_EVENT, onRemoteUpdate);
    };
  }, []);

  return (
    <Layout>
      <ActiveScreen />
    </Layout>
  );
}
