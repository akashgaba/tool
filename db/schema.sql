-- Schema for flashcard app: cards and user_settings
-- Run this in the Supabase SQL editor, or keep as reference.

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  box smallint not null default 1, -- 1 = new, 2 = forget, 3 = slow, 4 = easy
  review_count integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_user_id_box_idx on public.cards (user_id, box);

alter table public.cards enable row level security;


create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_limit integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

