// Proxy autenticado a la API de Gemini. La API key vive solo aquí (secret
// GEMINI_API_KEY); el cliente construye el cuerpo de la petición
// (systemInstruction, contents, generationConfig) y esta función lo reenvía.
import { corsHeaders, json, requireAllowedUser } from '../_shared/mod.ts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método no soportado' }, 405);
  }

  const denied = await requireAllowedUser(req);
  if (denied) return denied;

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, 500);
  }

  let payload: { model?: string; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Cuerpo JSON inválido' }, 400);
  }

  const { model, body } = payload;
  if (!model || !/^gemini-[\w.-]+$/.test(model) || typeof body !== 'object' || body === null) {
    return json({ error: 'Petición inválida: se espera { model: "gemini-…", body: {…} }' }, 400);
  }

  const upstream = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
