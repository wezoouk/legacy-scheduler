-- Message links and media views for recipient-facing media viewer
-- Tables and columns use snake_case

-- Enable required extension if not already enabled (gen_random_uuid)
-- Note: In Supabase, this is usually pre-enabled. Safe to run.
create extension if not exists pgcrypto;

create table if not exists message_links (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  recipient_id uuid not null references recipients(id) on delete cascade,
  link_type text not null check (link_type in ('VIDEO','VOICE','FILE')),
  target_url text not null,
  thumbnail_url text,
  view_token text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_message_links_recipient_created on message_links(recipient_id, created_at desc);

create table if not exists media_views (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references message_links(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip text,
  user_agent text
);






