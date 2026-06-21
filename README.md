# BatchFit

PWA para planificar el **batch cooking semanal** de un atleta de crossfit. Genera un menú de lunes a viernes (5 días × 5 comidas) adaptado a tus targets nutricionales, calcula la lista de la compra agregada, te guía paso a paso en la sesión de cocinado y enlaza vídeos de YouTube con cada receta.

Pensado para móvil (instalable como app desde el navegador) y para funcionar sin conexión una vez generado el menú.

---

## Características

- **Generación de menú con IA** (Google Gemini 2.5 Flash) ajustada a tus objetivos calóricos y de macros.
- **Selector de comidas por celda**: marca qué desayunos / pre-entrenos / principales / post-entrenos / cenas necesitas cada día. Las celdas desmarcadas se planifican como "Comer fuera" y no entran en la lista de la compra ni en los promedios nutricionales.
- **Anti-repetición**: lleva un historial de las últimas 4 semanas y le pide a la IA que no repita recetas recientes.
- **Lista de la compra automática**: agrega cantidades de los 5 días en 7 categorías (proteínas, lácteos, fruta, verdura, hidratos, grasas, otros) con check-list y exportación a PDF.
- **Guía de batch cooking**: pasos accionables para cocinar todo en una sola sesión.
- **Vídeos de YouTube**: empareja cada receta del menú con vídeos de una playlist configurable mediante coincidencia de palabras clave (insensible a acentos).
- **Historial**: visualiza las semanas anteriores y permite reutilizarlas.
- **Offline-first**: PWA instalable con Service Worker (Workbox); el menú generado queda en `localStorage`.
- **Fallback sin IA**: si no configuras la API key de Gemini o falla, el menú se construye desde una base local de 25 recetas calibradas.

---

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 3** (estilos utilitarios + variables CSS personalizadas)
- **Zustand** (estado global, sin React Router — navegación por índice de pestaña)
- **vite-plugin-pwa** (Workbox `generateSW`)
- **@google/generative-ai** (Gemini API)
- **lucide-react** (iconos)
- **jspdf** + **html2canvas** (exportación de la lista de la compra)
- **date-fns** (cálculos de semanas)

---

## Requisitos

