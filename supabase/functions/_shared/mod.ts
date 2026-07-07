// Utilidades compartidas por las Edge Functions.
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Verifica el JWT del usuario y, si el secret ALLOWED_EMAILS está definido
 * (lista separada por comas), que su email esté en la lista. Devuelve una
 * Response de error o null si todo está bien.
 *
 * El gateway de Supabase ya exige un JWT válido (verify_jwt=true), pero la
 * anon key también es un JWT válido: hay que comprobar que hay un USUARIO.
 */
export async function requireAllowedUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Falta cabecera Authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: 'No autenticado' }, 401);

  const allowed = (Deno.env.get('ALLOWED_EMAILS') ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Denegar por defecto: sin lista configurada, cualquier cuenta de Google
  // del mundo podría consumir la cuota de Gemini/YouTube.
  if (allowed.length === 0) {
    return json({ error: 'ALLOWED_EMAILS no configurado en el servidor — acceso denegado' }, 403);
  }

  const email = (data.user.email ?? '').toLowerCase();
  if (!allowed.includes(email)) {
    return json({ error: `Usuario ${email} no autorizado` }, 403);
  }

  return null;
}
