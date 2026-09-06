-- ================================================================
-- VALUE.NET - Trade Sessions & Trade Ads RLS Authorization Fix
-- Run this in: Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

ALTER TABLE trade_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ads ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 1. trade_sessions RLS Policies
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated insert trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Users can insert trade sessions as participant" ON trade_sessions;

CREATE POLICY "Authenticated insert trade_sessions"
ON trade_sessions FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid()::text = participant_id::text
  AND creator_id::text <> participant_id::text
);

-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Participants read own trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Participants can view their trade sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Anyone view in_progress trade_sessions for status check" ON trade_sessions;

CREATE POLICY "Participants read own trade_sessions"
ON trade_sessions FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = creator_id::text
    OR auth.uid()::text = participant_id::text
    OR status = 'IN_PROGRESS'
  )
);

-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Participants update own trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Participants can update their trade sessions" ON trade_sessions;

CREATE POLICY "Participants update own trade_sessions"
ON trade_sessions FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = creator_id::text
    OR auth.uid()::text = participant_id::text
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = creator_id::text
    OR auth.uid()::text = participant_id::text
  )
);

-- ----------------------------------------------------------------
-- 2. trade_ads RLS Policies
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "Users update own trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users can update trade ads" ON trade_ads;

CREATE POLICY "Users update own trade_ads"
ON trade_ads FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = creator_id::text
    OR status = 'ACTIVE'
    OR auth.uid()::text = accepted_by::text
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = creator_id::text
    OR auth.uid()::text = accepted_by::text
  )
);
