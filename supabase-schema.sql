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
