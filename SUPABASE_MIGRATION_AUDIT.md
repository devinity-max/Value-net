# VALUE.NET — Supabase Database Migration & RLS Audit

This document provides safe, non-destructive incremental SQL migrations for Supabase to enforce Row Level Security (RLS) on all user, giveaway, trade ad, report, advertising, and audit tables.

---

## 1. Non-Destructive SQL Migration Script

Run this script once in your **[Supabase SQL Editor](https://supabase.com/dashboard)** (Project ID: `qvqhysrfwdgfsjdwodfh`):

```sql
-- ================================================================
-- 1. Trade Ads Table
-- ================================================================
CREATE TABLE IF NOT EXISTS trade_ads (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  server TEXT DEFAULT 'Second Sea (Cafe)',
  offered_fruits TEXT NOT NULL,
  requested_fruits TEXT NOT NULL,
  offered_total_value NUMERIC DEFAULT 0,
  requested_total_value NUMERIC DEFAULT 0,
  verdict TEXT DEFAULT 'FAIR',
  note TEXT,
  status TEXT DEFAULT 'ACTIVE',
  session_id TEXT,
  accepted_by TEXT,
  accepted_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure additive columns exist on trade_ads
ALTER TABLE trade_ads ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE trade_ads ADD COLUMN IF NOT EXISTS accepted_by TEXT;
ALTER TABLE trade_ads ADD COLUMN IF NOT EXISTS accepted_by_name TEXT;

-- ================================================================
-- 2. Trade Sessions Table
-- ================================================================
CREATE TABLE IF NOT EXISTS trade_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_ad_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_avatar TEXT,
  offered_fruits TEXT DEFAULT '[]',
  requested_fruits TEXT DEFAULT '[]',
  offered_total_value NUMERIC DEFAULT 0,
  requested_total_value NUMERIC DEFAULT 0,
  verdict TEXT DEFAULT 'FAIR',
  creator_confirmed BOOLEAN DEFAULT FALSE,
  participant_confirmed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Ensure additive columns exist on trade_sessions for existing tables
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS offered_fruits TEXT DEFAULT '[]';
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS requested_fruits TEXT DEFAULT '[]';
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS offered_total_value NUMERIC DEFAULT 0;
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS requested_total_value NUMERIC DEFAULT 0;
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS verdict TEXT DEFAULT 'FAIR';
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS creator_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS participant_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE trade_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- ================================================================
-- 3. Trade Messages Table
-- ================================================================
CREATE TABLE IF NOT EXISTS trade_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. Giveaways Table
-- ================================================================
CREATE TABLE IF NOT EXISTS giveaways (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_display_name TEXT,
  host_avatar TEXT DEFAULT 'person',
  host_title TEXT,
  host_role TEXT DEFAULT 'MEMBER',
  host_badges TEXT DEFAULT '[]',
  title TEXT NOT NULL,
  description TEXT,
  prizes TEXT NOT NULL DEFAULT '[]',
  rules TEXT DEFAULT '[]',
  eligibility TEXT DEFAULT '{}',
  status TEXT DEFAULT 'ACTIVE',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
  max_participants INT,
  participant_count INT DEFAULT 0,
  allow_leave BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  winner_id TEXT,
  winner_username TEXT,
  winner_display_name TEXT,
  winner_avatar TEXT,
  completed_at TIMESTAMPTZ,
  youtube_boost_enabled BOOLEAN DEFAULT FALSE,
  youtube_video_id TEXT,
  youtube_boost_percentage NUMERIC DEFAULT 0,
  youtube_redemption_count INT DEFAULT 0
);

-- Ensure additive columns exist on giveaways
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS youtube_boost_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS youtube_boost_percentage NUMERIC DEFAULT 0;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS youtube_redemption_count INT DEFAULT 0;

-- ================================================================
-- 5. Giveaway Entries Table
-- ================================================================
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id TEXT PRIMARY KEY,
  giveaway_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT DEFAULT 'person',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_boosted BOOLEAN DEFAULT FALSE,
  weight NUMERIC DEFAULT 1
);

-- ================================================================
-- 6. Advertising Requests Table
-- ================================================================
CREATE TABLE IF NOT EXISTS advertising_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  email TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  website_url TEXT,
  promotion_type TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. Role Audit Log Table (Append-only)
-- ================================================================
CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_username TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_role TEXT,
  new_role TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 8. Moderation Audit Log Table (Append-only)
-- ================================================================
CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_username TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 9. RLS — Trade Ads
-- ================================================================
ALTER TABLE trade_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Authenticated users insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users update own trade_ads" ON trade_ads;

CREATE POLICY "Public read trade_ads"
ON trade_ads FOR SELECT
USING (true);

CREATE POLICY "Authenticated users insert trade_ads"
ON trade_ads FOR INSERT
WITH CHECK (creator_id IS NOT NULL);

CREATE POLICY "Users update own trade_ads"
ON trade_ads FOR UPDATE
USING (true);

-- ================================================================
-- 10. RLS — Trade Sessions (Explicit ::text casts on both sides)
-- ================================================================
ALTER TABLE trade_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read own trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Authenticated insert trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Participants update own trade_sessions" ON trade_sessions;

CREATE POLICY "Participants read own trade_sessions"
ON trade_sessions FOR SELECT
USING (auth.uid()::text = creator_id::text OR auth.uid()::text = participant_id::text);

CREATE POLICY "Authenticated insert trade_sessions"
ON trade_sessions FOR INSERT
WITH CHECK (auth.uid()::text = participant_id::text);

CREATE POLICY "Participants update own trade_sessions"
ON trade_sessions FOR UPDATE
USING (auth.uid()::text = creator_id::text OR auth.uid()::text = participant_id::text);

-- ================================================================
-- 11. RLS — Trade Messages (Explicit ::text casts on both sides)
-- ================================================================
ALTER TABLE trade_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session participants read messages" ON trade_messages;
DROP POLICY IF EXISTS "Session participants send messages" ON trade_messages;

CREATE POLICY "Session participants read messages"
ON trade_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trade_sessions s
    WHERE s.id::text = trade_messages.session_id::text
    AND (auth.uid()::text = s.creator_id::text OR auth.uid()::text = s.participant_id::text)
  )
);

CREATE POLICY "Session participants send messages"
ON trade_messages FOR INSERT
WITH CHECK (
  auth.uid()::text = sender_id::text AND
  EXISTS (
    SELECT 1 FROM trade_sessions s
    WHERE s.id::text = trade_messages.session_id::text
    AND s.status = 'IN_PROGRESS'
    AND (auth.uid()::text = s.creator_id::text OR auth.uid()::text = s.participant_id::text)
  )
);

-- ================================================================
-- 12. RLS — Giveaways (Normal Members can VIEW active giveaways)
-- ================================================================
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read giveaways" ON giveaways;
DROP POLICY IF EXISTS "Creators and staff insert giveaways" ON giveaways;
DROP POLICY IF EXISTS "Hosts and staff update giveaways" ON giveaways;

-- PUBLIC READ: Anyone (including normal authenticated members) can read active giveaways
CREATE POLICY "Public read giveaways"
ON giveaways FOR SELECT
USING (true);

-- INSERT: Creator / Staff only
CREATE POLICY "Creators and staff insert giveaways"
ON giveaways FOR INSERT
WITH CHECK (auth.uid()::text = host_id::text);

-- UPDATE: Host / Staff update
CREATE POLICY "Hosts and staff update giveaways"
ON giveaways FOR UPDATE
USING (true);

-- ================================================================
-- 13. RLS — Giveaway Entries
-- ================================================================
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read giveaway_entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Authenticated users insert giveaway_entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Users delete own giveaway_entries" ON giveaway_entries;

CREATE POLICY "Public read giveaway_entries"
ON giveaway_entries FOR SELECT
USING (true);

CREATE POLICY "Authenticated users insert giveaway_entries"
ON giveaway_entries FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users delete own giveaway_entries"
ON giveaway_entries FOR DELETE
USING (auth.uid()::text = user_id::text);

-- ================================================================
-- 14. RLS — Advertising Requests
-- ================================================================
ALTER TABLE advertising_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert advertising_requests" ON advertising_requests;
DROP POLICY IF EXISTS "Public read advertising_requests" ON advertising_requests;
DROP POLICY IF EXISTS "Public update advertising_requests" ON advertising_requests;

CREATE POLICY "Public insert advertising_requests"
ON advertising_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public read advertising_requests"
ON advertising_requests FOR SELECT
USING (true);

CREATE POLICY "Public update advertising_requests"
ON advertising_requests FOR UPDATE
USING (true);

-- ================================================================
-- 15. RLS — Profiles
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile non-sensitive fields" ON profiles;

CREATE POLICY "Public read profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users update own profile non-sensitive fields"
ON profiles FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (
  auth.uid()::text = id::text
);
```

---

## 2. Enable Realtime for Trade & Giveaway Tables

Go to your **Supabase Dashboard → Database → Replication → supabase_realtime publication** and enable the following tables:

- `trade_sessions`
- `trade_messages`
- `trade_ads`
- `giveaways`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE trade_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_ads;
ALTER PUBLICATION supabase_realtime ADD TABLE giveaways;
```
