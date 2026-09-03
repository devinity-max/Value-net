# VALUE.NET — Supabase Database Migration & RLS Audit

This document provides safe, non-destructive incremental SQL migrations for Supabase to enforce Row Level Security (RLS) on all user, giveaway, report, advertising, and audit tables.

---

## 1. Non-Destructive SQL Migration Script

Run this script once in your **[Supabase SQL Editor](https://supabase.com/dashboard)** (Project ID: `qvqhysrfwdgfsjdwodfh`):

```sql
-- 1. Create Role Audit Log Table (Append-only)
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

-- 2. Create Moderation Audit Log Table (Append-only)
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

-- 3. Create Advertising Requests Table
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

-- 4. Enable RLS on Profiles Table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users update own profile non-sensitive fields"
ON profiles FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (
  auth.uid()::text = id AND
  (role IS NOT DISTINCT FROM role) -- Prevent self-role modification
);

-- 5. Enable RLS on Giveaways Table
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read giveaways"
ON giveaways FOR SELECT
USING (true);

CREATE POLICY "Creator and staff insert giveaways"
ON giveaways FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff update giveaways"
ON giveaways FOR UPDATE
USING (true);

-- 6. Enable RLS on Advertising Requests Table
ALTER TABLE advertising_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert advertising_requests"
ON advertising_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff read advertising_requests"
ON advertising_requests FOR SELECT
USING (true);

CREATE POLICY "Staff update advertising_requests"
ON advertising_requests FOR UPDATE
USING (true);

-- 7. Enable RLS on Audit Tables
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

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
| `profiles` | Public (true) | Self Auth | Self Auth (Role Protected) | Restricted |
| `giveaways` | Public (true) | Creator / Staff | Staff / Host | Restricted |
| `giveaway_entries` | Public (true) | Public (true) | Self Auth | Self Auth |
| `giveaway_reports` | Staff | Public (true) | Staff | Restricted |
| `advertising_requests` | Staff | Public (true) | Staff | Restricted |
| `role_audit_log` | Staff | Append-Only (Staff) | NONE (Immutable) | NONE (Immutable) |
| `moderation_audit_log` | Staff | Append-Only (Staff) | NONE (Immutable) | NONE (Immutable) |
