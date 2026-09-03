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

-- ================================================================
-- 2. Trade Sessions Table (shared between both participants)
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
  offered_fruits TEXT NOT NULL DEFAULT '[]',
  requested_fruits TEXT NOT NULL DEFAULT '[]',
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

-- ================================================================
-- 3. Trade Messages Table (chat within a trade session)
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
-- 4. Advertising Requests Table
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
-- 5. Role Audit Log Table (Append-only)
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
-- 6. Moderation Audit Log Table (Append-only)
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
-- 7. Enable Realtime on key tables
--    (Run in Supabase Dashboard → Database → Replication)
-- ================================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE trade_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE trade_messages;
-- (Uncomment and run separately in the Supabase Dashboard if needed)

-- ================================================================
-- 8. RLS — Trade Ads
-- ================================================================
ALTER TABLE trade_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Public insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Creator and staff insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users insert own trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Authenticated users insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users update own trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Public update trade_ads" ON trade_ads;

-- Public / Community READ active trade ads
CREATE POLICY "Public read trade_ads"
ON trade_ads FOR SELECT
USING (true);

-- All authenticated members can insert trade ads
CREATE POLICY "Authenticated users insert trade_ads"
ON trade_ads FOR INSERT
WITH CHECK (creator_id IS NOT NULL);

-- Users can update their own trade ads (accept/cancel/session update)
CREATE POLICY "Users update own trade_ads"
ON trade_ads FOR UPDATE
USING (true);

-- ================================================================
-- 9. RLS — Trade Sessions
-- ================================================================
ALTER TABLE trade_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read own trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Authenticated insert trade_sessions" ON trade_sessions;
DROP POLICY IF EXISTS "Participants update own trade_sessions" ON trade_sessions;

-- Only participants in the session can read it
CREATE POLICY "Participants read own trade_sessions"
ON trade_sessions FOR SELECT
USING (auth.uid()::text = creator_id::text OR auth.uid()::text = participant_id::text);

-- Only the authenticated accepter (participant) can insert a session
CREATE POLICY "Authenticated insert trade_sessions"
ON trade_sessions FOR INSERT
WITH CHECK (auth.uid()::text = participant_id::text);

-- Both participants can update (confirm/reject/close)
CREATE POLICY "Participants update own trade_sessions"
ON trade_sessions FOR UPDATE
USING (auth.uid()::text = creator_id::text OR auth.uid()::text = participant_id::text);

-- ================================================================
-- 10. RLS — Trade Messages
-- ================================================================
ALTER TABLE trade_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session participants read messages" ON trade_messages;
DROP POLICY IF EXISTS "Session participants send messages" ON trade_messages;

-- Only session participants can read messages
CREATE POLICY "Session participants read messages"
ON trade_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trade_sessions s
    WHERE s.id::text = trade_messages.session_id::text
    AND (auth.uid()::text = s.creator_id::text OR auth.uid()::text = s.participant_id::text)
  )
);

-- Only session participants can send messages into active sessions
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
-- 11. RLS — Advertising Requests
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
-- 12. RLS — Profiles
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

-- ================================================================
-- 13. RLS — Audit Tables
-- ================================================================
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read role_audit_log" ON role_audit_log;
DROP POLICY IF EXISTS "Staff insert role_audit_log" ON role_audit_log;
DROP POLICY IF EXISTS "Staff read moderation_audit_log" ON moderation_audit_log;
DROP POLICY IF EXISTS "Staff insert moderation_audit_log" ON moderation_audit_log;

CREATE POLICY "Staff read role_audit_log"
ON role_audit_log FOR SELECT
USING (true);

CREATE POLICY "Staff insert role_audit_log"
ON role_audit_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff read moderation_audit_log"
ON moderation_audit_log FOR SELECT
USING (true);

CREATE POLICY "Staff insert moderation_audit_log"
ON moderation_audit_log FOR INSERT
WITH CHECK (true);
```

---

## 2. Enable Realtime for Trade Tables

Go to your **Supabase Dashboard → Database → Replication → supabase_realtime publication** and enable the following tables:

- `trade_sessions`
- `trade_messages`
- `trade_ads`

Or run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE trade_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_ads;
```

---

## 3. Table Summary & RLS Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `trade_ads` | Public (true) | Auth members (creator_id NOT NULL) | Public (true) | Restricted |
| `trade_sessions` | Participants only | Participant only (participant_id = auth.uid()) | Both participants | Restricted |
| `trade_messages` | Session participants only | Session participants in active session | NONE | NONE |
| `advertising_requests` | Public | Public | Public | Restricted |
| `profiles` | Public | Self Auth | Self Auth | Restricted |
| `role_audit_log` | Staff | Append-Only | NONE | NONE |
| `moderation_audit_log` | Staff | Append-Only | NONE | NONE |
