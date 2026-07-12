// Envío nocturno de recordatorios de descongelación por Web Push.
//
// La invocan dos jobs de pg_cron (19:00 y 20:00 UTC) autenticados con la
// cabecera x-cron-secret: un secreto aleatorio que la migración genera DENTRO
// de Postgres y guarda en Vault ('cron_secret'), de modo que nunca sale de la
// base de datos. La función lo obtiene vía RPC get_cron_secret() (SECURITY
// DEFINER, ejecutable solo por service_role) y lo compara. Por eso esta
// función se despliega con verify_jwt = false (auth propia, ver config.toml).
//
// Solo envía cuando son las 21:00 en Europe/Madrid (así el DST se maneja
// solo). Para cada usuario con suscripciones push, lee su menú/guía de
// app_state, deriva las acciones de "esta noche" con la MISMA lógica que el
// cliente (_shared/dailyActions.ts) y notifica las que sigan pendientes.
//
// Secrets necesarios: VAPID_KEYS (JWK exportado por @negrel/webpush) y
// VAPID_CONTACT (mailto:). Ver SETUP-SUPABASE.md.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.3.0';
import { corsHeaders, json } from '../_shared/mod.ts';
import {
  actionsForDate,
  dateInTimeZone,
  isMenuActiveOn,
  resolveConservationPlan,
  type MinimalGuide,
  type MinimalMenu,
} from '../_shared/dailyActions.ts';

const STATE_KEYS = {
  menu: 'batchfit:current_menu',
  guide: 'batchfit:batch_guide',
  done: 'batchfit:daily_actions_done',
} as const;

interface SubscriptionRow {
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  // Auth propia (verify_jwt=false): la cabecera debe coincidir con el secreto
  // generado por la migración y guardado en Vault ('cron_secret').
  const provided = req.headers.get('x-cron-secret') ?? '';
  const { data: expected, error: secretError } = await supabase.rpc('get_cron_secret');
  if (secretError || !expected || provided !== expected) {
    return json({ error: 'No autorizado' }, 403);
  }

  // { force: true } salta el guard horario; { test: true } envía una
  // notificación de prueba a todas las suscripciones (verifica el canal push
  // sin depender de que haya algo que descongelar hoy)
  let force = false;
  let test = false;
  try {
    const body = await req.json();
    force = !!body?.force;
    test = !!body?.test;
  } catch {
    // sin body
  }

  const now = new Date();
  const hourMadrid = Number(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now)
  );
  if (hourMadrid !== 21 && !force && !test) return json({ skipped: 'hour', hourMadrid });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, keys');
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ sent: 0, skipped: 'no-subscriptions' });

  const vapidKeys = await webpush.importVapidKeys(
    JSON.parse(Deno.env.get('VAPID_KEYS')!),
    { extractable: false }
  );
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get('VAPID_CONTACT') ?? 'mailto:admin@batchfit.local',
    vapidKeys,
  });

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const row of subs as SubscriptionRow[]) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
  }

  const today = dateInTimeZone(now);
  let sent = 0;
  let pruned = 0;
  let skippedUsers = 0;

  const send = async (row: SubscriptionRow, payload: string) => {
    try {
      const subscriber = appServer.subscribe({ endpoint: row.endpoint, keys: row.keys });
      await subscriber.pushTextMessage(payload, {});
      sent++;
    } catch (err) {
      const status = err instanceof webpush.PushMessageError ? err.response.status : undefined;
      if (status === 404 || status === 410) {
        // Suscripción caducada o revocada: eliminarla
        await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        pruned++;
      } else {
        console.error(`push a ${row.endpoint.slice(0, 60)}…:`, err);
      }
    }
  };

  if (test) {
    const payload = JSON.stringify({
      title: '🔔 Prueba de BatchFit',
      body: 'Los recordatorios de descongelación funcionan. Te avisaré a las 21:00 cuando toque.',
    });
    for (const row of subs as SubscriptionRow[]) await send(row, payload);
    return json({ sent, pruned, test: true });
  }

  for (const [userId, userSubs] of byUser) {
    const { data: rows, error: stateError } = await supabase
      .from('app_state')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', Object.values(STATE_KEYS));
    if (stateError) {
      console.error(`app_state de ${userId}:`, stateError.message);
      skippedUsers++;
      continue;
    }
    const state = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]));

    const menu = state[STATE_KEYS.menu] as MinimalMenu | undefined;
    if (!menu || !isMenuActiveOn(menu, today)) {
      skippedUsers++;
      continue;
    }
    const guide = state[STATE_KEYS.guide] as MinimalGuide | undefined;
    const doneRecord = state[STATE_KEYS.done] as { menuId: string; done: string[] } | undefined;
    const doneIds = new Set(doneRecord?.menuId === menu.id ? doneRecord.done : []);

    const actions = actionsForDate(menu, resolveConservationPlan(menu, guide), today).filter(
      a => a.type === 'thaw' && !doneIds.has(a.id)
    );
    if (!actions.length) {
      skippedUsers++;
      continue;
    }

    const payload = JSON.stringify(
      actions.length === 1
        ? { title: '❄️ Saca del congelador', body: actions[0].message }
        : {
            title: '❄️ Esta noche: baja a la nevera',
            body: actions.map(a => `${a.recipeName} (para ${a.targetDay})`).join(' · '),
          }
    );

    for (const row of userSubs) await send(row, payload);
  }

  return json({ sent, pruned, skippedUsers });
});
