// =============================================
// TIPOS BASE
// =============================================

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface StorageInfo {
  days: number;
  instructions: string;
  freezable: boolean;
}

// =============================================
// RECETAS
// =============================================

export type RecipeCategory = 'desayuno' | 'pre-entreno' | 'principal' | 'post-entreno' | 'cena';
export type RecipeDifficulty = 'fácil' | 'medio' | 'difícil';
export type RecipeSource = 'base' | 'gemini';
// 'batch' se prepara el domingo; 'al-momento' se hace fresco en el día (batidos, gachas...)
export type RecipePrepStyle = 'batch' | 'al-momento';

export interface BaseRecipe {
  id: string;
  name: string;
  category: RecipeCategory;
  difficulty: RecipeDifficulty;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  nutrition: NutritionInfo;
  storage: StorageInfo;
  tags: string[];
  batchMultiplier: number;
  batchNotes?: string;
  source: RecipeSource;
  prepStyle?: RecipePrepStyle;
  sourceVideoId?: string;  // vídeo de YouTube en el que se basa la receta
}

// =============================================
// MENÚ SEMANAL
// =============================================

export type DayName = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

export type MealKey = 'desayuno' | 'preEntreno' | 'principal' | 'postEntreno' | 'cena';

export type MealSelection = Record<DayName, Record<MealKey, boolean>>;

export interface RecipeMeal {
  recipeId: string;
  recipeName: string;
  nutrition: NutritionInfo;
  isSkipped?: boolean;
}

export interface DayMeals {
  desayuno: RecipeMeal;
  preEntreno: RecipeMeal;
  principal: RecipeMeal;
  postEntreno: RecipeMeal;
  cena: RecipeMeal;
}

export interface DayMenu {
  day: DayName;
  meals: DayMeals;
  totalNutrition: NutritionInfo;
}

export interface WeeklyNutritionSummary {
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  notes?: string;
}

export interface WeeklyMenu {
  id: string;
  weekNumber: number;
  year: number;
  generatedAt: string;
  days: DayMenu[];
  nutritionSummary: WeeklyNutritionSummary;
  recipes: BaseRecipe[];
  source: 'gemini' | 'base';
}

// =============================================
// RESPUESTA GEMINI (estructura JSON esperada)
// =============================================

export interface GeminiRecipe {
  name: string;
  category: RecipeCategory;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  nutrition: NutritionInfo;
  storage: StorageInfo;
  batchNotes: string;
  tags?: string[];
  prepStyle?: RecipePrepStyle;
  sourceVideoId?: string;
}

export interface GeminiDayMenu {
  desayuno: string;       // nombre de receta
  preEntreno: string;
  principal: string;
  postEntreno: string;
  cena: string;
}

export interface GeminiBatchTask {
  order: number;
  title: string;
  description: string;
  duration: number;
  parallelWith: number | null;
  storageResult: string;
  steps?: string[];
  seasoning?: string;
  equipment?: string;
  recipeNames?: string[];
}

export interface GeminiBatchGuide {
  estimatedTotalTime: number;
  tasks: GeminiBatchTask[];
}

export interface GeminiWeeklyNutrition {
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  notes: string;
}

export interface GeneratedMenuResponse {
  weekMenu: {
    lunes: GeminiDayMenu;
    martes: GeminiDayMenu;
    miercoles: GeminiDayMenu;
    jueves: GeminiDayMenu;
    viernes: GeminiDayMenu;
  };
  recipes: GeminiRecipe[];
  batchCookingGuide: GeminiBatchGuide;
  weeklyNutrition: GeminiWeeklyNutrition;
}

// =============================================
// BATCH COOKING GUIDE
// =============================================

export interface BatchTask {
  order: number;
  title: string;
  description: string;
  duration: number;
  parallelWith: number | null;
  storageResult: string;
  steps?: string[];        // sub-pasos detallados a prueba de principiantes
  seasoning?: string;      // condimentación exacta de la tarea
  equipment?: string;      // utensilios / preparación previa
  recipeNames?: string[];  // recetas a las que pertenece la tarea
}

export type ConservationMethod = 'nevera' | 'congelador' | 'mixto';

export interface ConservationEntry {
  recipeName: string;
  method: ConservationMethod;
  container: string;
  portions: string;
  fridgeDays: number;
  freezeInstructions?: string;
  thawInstructions?: string;
  reheatInstructions: string;
  targetDays: string[];
}

