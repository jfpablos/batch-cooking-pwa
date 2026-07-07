# Configuración del backend Supabase

BatchFit usa Supabase como backend: login con Google, base de datos Postgres
para sincronizar tus datos entre dispositivos, y Edge Functions que guardan
las API keys de Gemini y YouTube en el servidor (ya no van en el JavaScript
público).

Todo cabe en el **tier gratuito** de Supabase.

## 1. Crear el proyecto Supabase

1. Entra en [supabase.com](https://supabase.com) y crea una cuenta (puedes usar GitHub).
2. **New project** → nombre `batchfit`, región `eu-west-1` (o la más cercana), genera una contraseña de base de datos y guárdala.
3. Cuando termine de aprovisionar, ve a **Settings → API** y copia:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public key** → será `VITE_SUPABASE_ANON_KEY`

## 2. Login con Google

1. En [Google Cloud Console](https://console.cloud.google.com) (el mismo proyecto donde tienes la key de YouTube sirve):
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Tipo: **Web application**
   - **Authorized redirect URIs**: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (el valor exacto te lo muestra Supabase en el paso siguiente)
   - Copia el **Client ID** y el **Client Secret**.
   - Si te pide configurar la pantalla de consentimiento: tipo External, y añade tu email como test user (o publica la app).
2. En Supabase: **Authentication → Sign In / Providers → Google** → actívalo y pega Client ID y Secret.
3. En **Authentication → URL Configuration**:
   - **Site URL**: `https://jfpablos.github.io/batch-cooking-pwa/`
   - **Redirect URLs**: añade también `http://localhost:5173/` para desarrollo.

## 3. Crear la base de datos

Opción A — SQL Editor (más rápido): abre **SQL Editor** en el dashboard, pega el
contenido de `supabase/migrations/20260707120000_init.sql` y ejecuta.

Opción B — CLI:

```bash
npx supabase login
npx supabase link --project-ref TU-PROJECT-REF
npx supabase db push
```

## 4. Desplegar las Edge Functions y sus secrets

```bash
npx supabase login                                  # si no lo hiciste ya
npx supabase link --project-ref TU-PROJECT-REF      # idem

# Secrets del servidor (¡aquí es donde viven ahora las API keys!)
npx supabase secrets set GEMINI_API_KEY=AIzaSy...
npx supabase secrets set YOUTUBE_API_KEY=AIzaSy...
npx supabase secrets set YOUTUBE_PLAYLIST_ID=PLbo-TdcEj2O95G6vwvMz4ukm8hmkHHe09
# Solo estos emails podrán usar Gemini/YouTube a través de tu backend:
npx supabase secrets set ALLOWED_EMAILS=jfpablos@gmail.com

# Desplegar las funciones
npx supabase functions deploy gemini-proxy
npx supabase functions deploy youtube-playlist
```

> Nota: en el plan gratuito las Edge Functions tienen un límite de ~150 s por
> invocación. El análisis de vídeo suele tardar 30–90 s, así que cabe, pero un
> vídeo muy largo puede fallar y quedará como pendiente para reintentarlo.

## 5. Configurar el frontend

**Desarrollo** — crea `.env.local`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Producción (GitHub Pages)** — en el repo de GitHub:
**Settings → Secrets and variables → Actions**:

- Crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Los antiguos `VITE_GEMINI_API_KEY` / `VITE_YOUTUBE_API_KEY` ya no se usan; puedes borrarlos.

Haz push a `master` para que el workflow despliegue la nueva versión.

## 6. Primer inicio de sesión (migración de tus datos)

La primera vez que inicies sesión en un dispositivo, la app compara el
servidor con los datos locales:

- Servidor vacío + datos locales → **sube todo lo local al servidor**.
- Servidor con datos → los descarga (y sube las claves que solo existan en local).

**Importante**: haz el primer login en el móvil donde tienes el catálogo de
análisis de vídeos y tu historial, para que esa información se migre al
servidor y no tengas que regenerarla.

## Cómo queda la seguridad

| Dato | Dónde vive | Quién puede acceder |
|---|---|---|
| API key Gemini / YouTube | Secrets de Edge Functions | Solo el servidor |
| Tus menús, historial, análisis de vídeos | Postgres (`app_state`) con RLS | Solo tu usuario |
| anon key de Supabase | JavaScript público | Cualquiera (es pública por diseño; sin sesión no da acceso a nada) |
| Uso de Gemini vía tu backend | — | Solo emails en `ALLOWED_EMAILS` |
