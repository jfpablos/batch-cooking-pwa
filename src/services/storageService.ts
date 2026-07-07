import { STORAGE_KEYS } from '../utils/storageKeys';
import { syncService } from './syncService';

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const storageService = {
  get<T>(key: StorageKey): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set<T>(key: StorageKey, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      syncService.onLocalWrite(key);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('[Storage] Quota exceeded. Clearing old data...');
        this.clearOldData();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          syncService.onLocalWrite(key);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
      syncService.onLocalWrite(key);
    } catch {
      // silent
    }
  },

  clear(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(k => {
        localStorage.removeItem(k);
        syncService.onLocalWrite(k);
      });
    } catch {
      // silent
    }
  },

  clearOldData(): void {
    // Remove least critical data first
    this.remove(STORAGE_KEYS.YT_VIDEOS_CACHE);
  },

  getStorageUsage(): { used: number; total: number; percentage: number } {
    let used = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage.getItem(key)?.length ?? 0;
      }
    }
    const total = 5 * 1024 * 1024; // ~5MB
    return {
      used,
      total,
      percentage: Math.round((used / total) * 100),
    };
  },
};
