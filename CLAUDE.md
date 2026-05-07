# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Type-check (tsc -b) then Vite build → dist/
npm run lint       # ESLint
npm run preview    # Serve the dist/ build locally
```

No test suite is configured.

## Architecture

**BatchFit** is a PWA (React 19 + TypeScript + Vite 8 + Tailwind CSS 3) for weekly batch cooking meal planning targeting a crossfit athlete (82.5 kg, 3,290 kcal/day, 5 meals/day L–V).

### Navigation model
There is **no React Router**. Navigation is a simple tab index (0–5) stored in Zustand (`activeTab`). `App.tsx` renders the active screen from a `SCREENS[]` array. The 6 tabs map to: Generar → Mi Menú → Compra → Batch → Vídeos → Historial.

### Data flow
```
useMenuGeneration (hook)
  → geminiService.generateWeeklyMenu()   ← Gemini 2.5 Flash, responseMimeType: 'application/json'
  → menuService.createWeeklyMenuFromAI() ← transforms GeminiResponse → WeeklyMenu
  → shoppingListService.generateFromMenu()
  → storageService.set()                 ← localStorage CRUD
  → useAppStore (Zustand)                ← global reactive state
```

If Gemini is not configured or fails, `menuService.createWeeklyMenuFromBase()` generates a menu from `src/assets/recipes-db.json` (25 base recipes).

### Key files
| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces — single source of truth for data shapes |
| `src/assets/recipes-db.json` | 25 base recipes with exact gram quantities calibrated to the athlete profile |
| `src/utils/prompts.ts` | `GEMINI_SYSTEM_PROMPT` + `generateMenuPrompt()` — the nutritional targets are hardcoded here |
| `src/utils/storageKeys.ts` | All `localStorage` key constants (`batchfit:*`) |
| `src/services/geminiService.ts` | Gemini API call with 3 retries; validates JSON with `validateMenuResponse()` |
| `src/services/youtubeService.ts` | YouTube playlist loader with 7-day localStorage cache; `findMatchingVideo()` does keyword-based matching between recipe names and video titles (accent-insensitive, ≥1 word match) |
| `src/services/menuService.ts` | Builds `WeeklyMenu` from AI response or base recipes; `getAllRecipeNames()` feeds the anti-repetition history |
| `src/services/shoppingListService.ts` | Aggregates ingredients across all 5 days, groups into 7 categories via `CATEGORY_MAP` |
| `src/hooks/useHistoryRotation.ts` | Reads/writes `batchfit:menu_history`; keeps last 4 weeks; `getExcludeNames()` returns all recipe names to exclude from next generation |
| `src/store/useAppStore.ts` | Zustand store initialized from localStorage on startup |

### Environment variables (`.env.local`)
```
VITE_GEMINI_API_KEY=        # Google AI Studio — required for AI menu generation
VITE_YOUTUBE_API_KEY=       # Google Cloud Console, YouTube Data API v3
VITE_YOUTUBE_PLAYLIST_ID=   # Default: PLbo-TdcEj2O95G6vwvMz4ukm8hmkHHe09
```
The app works without any keys: menus use base recipes, and the Videos tab shows a setup message.

### Nutritional targets (hardcoded)
Daily targets for L–V (training days): **3,290 kcal | 165g protein | 454g carbs | 91g fat**. Per-meal targets are in `src/utils/prompts.ts` inside `GEMINI_SYSTEM_PROMPT`. Changing these requires updating both the prompt and `src/components/MenuGenerator/MenuGeneratorScreen.tsx` (display only).

### PWA
`vite-plugin-pwa` generates a Service Worker via Workbox (`generateSW` mode). Gemini API calls use `NetworkOnly`; YouTube thumbnails use `CacheFirst` (30-day TTL). Icons in `public/` are currently 1×1 pixel PNG placeholders — replace with real 192×192, 512×512, and maskable PNGs for production.

### Styling conventions
- Tailwind utility classes throughout; custom colors defined in `tailwind.config.js` as `primary` (#FF6B35), `secondary` (#004E89), `success`, `bg`, `card`
- Minimum touch target: `min-h-[44px]` on all interactive elements
- Safe-area CSS vars (`--safe-area-top`, `--safe-area-bottom`) applied in `src/index.css`
- Dark mode via `prefers-color-scheme` media query (Tailwind `dark:` prefix)
