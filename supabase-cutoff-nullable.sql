-- Run in Supabase SQL Editor. The "No cutoff — manual close only" feature
-- has been writing cutoff_hours = null, but the column was never actually
-- made nullable in the database — it still has its original NOT NULL
-- constraint, so every attempt to set "No cutoff" has been failing at the
-- database level (silently, before a recent error-surfacing fix; loudly,
-- as a visible toast, after it).
ALTER TABLE polls ALTER COLUMN cutoff_hours DROP NOT NULL;

-- auto_lock_hours uses the same "null = never/manual" pattern and has no
-- tracked migration either — dropping NOT NULL here too as a precaution.
-- Safe to run even if it's already nullable (no-op in that case).
ALTER TABLE polls ALTER COLUMN auto_lock_hours DROP NOT NULL;
