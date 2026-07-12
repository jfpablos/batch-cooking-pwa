-- BatchFit — autenticación del cron sin service_role key.
--
-- Sustituye el esquema anterior (Bearer service_role desde Vault) por un
-- secreto aleatorio 'cron_secret' que se genera AQUÍ, dentro de Postgres, y
-- nunca sale de la base de datos: los jobs de pg_cron lo envían en la
-- cabecera x-cron-secret y la Edge Function send-reminders (verify_jwt=false)
-- lo recupera vía la RPC get_cron_secret() y lo compara.
--
-- Requisito en Vault (creado en el despliegue, ver SETUP-SUPABASE.md):
--   select vault.create_secret('https://<proyecto>.supabase.co', 'project_url');

create extension if not exists pgcrypto with schema extensions;

-- Secreto del cron: 24 bytes aleatorios, solo si no existe ya
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'cron_secret');
  end if;
end $$;

-- Lectura del secreto para la Edge Function (cliente service_role vía RPC).
-- SECURITY DEFINER porque service_role no puede leer vault directamente.
create or replace function public.get_cron_secret()
returns text
language sql
security definer set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';
$$;

revoke execute on function public.get_cron_secret() from public, anon, authenticated;
grant execute on function public.get_cron_secret() to service_role;

-- Reprogramar los jobs con la nueva autenticación
select cron.unschedule(jobid) from cron.job where jobname in ('send-reminders-utc19', 'send-reminders-utc20');

select cron.schedule(
  'send-reminders-utc19',
  '0 19 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
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
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
