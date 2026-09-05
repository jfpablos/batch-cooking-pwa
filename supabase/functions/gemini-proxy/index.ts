// Proxy autenticado a la API de Gemini. La API key vive solo aquí (secret
// GEMINI_API_KEY); el cliente construye el cuerpo de la petición
// (systemInstruction, contents, generationConfig) y esta función lo reenvía.
//
// El MODELO lo decide el servidor, no el cliente: así se cambia con
// `supabase secrets set GEMINI_MODEL=...` sin redesplegar el frontend.
//   GEMINI_MODEL            modelo principal (default DEFAULT_MODEL)
//   GEMINI_FALLBACK_MODELS  lista separada por comas que se prueba en orden
//                           cuando el principal responde 404 (modelo
//                           inexistente/retirado), 429 (cuota del free tier
//                           agotada) o 503 (sobrecarga)
//   GEMINI_ALLOW_CLIENT_MODEL=true  permite que el cliente fuerce `model`
//                           (solo para pruebas)
// La cabecera de respuesta x-batchfit-model indica qué modelo sirvió la
// respuesta; los saltos de fallback se registran en los logs de la función.
import { corsHeaders, json, requireAllowedUser } from '../_shared/mod.ts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash';
const DEFAULT_FALLBACKS = 'gemini-3.5-flash-lite,gemini-2.5-flash';
const MODEL_PATTERN = /^gemini-[\w.-]+$/;
const FALLBACK_STATUSES = new Set([404, 429, 503]);

function modelChain(clientModel: unknown): string[] {
  const primary = Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_MODEL;
  const fallbacks = (Deno.env.get('GEMINI_FALLBACK_MODELS') ?? DEFAULT_FALLBACKS)
    .split(',')
    .map(m => m.trim())
    .filter(m => MODEL_PATTERN.test(m));
  const chain = [primary, ...fallbacks];
  if (
    Deno.env.get('GEMINI_ALLOW_CLIENT_MODEL') === 'true' &&
    typeof clientModel === 'string' &&
    MODEL_PATTERN.test(clientModel)
  ) {
    chain.unshift(clientModel);
  }
  return Array.from(new Set(chain));
}

async function callModel(model: string, apiKey: string, body: Record<string, unknown>): Promise<Response> {
  return await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

  // Límite de tamaño: los prompts legítimos de la app quedan muy por debajo
  const rawBody = await req.text();
  if (rawBody.length > 512 * 1024) {
    return json({ error: 'Petición demasiado grande' }, 413);
  }

  let payload: { model?: unknown; body?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Cuerpo JSON inválido' }, 400);
  }

  const { body } = payload;
  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Petición inválida: se espera { body: {…} }' }, 400);
  }

  // Techo de maxOutputTokens: acota el coste por invocación aunque el cliente
  // (autorizado) pida más u omita generationConfig por completo.
  const MAX_OUTPUT_TOKENS = 32768;
  const bodyRecord = body as Record<string, unknown>;
  const rawConfig = bodyRecord.generationConfig;
  const generationConfig: Record<string, unknown> =
    rawConfig && typeof rawConfig === 'object' ? (rawConfig as Record<string, unknown>) : {};
  const requested = Number(generationConfig.maxOutputTokens);
  generationConfig.maxOutputTokens = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MAX_OUTPUT_TOKENS)
    : MAX_OUTPUT_TOKENS;
  bodyRecord.generationConfig = generationConfig;

  const chain = modelChain(payload.model);
  let upstream: Response | null = null;
  let usedModel = chain[0];

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    usedModel = model;
    upstream = await callModel(model, apiKey, bodyRecord);

    // Los modelos 3.x rechazan thinkingConfig.thinkingBudget (usan
    // thinkingLevel): un 400 que lo mencione se reintenta sin ese campo.
    if (upstream.status === 400 && 'thinkingConfig' in generationConfig) {
      const text = await upstream.text();
      if (/thinking/i.test(text)) {
        console.warn(`[gemini-proxy] ${model} rechaza thinkingConfig, reintentando sin él`);
        const rest = { ...generationConfig };
        delete rest.thinkingConfig;
        upstream = await callModel(model, apiKey, { ...bodyRecord, generationConfig: rest });
      } else {
        upstream = new Response(text, { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (!FALLBACK_STATUSES.has(upstream.status) || i === chain.length - 1) break;
    const detail = (await upstream.text()).slice(0, 300);
    console.warn(`[gemini-proxy] ${model} → ${upstream.status}; probando ${chain[i + 1]}. ${detail}`);
  }

  const text = await upstream!.text();
  console.log(`[gemini-proxy] modelo=${usedModel} status=${upstream!.status}`);
  return new Response(text, {
    status: upstream!.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-batchfit-model': usedModel,
    },
  });
});
