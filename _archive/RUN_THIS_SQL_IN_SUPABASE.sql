-- ============================================
-- CRITICAL: Run this SQL in your Supabase SQL Editor
-- This adds the frequencyUnit and graceUnit columns to dms_configs
-- ============================================

do $$
begin
  -- Add frequencyUnit column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='dms_configs' and column_name='frequencyUnit'
  ) then
    alter table public.dms_configs add column "frequencyUnit" text not null default 'days';
  end if;

  -- Add graceUnit column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='dms_configs' and column_name='graceUnit'
  ) then
    alter table public.dms_configs add column "graceUnit" text not null default 'days';
  end if;
end $$;

-- Add constraints to ensure only valid values
alter table public.dms_configs
  drop constraint if exists dms_configs_frequencyunit_check;
alter table public.dms_configs
  add constraint dms_configs_frequencyunit_check check ("frequencyUnit" in ('minutes','hours','days'));

alter table public.dms_configs
  drop constraint if exists dms_configs_graceunit_check;
alter table public.dms_configs
  add constraint dms_configs_graceunit_check check ("graceUnit" in ('minutes','hours','days'));

-- Verify the columns were added
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
and table_name = 'dms_configs'
and column_name in ('frequencyUnit', 'graceUnit');

