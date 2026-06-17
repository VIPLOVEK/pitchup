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

-- keepalive table — written to and cleared weekly (see /api/cron/keepalive)
-- to keep this free-tier Supabase project from auto-pausing due to inactivity
create table if not exists keepalive (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now()
);

alter table keepalive enable row level security;

-- players table — lightweight profiles (name + PIN, no email/password flow)
create table if not exists players (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  name        text not null unique,
  phone       text,
  position    text not null default 'Any',  -- Goalkeeper | Defender | Midfielder | Forward | Any
  pin_hash    text not null
);

-- Allow admins to reset a player's PIN (set to null) so the player can
-- choose a new one on their next login, without the admin ever seeing it.
alter table players alter column pin_hash drop not null;

-- Players can select multiple preferred positions (pickup soccer —
-- everyone rotates). Replaces the single `position` column with a
-- `positions` array; an empty array means "no preference / Any".
alter table players add column if not exists positions text[] not null default '{}';
update players set positions = array[position]
  where positions = '{}' and position is not null and position <> 'Any';
alter table players drop column if exists position;

-- Self-rated skill level (1-5), used to balance teams. Admins can adjust
-- a player's rating from the roster tab.
alter table players add column if not exists skill_rating int not null default 3;
do $$ begin
  alter table players add constraint players_skill_rating_range
    check (skill_rating between 1 and 5);
exception when duplicate_object then null;
end $$;

-- Tracks when skill_rating was last set, so the profile page can nudge
-- players to re-rate themselves after a long stretch.
alter table players add column if not exists skill_rating_updated_at timestamptz not null default now();

-- Per-position skill ratings, e.g. {"Defender": 4, "Forward": 2}. Lets a
-- player rate themselves differently per position; skill_rating is kept as
-- a derived overall rating (their highest position rating) for places that
-- still show a single number.
alter table players add column if not exists position_skills jsonb not null default '{}';

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

-- poll_templates table — recurring weekly games. A daily cron
-- (/api/cron/recurring-polls) finds the next occurrence of `weekday` and,
-- once it's within `lead_days`, auto-creates a poll with slots built from
-- `slot_offsets` (each {dayOffset, hour, minute}, in America/New_York).
create table if not exists poll_templates (
  id              text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at      timestamptz default now(),
  title           text not null,
  location        text not null,
  weekday         int not null,              -- 0=Sunday .. 6=Saturday, the anchor day for dayOffset 0
  slot_offsets    jsonb not null,            -- [{dayOffset:0, hour:18, minute:0}, ...]
  min_players     int not null default 8,
  max_players     int not null default 18,
  visibility      text not null default 'all',
  group_ids       jsonb not null default '[]'::jsonb,
  lead_days       int not null default 6,    -- days before the anchor date to open the poll
  active          boolean not null default true,
  last_created_for date                      -- anchor date (NY, YYYY-MM-DD) of the last auto-created poll
);

alter table poll_templates enable row level security;

-- push_subscriptions table — Web Push subscriptions for the PWA.
-- Optionally linked to a player profile; anonymous subscriptions (no
-- profile) still receive broadcast reminders/announcements.
create table if not exists push_subscriptions (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  player_id   text references players(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null  -- {p256dh, auth}
);

alter table push_subscriptions enable row level security;

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

-- feature_requests table — a public suggestion box. Anyone can submit a
-- request and upvote others'; admins update `status` to track progress.
create table if not exists feature_requests (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz default now(),
  title       text not null,
  description text,
  author_name text,
  status      text not null default 'open',  -- 'open' | 'planned' | 'in_progress' | 'done' | 'declined'
  upvotes     jsonb not null default '[]'::jsonb  -- array of voter keys (player id or anon id)
);

alter table feature_requests enable row level security;

create policy "Anyone can read feature requests"
  on feature_requests for select using (true);

-- Game notes, day-before reminder flag, MVP votes
alter table polls add column if not exists notes text;
alter table polls add column if not exists confirmed_reminder_sent boolean not null default false;
alter table polls add column if not exists mvp_votes jsonb not null default '[]';

-- ============================================================
--  To verify: run this query after setup
-- ============================================================
-- select * from polls;

alter table polls add column if not exists goals jsonb not null default '[]';

-- Random funny team names assigned at poll creation
alter table polls add column if not exists team_a_name text not null default 'Team A';
alter table polls add column if not exists team_b_name text not null default 'Team B';
