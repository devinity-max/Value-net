-- ================================================================
-- VALUE.NET - Giveaways & Giveaway Entries RLS Authorization Fix
-- Run this in: Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 1. giveaways RLS Policies
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Public read giveaways" ON giveaways;
DROP POLICY IF EXISTS "Anyone view giveaways" ON giveaways;
DROP POLICY IF EXISTS "Creators and staff insert giveaways" ON giveaways;
DROP POLICY IF EXISTS "Hosts and staff update giveaways" ON giveaways;

-- PUBLIC READ: Anyone (including normal authenticated members) can read all giveaways
CREATE POLICY "Public read giveaways"
ON giveaways FOR SELECT
USING (true);

-- INSERT: Host/Creator only (auth.uid() matches host_id)
CREATE POLICY "Creators and staff insert giveaways"
ON giveaways FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = host_id::text
);

-- UPDATE: Host/Creator update (auth.uid() matches host_id)
CREATE POLICY "Hosts and staff update giveaways"
ON giveaways FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = host_id::text
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = host_id::text
);

-- ----------------------------------------------------------------
-- 2. giveaway_entries RLS Policies
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Public read giveaway_entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Authenticated users insert giveaway_entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Users delete own giveaway_entries" ON giveaway_entries;

-- PUBLIC READ: Anyone authenticated can read entries
CREATE POLICY "Public read giveaway_entries"
ON giveaway_entries FOR SELECT
USING (true);

-- INSERT: Authenticated users can insert their own entries
CREATE POLICY "Authenticated users insert giveaway_entries"
ON giveaway_entries FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = user_id::text
);

-- DELETE: Users can delete/leave their own entries
CREATE POLICY "Users delete own giveaway_entries"
ON giveaway_entries FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = user_id::text
);
