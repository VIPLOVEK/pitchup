-- Run in Supabase SQL Editor to add opponent field
ALTER TABLE polls ADD COLUMN IF NOT EXISTS opponent text;
