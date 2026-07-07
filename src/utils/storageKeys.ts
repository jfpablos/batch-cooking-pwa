export const STORAGE_KEYS = {
  CURRENT_MENU: 'batchfit:current_menu',
  MENU_HISTORY: 'batchfit:menu_history',
  SHOPPING_LIST: 'batchfit:shopping_list',
  BATCH_GUIDE: 'batchfit:batch_guide',
  LAST_GEN_DATE: 'batchfit:last_gen_date',
  YT_VIDEOS_CACHE: 'batchfit:yt_videos',
  MEAL_SELECTION: 'batchfit:meal_selection',
  PANTRY: 'batchfit:pantry',
  BATCH_PROGRESS: 'batchfit:batch_progress',
  VIDEO_RECIPES: 'batchfit:video_recipes',
  PROFILE: 'batchfit:profile',
  RECIPE_PREFS: 'batchfit:recipe_prefs',
  MEAL_LOG: 'batchfit:meal_log',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
