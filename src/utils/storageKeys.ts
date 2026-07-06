export const STORAGE_KEYS = {
  CURRENT_MENU: 'batchfit:current_menu',
  MENU_HISTORY: 'batchfit:menu_history',
  SHOPPING_LIST: 'batchfit:shopping_list',
  BATCH_GUIDE: 'batchfit:batch_guide',
  LAST_GEN_DATE: 'batchfit:last_gen_date',
  YT_VIDEOS_CACHE: 'batchfit:yt_videos',
  SHOPPING_CHECKED: 'batchfit:shopping_checked',
  MEAL_SELECTION: 'batchfit:meal_selection',
  PANTRY: 'batchfit:pantry',
  BATCH_PROGRESS: 'batchfit:batch_progress',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
