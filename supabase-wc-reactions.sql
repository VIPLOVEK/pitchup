-- Run this in Supabase SQL Editor to enable chat reactions
ALTER TABLE wc_chat ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}';
