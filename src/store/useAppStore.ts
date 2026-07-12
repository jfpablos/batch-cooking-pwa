import { create } from 'zustand';
import type { AppState, WeeklyMenu, ShoppingList, BatchCookingGuide, StoredWeek, PantryItem, UserProfile, RecipePrefs, MealLog, DailyActionsDone } from '../types';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { normalizeText } from '../utils/textUtils';
import { DEFAULT_PROFILE } from '../utils/constants';

function loadProfile(): UserProfile {
  return { ...DEFAULT_PROFILE, ...storageService.get<Partial<UserProfile>>(STORAGE_KEYS.PROFILE) };
}

function loadPrefs(): RecipePrefs {
  return { favorites: [], banned: [], ...storageService.get<Partial<RecipePrefs>>(STORAGE_KEYS.RECIPE_PREFS) };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Data
  currentMenu: storageService.get<WeeklyMenu>(STORAGE_KEYS.CURRENT_MENU),
  shoppingList: storageService.get<ShoppingList>(STORAGE_KEYS.SHOPPING_LIST),
  batchGuide: storageService.get<BatchCookingGuide>(STORAGE_KEYS.BATCH_GUIDE),
  menuHistory: storageService.get<{ history: StoredWeek[] }>(STORAGE_KEYS.MENU_HISTORY)?.history ?? [],
  youtubeVideos: [],
  pantryItems: storageService.get<PantryItem[]>(STORAGE_KEYS.PANTRY) ?? [],
  activeTimer: null,
  profile: loadProfile(),
  recipePrefs: loadPrefs(),
  mealLog: storageService.get<MealLog>(STORAGE_KEYS.MEAL_LOG),
  dailyActionsDone: storageService.get<DailyActionsDone>(STORAGE_KEYS.DAILY_ACTIONS),

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
      profile: loadProfile(),
      recipePrefs: loadPrefs(),
      mealLog: storageService.get<MealLog>(STORAGE_KEYS.MEAL_LOG),
      dailyActionsDone: storageService.get<DailyActionsDone>(STORAGE_KEYS.DAILY_ACTIONS),
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
  setProfile: (profile) => {
    storageService.set(STORAGE_KEYS.PROFILE, profile);
    set({ profile });
  },
  toggleFavorite: (recipeName) => {
    const prefs = get().recipePrefs;
    const isFav = prefs.favorites.includes(recipeName);
    const updated: RecipePrefs = {
      favorites: isFav ? prefs.favorites.filter(n => n !== recipeName) : [...prefs.favorites, recipeName],
      // Una receta no puede ser favorita y vetada a la vez
      banned: prefs.banned.filter(n => n !== recipeName),
    };
    storageService.set(STORAGE_KEYS.RECIPE_PREFS, updated);
    set({ recipePrefs: updated });
  },
  toggleBanned: (recipeName) => {
    const prefs = get().recipePrefs;
    const isBanned = prefs.banned.includes(recipeName);
    const updated: RecipePrefs = {
      banned: isBanned ? prefs.banned.filter(n => n !== recipeName) : [...prefs.banned, recipeName],
      favorites: prefs.favorites.filter(n => n !== recipeName),
    };
    storageService.set(STORAGE_KEYS.RECIPE_PREFS, updated);
    set({ recipePrefs: updated });
  },
  toggleMealDone: (menuId, day, meal) => {
    const current = get().mealLog;
    // Registro nuevo al cambiar de menú (semana nueva → adherencia a cero)
    const log: MealLog = current && current.menuId === menuId
      ? { ...current, done: { ...current.done } }
      : { menuId, done: {} };
    const dayLog = { ...(log.done[day] ?? {}) };
    dayLog[meal] = !dayLog[meal];
    log.done[day] = dayLog;
    storageService.set(STORAGE_KEYS.MEAL_LOG, log);
    set({ mealLog: log });
  },
  toggleDailyAction: (menuId, actionId) => {
    const current = get().dailyActionsDone;
    // Registro nuevo al cambiar de menú (semana nueva → acciones a cero)
    const base: DailyActionsDone = current && current.menuId === menuId
      ? { ...current, done: [...current.done] }
      : { menuId, done: [] };
    const updated: DailyActionsDone = {
      ...base,
      done: base.done.includes(actionId)
        ? base.done.filter(id => id !== actionId)
        : [...base.done, actionId],
    };
    storageService.set(STORAGE_KEYS.DAILY_ACTIONS, updated);
    set({ dailyActionsDone: updated });
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
