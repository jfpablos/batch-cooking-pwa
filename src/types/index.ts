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
}

// =============================================
// MENÚ SEMANAL
// =============================================

export type DayName = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

export interface RecipeMeal {
  recipeId: string;
  recipeName: string;
  nutrition: NutritionInfo;
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
}

export interface BatchCookingGuide {
  id: string;
  menuId: string;
  estimatedTotalTime: number;
  tasks: BatchTask[];
  generatedAt: string;
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
}

export interface YouTubeCache {
  videos: YouTubeVideo[];
  timestamp: number;
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

  // UI
  activeTab: number;
  isGenerating: boolean;
  generationStep: string;
  generationProgress: number;
  error: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  // Actions
  setCurrentMenu: (menu: WeeklyMenu | null) => void;
  setShoppingList: (list: ShoppingList | null) => void;
  setBatchGuide: (guide: BatchCookingGuide | null) => void;
  setMenuHistory: (history: StoredWeek[]) => void;
  setYoutubeVideos: (videos: YouTubeVideo[]) => void;
  setActiveTab: (tab: number) => void;
  setGenerating: (loading: boolean, step?: string, progress?: number) => void;
  setError: (error: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}
