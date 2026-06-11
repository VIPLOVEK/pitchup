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
  slots       text[] not null,          -- e.g. {"Sat 6PM","Sun 10AM"}
  threshold   int not null default 10,
  closed      boolean not null default false,
  players     jsonb not null default '[]'::jsonb,   -- [{name, slots:[]}]
  teams       jsonb                                  -- {teamA:[{name}], teamB:[{name}]}
);

-- Index for fast lookups
create index if not exists polls_created_at_idx on polls(created_at desc);
create index if not exists polls_closed_idx on polls(closed);

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
