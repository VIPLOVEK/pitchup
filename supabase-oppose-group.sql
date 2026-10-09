-- Run in Supabase SQL Editor to support "always play against the majority
-- of this group" team-balancing rule (e.g. Ahmed vs Purple Pack).
ALTER TABLE players ADD COLUMN IF NOT EXISTS oppose_group_id text REFERENCES groups(id) ON DELETE SET NULL;
