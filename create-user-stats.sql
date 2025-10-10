-- Create persistent stats table for total sent emails per user
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_sent_emails integer not null default 0,
  updated_at timestamp with time zone not null default now()
);

-- Helpful RPC to increment atomically
create or replace function public.increment_user_sent(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_stats (user_id, total_sent_emails, updated_at)
  values (p_user_id, coalesce(p_amount, 0), now())
  on conflict (user_id)
  do update set total_sent_emails = public.user_stats.total_sent_emails + coalesce(excluded.total_sent_emails, 0),
                updated_at = now();
end;
$$;

grant execute on function public.increment_user_sent(uuid, integer) to authenticated, anon;

