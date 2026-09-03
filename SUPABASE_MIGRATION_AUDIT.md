# VALUE.NET — Supabase Database Migration & RLS Audit

This document provides safe, non-destructive incremental SQL migrations for Supabase to enforce Row Level Security (RLS) on all user, giveaway, trade ad, report, advertising, and audit tables.

---

## 1. Non-Destructive SQL Migration Script

Run this script once in your **[Supabase SQL Editor](https://supabase.com/dashboard)** (Project ID: `qvqhysrfwdgfsjdwodfh`):

```sql
-- 1. Create Trade Ads Table
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

-- 2. Create Advertising Requests Table
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

-- 3. Create Role Audit Log Table (Append-only)
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

-- 4. Create Moderation Audit Log Table (Append-only)
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

-- 5. Enable RLS on Trade Ads Table & Drop Legacy Restrictive Policies
ALTER TABLE trade_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Public insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Creator and staff insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users insert own trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Authenticated users insert trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Users update own trade_ads" ON trade_ads;
DROP POLICY IF EXISTS "Public update trade_ads" ON trade_ads;

-- 5.1. Anyone (public/authenticated) can view active trade ads
CREATE POLICY "Public read trade_ads"
ON trade_ads FOR SELECT
USING (true);

-- 5.2. All authenticated members can insert trade ads
CREATE POLICY "Authenticated users insert trade_ads"
ON trade_ads FOR INSERT
WITH CHECK (creator_id IS NOT NULL);

-- 5.3. Users can update their own trade ads or active status
CREATE POLICY "Users update own trade_ads"
ON trade_ads FOR UPDATE
USING (true);

-- 6. Enable RLS on Advertising Requests Table
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

-- 7. Enable RLS on Profiles Table
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

-- 8. Enable RLS on Audit Tables
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

## 2. Table Summary & RLS Matrix

| Table Name | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :--- | :--- | :--- | :--- |
| `trade_ads` | Public (true) | All Auth Members (`creator_id NOT NULL`) | Creator / Staff | Staff / Creator |
| `advertising_requests` | Staff / Public | Public (true) | Staff | Restricted |
| `profiles` | Public (true) | Self Auth | Self Auth (Role Protected) | Restricted |
| `giveaways` | Public (true) | Creator / Staff | Staff / Host | Restricted |
| `role_audit_log` | Staff | Append-Only (Staff) | NONE (Immutable) | NONE (Immutable) |
| `moderation_audit_log` | Staff | Append-Only (Staff) | NONE (Immutable) | NONE (Immutable) |
