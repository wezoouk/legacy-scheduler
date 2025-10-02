-- DMS (Guardian Angel) persistent tables
-- Ensures server-side cron can evaluate overdue status and trigger releases

create extension if not exists pgcrypto;

create table if not exists public.dms_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  frequency_days integer not null,
  grace_days integer not null,
  duration_days integer not null,
  check_in_reminder_hours integer not null,
  channels jsonb not null default '{"email":true,"sms":false,"push":false}',
  escalation_contact_id uuid null,
  emergency_instructions text null,
  status text not null check (status in ('INACTIVE','ACTIVE','PAUSED')),
  cooldown_until timestamptz null,
  last_checkin timestamptz null,
  next_checkin timestamptz null,
  start_date timestamptz null,
  end_date timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dms_cycles (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.dms_configs(id) on delete cascade,
  user_id uuid not null,
  next_checkin_at timestamptz not null,
  state text not null check (state in ('ACTIVE','GRACE','PENDING_RELEASE','RELEASED','PAUSED')),
  reminders integer[] not null default '{1,3,7}',
  check_in_reminder_sent boolean not null default false,
  last_reminder_sent timestamptz null,
  released_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dms_configs enable row level security;
alter table public.dms_cycles enable row level security;

-- Policies: users can manage their own configs and cycles
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_configs' and policyname = 'dms_configs_select_own'
  ) then
    create policy dms_configs_select_own on public.dms_configs for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_configs' and policyname = 'dms_configs_modify_own'
  ) then
    create policy dms_configs_modify_own on public.dms_configs for insert with check (auth.uid() = user_id);
    create policy dms_configs_update_own on public.dms_configs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_cycles' and policyname = 'dms_cycles_select_own'
  ) then
    create policy dms_cycles_select_own on public.dms_cycles for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_cycles' and policyname = 'dms_cycles_modify_own'
  ) then
    create policy dms_cycles_modify_own on public.dms_cycles for insert with check (auth.uid() = user_id);
    create policy dms_cycles_update_own on public.dms_cycles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Updated timestamps
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.dms_configs;
create trigger set_updated_at before update on public.dms_configs for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.dms_cycles;
create trigger set_updated_at before update on public.dms_cycles for each row execute function public.set_updated_at();



