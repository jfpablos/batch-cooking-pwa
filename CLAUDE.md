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

**Backend: Supabase** (Google OAuth login, Postgres `app_state` table for cross-device sync, Edge Functions proxying Gemini/YouTube so API keys never reach the client). Setup steps in `SETUP-SUPABASE.md`. Without `VITE_SUPABASE_*` env vars the app runs in **local mode**: no login, no sync, base recipes only.

### Navigation model
There is **no React Router**. Navigation is a simple tab index (0–5) stored in Zustand (`activeTab`). `App.tsx` renders the active screen from a `SCREENS[]` array. The 6 tabs map to: Generar → Mi Menú → Compra → Batch → Vídeos → Historial.

### Data flow
```
useMenuGeneration (hook)
  → geminiService.generateWeeklyMenu()   ← Edge Function gemini-proxy → Gemini 2.5 Flash (JSON mode)
  → menuService.createWeeklyMenuFromAI() ← transforms GeminiResponse → WeeklyMenu
  → shoppingListService.generateFromMenu()
  → storageService.set()                 ← localStorage CRUD + write-through to Supabase (syncService)
  → useAppStore (Zustand)                ← global reactive state
```

If Gemini is not configured or fails, `menuService.createWeeklyMenuFromBase()` generates a menu from `src/assets/recipes-db.json` (25 base recipes).

### Auth & sync
`AuthGate` (in `main.tsx`) blocks rendering until there is a Google session, then runs `syncService.initialSync()`: flush pending offline writes → pull server state into localStorage (server wins) → push local-only keys → `useAppStore.hydrateFromStorage()`. Every `storageService.set/remove` write-throughs to the `app_state` table (debounced 800 ms/key; failures queue under `batchfit:sync_pending`, retried on `online`). `batchfit:yt_videos` is device-local and never synced. First login with an empty server migrates all existing local data up.

### Key files
| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces — single source of truth for data shapes |
| `src/assets/recipes-db.json` | 25 base recipes with exact gram quantities calibrated to the athlete profile |
| `src/utils/prompts.ts` | `GEMINI_SYSTEM_PROMPT` + `generateMenuPrompt()` — the nutritional targets are hardcoded here |
| `src/utils/storageKeys.ts` | All `localStorage` key constants (`batchfit:*`) — these are also the row keys in the Supabase `app_state` table |
| `src/lib/supabase.ts` | Supabase client + `invokeFunction()` (Edge Function fetch with JWT and AbortSignal) |
| `src/services/syncService.ts` | localStorage ⇄ Supabase sync: initial pull, per-key debounced push, offline pending queue |
| `src/components/Auth/AuthGate.tsx` | Session gate + initial sync before rendering; `LoginScreen` (Google) and `AccountFooter` (sign-out, in Historial tab) live beside it |
| `src/services/geminiService.ts` | Builds Gemini REST bodies, calls `gemini-proxy`, 3 retries; validates JSON with `validateMenuResponse()` |
| `src/services/youtubeService.ts` | Playlist via `youtube-playlist` Edge Function with 7-day localStorage cache; `findMatchingVideo()` does keyword-based matching between recipe names and video titles (accent-insensitive, ≥1 word match) |
| `supabase/functions/gemini-proxy/` | Authenticated proxy adding the server-side `GEMINI_API_KEY`; enforces `ALLOWED_EMAILS` |
| `supabase/functions/youtube-playlist/` | Fetches and paginates the playlist with server-side `YOUTUBE_API_KEY`/`YOUTUBE_PLAYLIST_ID` |
| `supabase/migrations/` | `app_state` table (user_id, key, value jsonb) with per-user RLS |
| `src/services/menuService.ts` | Builds `WeeklyMenu` from AI response or base recipes; `getAllRecipeNames()` feeds the anti-repetition history |
| `src/services/shoppingListService.ts` | Aggregates ingredients across all 5 days, groups into 7 categories via `CATEGORY_MAP` |
| `src/hooks/useHistoryRotation.ts` | Reads/writes `batchfit:menu_history`; keeps last 4 weeks; `getExcludeNames()` returns all recipe names to exclude from next generation |
| `supabase/functions/_shared/dailyActions.ts` | **Self-contained** (zero imports) daily-actions engine shared by client and server: derives thaw/freeze/eat actions per day from the menu + conservation plan; real week dates come from `generatedAt` (weekend → next Monday). Client re-exports it via `src/utils/dailyActions.ts` |
| `src/components/DailyActions/` | `TodayPanel` ("Hoy" card at the top of the Batch tab: today's thaw/freeze checklist, `batchfit:daily_actions_done`) + `PushToggle` (Web Push opt-in) |
| `src/services/pushService.ts` | Web Push subscription client (VAPID via `VITE_VAPID_PUBLIC_KEY`, rows in `push_subscriptions`); SW handlers in `public/push-sw.js` injected through `workbox.importScripts` |
| `supabase/functions/send-reminders/` | Nightly push sender: invoked by two pg_cron jobs (19:00/20:00 UTC), only sends when it's 21:00 in Madrid; auth via `x-cron-secret` header (random secret minted inside Postgres/Vault, fetched through the `get_cron_secret()` RPC; `verify_jwt=false`); prunes dead subscriptions (404/410) |
| `src/store/useAppStore.ts` | Zustand store initialized from localStorage on startup |

### Environment variables (`.env.local`)
```
VITE_SUPABASE_URL=          # Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anon/public key (public by design)
VITE_VAPID_PUBLIC_KEY=      # VAPID public key for Web Push reminders (public by design; omit to hide the toggle)
```
Gemini/YouTube API keys live as Edge Function secrets (`GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `YOUTUBE_PLAYLIST_ID`, `ALLOWED_EMAILS`); push reminders add `VAPID_KEYS` + `VAPID_CONTACT` (function secrets) and `project_url`/`service_role_key` in Vault for pg_cron — see `SETUP-SUPABASE.md`. Without the `VITE_SUPABASE_*` vars the app runs in local mode (no login, base recipes, Videos tab shows a setup message). The GitHub Pages deploy workflow injects them from repo Actions secrets.

### Nutritional targets (hardcoded)
Daily targets for L–V (training days): **3,290 kcal | 165g protein | 454g carbs | 91g fat**. Per-meal targets are in `src/utils/prompts.ts` inside `GEMINI_SYSTEM_PROMPT`. Changing these requires updating both the prompt and `src/components/MenuGenerator/MenuGeneratorScreen.tsx` (display only).

### PWA
`vite-plugin-pwa` generates a Service Worker via Workbox (`generateSW` mode). All `*.supabase.co` traffic (auth, data, Edge Functions) uses `NetworkOnly`; YouTube thumbnails use `CacheFirst` (30-day TTL). Icons in `public/` are currently 1×1 pixel PNG placeholders — replace with real 192×192, 512×512, and maskable PNGs for production.

### Styling conventions
- Tailwind utility classes throughout; custom colors defined in `tailwind.config.js` as `primary` (#FF6B35), `secondary` (#004E89), `success`, `bg`, `card`
- Minimum touch target: `min-h-[44px]` on all interactive elements
- Safe-area CSS vars (`--safe-area-top`, `--safe-area-bottom`) applied in `src/index.css`
- Dark mode via `prefers-color-scheme` media query (Tailwind `dark:` prefix)
