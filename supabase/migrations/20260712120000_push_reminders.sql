-- BatchFit — recordatorios Web Push
-- Tabla de suscripciones push (una por dispositivo/navegador) y dos jobs de
-- pg_cron que invocan la Edge Function send-reminders a las 19:00 y 20:00 UTC:
-- la función solo envía cuando son las 21:00 en Europe/Madrid, así el cambio
-- CET/CEST se maneja solo.
--
-- NOTA: los jobs de cron definidos aquí (auth Bearer service_role desde
-- Vault) fueron SUSTITUIDOS por 20260712150000_cron_secret_auth.sql, que
-- reprograma ambos con la cabecera x-cron-secret y elimina la necesidad de
-- guardar la service_role key. Requisito previo en Vault (una vez):
--   select vault.create_secret('https://<proyecto>.supabase.co', 'project_url');
-- Ver SETUP-SUPABASE.md.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null, -- { p256dh, auth } de PushSubscription.toJSON()
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "select own subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "insert own subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "update own subscriptions" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Programación del envío diario
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-utc19',
  '0 19 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'send-reminders-utc20',
  '0 20 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
