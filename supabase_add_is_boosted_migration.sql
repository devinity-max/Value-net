-- ================================================================
-- VALUE.NET - Giveaway Entries is_boosted Schema Migration & Cache Reload
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

-- 1. Safely add is_boosted column if it does not already exist
DO 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'giveaway_entries' 
          AND column_name = 'is_boosted'
    ) THEN
        ALTER TABLE giveaway_entries ADD COLUMN is_boosted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END ;

-- 2. Safely add weight column if missing (used for weighted RNG)
DO 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'giveaway_entries' 
          AND column_name = 'weight'
    ) THEN
        ALTER TABLE giveaway_entries ADD COLUMN weight NUMERIC NOT NULL DEFAULT 1.0;
    END IF;
END ;

-- 3. Reload PostgREST schema cache so Supabase API immediately sees the new column(s)
NOTIFY pgrst, 'reload schema';
