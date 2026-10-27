-- Lets admin "pin" specific players to a side (White/Colors) while a poll
-- is still open, so the auto-balance draft keeps that player fixed there
-- on every regeneration (preview, reshuffle, and the real confirm) while
-- the rest of the team continues to be auto-balanced around them.
-- { [player name]: 'A' | 'B' }
ALTER TABLE polls ADD COLUMN IF NOT EXISTS team_pins jsonb DEFAULT '{}'::jsonb;