export interface BatchCookingGuide {
  id: string;
  menuId: string;
  estimatedTotalTime: number;
  tasks: BatchTask[];
  generatedAt: string;
  conservationPlan?: ConservationEntry[];
  detailLevel?: 'basic' | 'detailed';
}

// Respuesta de la segunda llamada Gemini (guía detallada)
export interface GeneratedGuideResponse {
  estimatedTotalTime: number;
  tasks: BatchTask[];
  conservationPlan: ConservationEntry[];
}

// Calendario de consumo de una receta (entrada del prompt de la guía)
export interface RecipeScheduleEntry {
  recipeName: string;
  occurrences: { day: DayName; meal: MealKey }[];
}

// =============================================
// LISTA DE LA COMPRA
// =============================================

export type ShoppingCategoryName =
  | 'Proteínas'
  | 'Carbohidratos'
  | 'Verduras y Hortalizas'
  | 'Frutas'
  | 'Lácteos y Huevos'
  | 'Grasas y Aceites'
  | 'Otros';

export interface ShoppingItem {
  name: string;
  totalAmount: number;
  unit: string;
  purchased: boolean;
  mealsContaining: string[];
  inPantry?: boolean;
}

export interface ShoppingCategory {
  category: ShoppingCategoryName;
  items: ShoppingItem[];
}

export interface ShoppingList {
  id: string;
  menuId: string;
  generatedAt: string;
  categories: ShoppingCategory[];
  notes: string;
}

// =============================================
// HISTORIAL
// =============================================

export interface StoredWeek {
  weekNumber: number;
  year: number;
  menuId: string;
  generatedAt: string;
  recipeNames: string[];
}

export interface MenuHistoryStorage {
  history: StoredWeek[];
}

// =============================================
// YOUTUBE
// =============================================

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  description?: string;
}

export interface YouTubeCache {
  videos: YouTubeVideo[];
  timestamp: number;
  version?: number;
}

// =============================================
// CATÁLOGO DE RECETAS POR VÍDEO
// =============================================

export interface VideoRecipe {
  name: string;
  videoId: string;
  videoTitle: string;
  type?: 'batch' | 'rapida';
  mainIngredients?: string[];
}

export interface VideoRecipeCatalog {
  entries: VideoRecipe[];
  builtAt: number;
  analyzedIds: string[];  // vídeos ya analizados (análisis incremental)
}

// =============================================
// DESPENSA (ingredientes a gastar)
// =============================================

export interface PantryItem {
  id: string;
  name: string;
  addedAt: string;
}

// =============================================
// TEMPORIZADOR DE TAREAS BATCH
// =============================================

export interface ActiveTimer {
  taskOrder: number;
  totalSeconds: number;
  endsAt: number | null;      // epoch ms cuando corre; null en pausa
  remainingAtPause: number;   // segundos restantes al pausar
  status: 'running' | 'paused' | 'finished';
}

// =============================================
// PROGRESO GUÍA BATCH (persistido)
// =============================================

export interface BatchProgress {
  menuId: string;
  done: number[];
  current: number | null;
  cooking: boolean;
}

// =============================================
// APP STATE (Zustand)
// =============================================

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AppState {
  // Data
  currentMenu: WeeklyMenu | null;
  shoppingList: ShoppingList | null;
  batchGuide: BatchCookingGuide | null;
  menuHistory: StoredWeek[];
  youtubeVideos: YouTubeVideo[];
  pantryItems: PantryItem[];
  activeTimer: ActiveTimer | null;

  // UI
  activeTab: number;
  isGenerating: boolean;
  generationStep: string;
  generationProgress: number;
  error: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  // Actions
  hydrateFromStorage: () => void;
  setCurrentMenu: (menu: WeeklyMenu | null) => void;
  setShoppingList: (list: ShoppingList | null) => void;
  setBatchGuide: (guide: BatchCookingGuide | null) => void;
  setMenuHistory: (history: StoredWeek[]) => void;
  setYoutubeVideos: (videos: YouTubeVideo[]) => void;
  addPantryItem: (name: string) => void;
  removePantryItem: (id: string) => void;
  startTimer: (taskOrder: number, seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  finishTimer: () => void;
  setActiveTab: (tab: number) => void;
  setGenerating: (loading: boolean, step?: string, progress?: number) => void;
  setError: (error: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}
