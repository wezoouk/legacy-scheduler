-- Fix DMS RLS policies to match existing camelCase columns

alter table if exists public.dms_configs enable row level security;
alter table if exists public.dms_cycles enable row level security;

do $$ begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_configs' and policyname = 'dms_configs_select_own'
  ) then
    drop policy dms_configs_select_own on public.dms_configs;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_configs' and policyname = 'dms_configs_modify_own'
  ) then
    drop policy dms_configs_modify_own on public.dms_configs;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_configs' and policyname = 'dms_configs_update_own'
  ) then
    drop policy dms_configs_update_own on public.dms_configs;
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_cycles' and policyname = 'dms_cycles_select_own'
  ) then
    drop policy dms_cycles_select_own on public.dms_cycles;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_cycles' and policyname = 'dms_cycles_modify_own'
  ) then
    drop policy dms_cycles_modify_own on public.dms_cycles;
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dms_cycles' and policyname = 'dms_cycles_update_own'
  ) then
    drop policy dms_cycles_update_own on public.dms_cycles;
  end if;
end $$;

-- Recreate policies against camelCase columns
create policy dms_configs_select_own on public.dms_configs for select using (auth.uid() = "userId");
create policy dms_configs_modify_own on public.dms_configs for insert with check (auth.uid() = "userId");
create policy dms_configs_update_own on public.dms_configs for update using (auth.uid() = "userId") with check (auth.uid() = "userId");

-- dms_cycles has no userId column; authorize via its parent config's userId
create policy dms_cycles_select_own on public.dms_cycles for select using (
  exists (
    select 1 from public.dms_configs c
    where c.id = public.dms_cycles."configId" and c."userId" = auth.uid()
  )
);
create policy dms_cycles_modify_own on public.dms_cycles for insert with check (
  exists (
    select 1 from public.dms_configs c
    where c.id = public.dms_cycles."configId" and c."userId" = auth.uid()
  )
);
create policy dms_cycles_update_own on public.dms_cycles for update using (
  exists (
    select 1 from public.dms_configs c
    where c.id = public.dms_cycles."configId" and c."userId" = auth.uid()
  )
) with check (
  exists (
    select 1 from public.dms_configs c
    where c.id = public.dms_cycles."configId" and c."userId" = auth.uid()
  )
);


