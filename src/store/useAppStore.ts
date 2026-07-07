import { create } from 'zustand';
import type { AppState, WeeklyMenu, ShoppingList, BatchCookingGuide, StoredWeek, PantryItem } from '../types';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { normalizeText } from '../utils/textUtils';

export const useAppStore = create<AppState>((set, get) => ({
  // Data
  currentMenu: storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU),
  shoppingList: storageService.get<ShoppingList>(STORAGE_KEYS.SHOPPING_LIST),
  batchGuide: storageService.get<BatchCookingGuide>(STORAGE_KEYS.BATCH_GUIDE),
  menuHistory: storageService.get<{ history: StoredWeek[] }>(STORAGE_KEYS.MENU_HISTORY)?.history ?? [],
  youtubeVideos: [],
  pantryItems: storageService.get<PantryItem[]>(STORAGE_KEYS.PANTRY) ?? [],
  activeTimer: null,

  // UI
  activeTab: 0,
  isGenerating: false,
  generationStep: '',
  generationProgress: 0,
  error: null,
  toastMessage: null,
  toastType: 'info',

  // Actions
  // Recarga desde localStorage los datos que se inicializan al crear el store.
  // Se llama tras el pull inicial de Supabase (los datos del servidor acaban
  // de sobreescribir localStorage) para que la UI los refleje.
  hydrateFromStorage: () =>
    set({
      currentMenu: storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU),
      shoppingList: storageService.get<ShoppingList>(STORAGE_KEYS.SHOPPING_LIST),
      batchGuide: storageService.get<BatchCookingGuide>(STORAGE_KEYS.BATCH_GUIDE),
      menuHistory: storageService.get<{ history: StoredWeek[] }>(STORAGE_KEYS.MENU_HISTORY)?.history ?? [],
      pantryItems: storageService.get<PantryItem[]>(STORAGE_KEYS.PANTRY) ?? [],
    }),
  setCurrentMenu: (menu) => set({ currentMenu: menu }),
  setShoppingList: (list) => set({ shoppingList: list }),
  setBatchGuide: (guide) => set({ batchGuide: guide }),
  setMenuHistory: (history) => set({ menuHistory: history }),
  setYoutubeVideos: (videos) => set({ youtubeVideos: videos }),
  addPantryItem: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const items = get().pantryItems;
    const normalized = normalizeText(trimmed);
    if (items.some(p => normalizeText(p.name) === normalized)) return;
    const updated = [...items, { id: crypto.randomUUID(), name: trimmed, addedAt: new Date().toISOString() }];
    storageService.set(STORAGE_KEYS.PANTRY, updated);
    set({ pantryItems: updated });
  },
  removePantryItem: (id) => {
    const updated = get().pantryItems.filter(p => p.id !== id);
    storageService.set(STORAGE_KEYS.PANTRY, updated);
    set({ pantryItems: updated });
  },
  startTimer: (taskOrder, seconds) =>
    set({
      activeTimer: {
        taskOrder,
        totalSeconds: seconds,
        endsAt: Date.now() + seconds * 1000,
        remainingAtPause: seconds,
        status: 'running',
      },
    }),
  pauseTimer: () => {
    const timer = get().activeTimer;
    if (!timer || timer.status !== 'running' || timer.endsAt === null) return;
    const remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
    set({ activeTimer: { ...timer, endsAt: null, remainingAtPause: remaining, status: 'paused' } });
  },
  resumeTimer: () => {
    const timer = get().activeTimer;
    if (!timer || timer.status !== 'paused') return;
    set({
      activeTimer: {
        ...timer,
        endsAt: Date.now() + timer.remainingAtPause * 1000,
        status: 'running',
      },
    });
  },
  resetTimer: () => set({ activeTimer: null }),
  finishTimer: () => {
    const timer = get().activeTimer;
    if (!timer) return;
    set({ activeTimer: { ...timer, endsAt: null, remainingAtPause: 0, status: 'finished' } });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGenerating: (loading, step = '', progress = 0) =>
    set({ isGenerating: loading, generationStep: step, generationProgress: progress }),
  setError: (error) => set({ error }),
  showToast: (message, type = 'info') =>
    set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),
}));
