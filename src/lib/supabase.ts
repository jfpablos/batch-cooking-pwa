import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Sin estas variables la app funciona en "modo local": sin login, sin
 * sincronización y sin IA (solo banco de recetas base). Es el modo de
 * desarrollo sin backend.
 */
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;

/**
 * Llama a una Edge Function con el JWT del usuario. Se usa fetch directo (en
 * vez de supabase.functions.invoke) para poder pasar un AbortSignal: las
 * llamadas a Gemini necesitan timeouts largos y cancelables.
 */
export async function invokeFunction(
  name: string,
  init: { json?: unknown; signal?: AbortSignal } = {}
): Promise<Response> {
  if (!supabase || !SUPABASE_URL) {
    throw new Error('Supabase no configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesión caducada — vuelve a iniciar sesión');

  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    signal: init.signal,
  });
}

/** Extrae un mensaje de error legible de una respuesta de Edge Function. */
export async function functionErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
    if (typeof body?.error?.message === 'string') return body.error.message;
  } catch {
    // cuerpo no-JSON
  }
  return `Error ${res.status} llamando al backend`;
}
