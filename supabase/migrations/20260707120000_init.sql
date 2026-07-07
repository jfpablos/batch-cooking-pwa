-- BatchFit — esquema inicial
-- Una tabla clave-valor por usuario que replica las claves batchfit:* que
-- antes vivían solo en localStorage. RLS garantiza que cada usuario solo
-- puede leer/escribir sus propias filas.

create table public.app_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

create policy "select own state" on public.app_state
  for select using (auth.uid() = user_id);

create policy "insert own state" on public.app_state
  for insert with check (auth.uid() = user_id);

create policy "update own state" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own state" on public.app_state
  for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_state_touch_updated_at
  before update on public.app_state
  for each row execute function public.touch_updated_at();
