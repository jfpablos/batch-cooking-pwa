import { create } from 'zustand';
import type { AppState, WeeklyMenu, ShoppingList, BatchCookingGuide, StoredWeek } from '../types';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';

export const useAppStore = create<AppState>((set) => ({
  // Data
  currentMenu: storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU),
  shoppingList: storageService.get<ShoppingList>(STORAGE_KEYS.SHOPPING_LIST),
  batchGuide: storageService.get<BatchCookingGuide>(STORAGE_KEYS.BATCH_GUIDE),
  menuHistory: storageService.get<{ history: StoredWeek[] }>(STORAGE_KEYS.MENU_HISTORY)?.history ?? [],
  youtubeVideos: [],

  // UI
  activeTab: 0,
  isGenerating: false,
  generationStep: '',
  generationProgress: 0,
  error: null,
  toastMessage: null,
  toastType: 'info',

  // Actions
  setCurrentMenu: (menu) => set({ currentMenu: menu }),
  setShoppingList: (list) => set({ shoppingList: list }),
  setBatchGuide: (guide) => set({ batchGuide: guide }),
  setMenuHistory: (history) => set({ menuHistory: history }),
  setYoutubeVideos: (videos) => set({ youtubeVideos: videos }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGenerating: (loading, step = '', progress = 0) =>
    set({ isGenerating: loading, generationStep: step, generationProgress: progress }),
  setError: (error) => set({ error }),
  showToast: (message, type = 'info') =>
    set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),
}));