- **Node.js ≥ 20** (recomendado LTS)
- **npm** (incluido con Node)
- Opcional pero recomendado para todas las features:
  - API key de **Google Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey))
  - API key de **YouTube Data API v3** (gratuita en [Google Cloud Console](https://console.cloud.google.com), 10.000 unidades/día)

La app funciona sin ninguna API key: usará la base local de recetas y la pestaña de vídeos mostrará un mensaje de configuración.

---

## Instalación

```bash
# 1. Clonar el repo
git clone https://github.com/jfpablos/batch-cooking-pwa.git
cd batch-cooking-pwa

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# (en Windows PowerShell: Copy-Item .env.example .env.local)

# 4. Editar .env.local con tus API keys (ver siguiente sección)

# 5. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:5173
```

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```env
# Google Gemini API Key — genera el menú con IA
VITE_GEMINI_API_KEY=AIzaSy...

# YouTube Data API v3 Key — carga vídeos asociados a recetas
VITE_YOUTUBE_API_KEY=AIzaSy...

# ID de la playlist de YouTube con tus recetas
VITE_YOUTUBE_PLAYLIST_ID=PLbo-TdcEj2O95G6vwvMz4ukm8hmkHHe09
```

> `.env.local` está en `.gitignore` y nunca se sube al repo. Las variables `VITE_*` se embeben en el bundle del cliente — no las uses para secretos sensibles.

---

## Scripts

```bash
npm run dev        # Servidor de desarrollo con HMR  → http://localhost:5173
npm run build      # Compila TypeScript y genera el build de producción en dist/
npm run preview    # Sirve el build de dist/ localmente para probar el PWA
npm run lint       # Ejecuta ESLint sobre todo el código
```

No hay suite de tests configurada.

---

## Estructura del proyecto

```
batch-cooking-pwa/
├── public/                       # Iconos PWA, manifest, assets estáticos
├── src/
│   ├── assets/
│   │   └── recipes-db.json       # 25 recetas base con cantidades en gramos
│   ├── components/
│   │   ├── BatchCookingGuide/    # Pestaña "Batch"
│   │   ├── History/              # Pestaña "Histórico"
│   │   ├── Layout/               # Layout + BottomNav (navegación por tabs)
│   │   ├── MenuDisplay/          # Pestaña "Mi menú" + modal de receta
│   │   ├── MenuGenerator/        # Pestaña "Generar" + MealSelector
│   │   ├── ShoppingList/         # Pestaña "Compra" + categorías + PDF
│   │   └── Videos/               # Pestaña "Vídeos"
│   ├── hooks/
│   │   ├── useMenuGeneration.ts  # Orquesta la llamada a Gemini + fallback
│   │   └── useHistoryRotation.ts # Mantiene las últimas 4 semanas
│   ├── services/
│   │   ├── geminiService.ts      # Llamada a Gemini + validación + 3 retries
│   │   ├── menuService.ts        # Transforma respuesta IA → WeeklyMenu
│   │   ├── shoppingListService.ts# Agrega ingredientes en categorías
│   │   ├── youtubeService.ts     # Carga playlist (caché 7 días)
│   │   └── storageService.ts     # CRUD de localStorage
│   ├── store/
│   │   └── useAppStore.ts        # Estado global Zustand
│   ├── types/
│   │   └── index.ts              # Interfaces TypeScript
│   └── utils/
│       ├── prompts.ts            # Prompt sistema + targets nutricionales
│       ├── storageKeys.ts        # Claves de localStorage (batchfit:*)
│       └── validators.ts
├── .env.example                  # Plantilla de variables de entorno
├── tailwind.config.js
├── vite.config.ts                # Config Vite + vite-plugin-pwa
└── package.json
```

---

## Cómo funciona

### Flujo de generación

```
MenuGeneratorScreen
  └── useMenuGeneration
        ├── (con API key) geminiService.generateWeeklyMenu(prompt)
        │     ↓ JSON validado contra el esquema esperado
        │     menuService.createWeeklyMenuFromAI()
        │
        └── (fallback) menuService.createWeeklyMenuFromBase()
              ↑ usa recipes-db.json
        ↓
  shoppingListService.generateFromMenu()  ← agrega ingredientes
  storageService.set()                    ← persiste en localStorage
  useAppStore (Zustand)                   ← refresca toda la UI
```

### Anti-repetición

Cada menú generado se guarda en `batchfit:menu_history`. El hook `useHistoryRotation` retiene las **últimas 4 semanas** y expone `getExcludeNames()`, que se inyecta en el prompt para que la IA no repita platos recientes.

### Selección de comidas (MealSelector)

El componente `MealSelector` muestra un grid 5×5 (días × comidas). Cada celda es un toggle. La selección se guarda en `batchfit:meal_selection` y se pasa a:
- **prompt**: el esquema `weekMenu` enviado a Gemini solo incluye las celdas marcadas (se reduce el uso de tokens).
- **menú base**: las celdas no marcadas se rellenan con un placeholder `"Comer fuera"`.
- **lista de la compra y promedios nutricionales**: ignoran las celdas omitidas.

---

## Personalización

### Targets nutricionales

Los objetivos diarios están **hardcodeados** en `src/utils/prompts.ts` dentro de `GEMINI_SYSTEM_PROMPT`. Perfil actual:

| Métrica   | Valor diario       |
|-----------|--------------------|
| Calorías  | 3.290 kcal         |
| Proteína  | 165 g              |
| Carbos    | 454 g              |
| Grasas    | 91 g               |
| Comidas   | 5 (L–V)            |

Para adaptarlos a otro atleta, edita:
1. `src/utils/prompts.ts` → `GEMINI_SYSTEM_PROMPT` (targets diarios y por comida).
2. `src/components/MenuGenerator/MenuGeneratorScreen.tsx` (solo si quieres reflejarlos en la UI).

### Recetas base (fallback)

`src/assets/recipes-db.json` contiene 25 recetas con cantidades en gramos. Cada una incluye `category`, `nutrition` e `ingredients`. Añade o modifica recetas respetando ese esquema (ver `src/types/index.ts → BaseRecipe`).

### Playlist de vídeos

Cambia `VITE_YOUTUBE_PLAYLIST_ID` en `.env.local`. El emparejamiento se hace en `youtubeService.findMatchingVideo()` por coincidencia de ≥1 palabra entre nombre de receta y título de vídeo (insensible a acentos).

---

## PWA

- Service Worker generado por Workbox (`vite-plugin-pwa` en modo `generateSW`).
- Las llamadas a Gemini usan estrategia `NetworkOnly`; las miniaturas de YouTube `CacheFirst` (TTL 30 días).
- Para instalar la app: abrir en Chrome/Edge móvil → menú → "Añadir a pantalla de inicio".
- **Importante**: los iconos en `public/` son placeholders 1×1 px — sustitúyelos por PNG reales (192×192, 512×512 y maskable) antes de publicar.

---

## Build de producción

```bash
npm run build
# Genera dist/ listo para servir con cualquier host estático
# (Vercel, Netlify, GitHub Pages, Cloudflare Pages…)

npm run preview
# Sirve dist/ localmente en http://localhost:4173 para probar el SW
```

---

## Licencia

Proyecto personal. Sin licencia pública definida.
