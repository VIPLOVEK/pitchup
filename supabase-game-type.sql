-- Run in Supabase SQL Editor to add game type support
ALTER TABLE polls ADD COLUMN IF NOT EXISTS game_type text NOT NULL DEFAULT 'game';
