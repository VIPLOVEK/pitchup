-- ============================================================
--  PitchUp — Supabase Schema
--  Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- polls table
create table if not exists polls (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  title       text not null,
  location    text not null,
  slots       jsonb not null,           -- e.g. ["2026-06-13T18:00:00.000Z","2026-06-14T10:00:00.000Z"]
  min_players int not null default 8,
  max_players int not null default 18,
  status      text not null default 'open',  -- 'open' | 'confirmed' | 'cancelled'
  players     jsonb not null default '[]'::jsonb,   -- [{name, slots:[]}]
  teams       jsonb,                                 -- {teamA:[{name}], teamB:[{name}]}
  game_time   timestamptz,                           -- set once status = 'confirmed'
  version     int not null default 0,                -- bumped on every write, used for optimistic locking
  score_a     int,                                   -- final score, Team A (set after game)
  score_b     int,                                   -- final score, Team B (set after game)
  reminder_sent boolean not null default false       -- true once the low-player-count reminder has gone out
);

-- Index for fast lookups
create index if not exists polls_created_at_idx on polls(created_at desc);
create index if not exists polls_status_idx on polls(status);

-- players table — lightweight profiles (name + PIN, no email/password flow)
create table if not exists players (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  name        text not null unique,
  phone       text,
  position    text not null default 'Any',  -- Goalkeeper | Defender | Midfielder | Forward | Any
  pin_hash    text not null
);

-- Row Level Security — no anon access; all reads/writes go through API
-- routes using the service role key, which bypasses RLS entirely.
alter table players enable row level security;

-- groups table — named player groups (e.g. "Wednesday Regulars")
create table if not exists groups (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  name        text not null unique,
  color       text not null default '#a52a4a',  -- hex accent color for theming polls/badges
  logo_url    text                              -- optional group crest/logo (stored in 'group-logos' bucket)
);

alter table groups enable row level security;

create policy "Anyone can read groups"
  on groups for select using (true);

-- Group color/logo for groups created before this migration
alter table groups add column if not exists color text not null default '#a52a4a';
alter table groups add column if not exists logo_url text;

-- Storage bucket for group logos (public read, service-role write)
insert into storage.buckets (id, name, public)
values ('group-logos', 'group-logos', true)
on conflict (id) do nothing;

-- group_members table — membership + join requests
create table if not exists group_members (
  group_id    text not null references groups(id) on delete cascade,
  player_id   text not null references players(id) on delete cascade,
  status      text not null default 'pending',  -- 'pending' | 'approved'
  created_at  timestamptz default now(),
  primary key (group_id, player_id)
);

alter table group_members enable row level security;

-- Polls gain an audience: 'all' (default, visible/joinable by anyone) or
-- 'groups' (restricted to approved members of group_ids)
alter table polls add column if not exists visibility text not null default 'all';
alter table polls add column if not exists group_ids jsonb not null default '[]'::jsonb;

-- ============================================================
--  Migration for existing databases (run if upgrading from the
--  old `threshold`/`closed`/text[] slots schema)
-- ============================================================
-- alter table polls add column if not exists min_players int not null default 8;
-- alter table polls add column if not exists max_players int not null default 18;
-- alter table polls add column if not exists status text not null default 'open';
-- alter table polls add column if not exists game_time timestamptz;
-- alter table polls add column if not exists version int not null default 0;
-- alter table polls add column if not exists score_a int;
-- alter table polls add column if not exists score_b int;
-- alter table polls add column if not exists reminder_sent boolean not null default false;
-- update polls set status = case when closed then 'confirmed' else 'open' end;
-- -- slots must be manually converted from text[] labels to ISO datetimes
-- -- (e.g. re-create the column as jsonb and backfill with real dates)
-- alter table polls drop column if exists threshold;
-- alter table polls drop column if exists closed;

-- Row Level Security — allow anon reads, service role writes
alter table polls enable row level security;

create policy "Anyone can read polls"
  on polls for select using (true);

-- Only server-side (service role) can insert/update/delete
-- The anon key cannot mutate data — all writes go through API routes

-- ============================================================
--  To verify: run this query after setup
-- ============================================================
-- select * from polls;
