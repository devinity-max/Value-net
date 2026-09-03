# VALUE.NET — Moderation & Role Authorization Security Architecture

This document defines the complete 5-tier role hierarchy, permission matrix, route guards, RLS database rules, and audit logging specifications for **VALUE.NET**.

---

## 1. Role Hierarchy & Inheritance Model

```
ROOT_OWNER (System Owner)
   ↓
ADMIN (Platform Administrator)
   ↓
MODERATOR (Community Staff)
   ↓
APPROVED_CREATOR (Verified Creator & Host)
   ↓
MEMBER (Standard User / Trader)
```

### Protection & Escalation Rules
- **No Self-Role Change**: A user can never modify their own role.
- **No Self-Unban**: A banned user cannot lift their own ban.
- **Hierarchy Boundary Enforcement**:
  - `MODERATOR` cannot moderate `ADMIN` or `ROOT_OWNER`.
  - `ADMIN` cannot assign `ROOT_OWNER` or alter `ROOT_OWNER` users.
  - `APPROVED_CREATOR` and `MEMBER` cannot assign any staff roles.

---

## 2. Permission Matrix

| Feature / Action | MEMBER | CREATOR | MODERATOR | ADMIN | ROOT_OWNER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Use Calc / Trade / Catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enter Giveaways | ✅ | ✅ | ✅ | ✅ | ✅ |
| Host & Manage Giveaways | ❌ | ✅ | ✅ | ✅ | ✅ |
| Access Moderation Center (`/moderation`) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Review Reports & Issue Warnings / Bans | ❌ | ❌ | ✅ (Lower-tier) | ✅ | ✅ |
| Access Admin Center (`/admin`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Catalog Administration | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Site Config & Monetization | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign Roles (`MEMBER`, `CREATOR`, `MODERATOR`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign `ADMIN` / `ROOT_OWNER` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Dedicated Security Boundaries & Routes

1. **Moderation Center (`tab=moderation`)**:
   - Component: `src/components/ModerationCenterView.tsx`
   - Access Guard: `canAccessModeration(currentUser)` (`MODERATOR`, `ADMIN`, `ROOT_OWNER`).
   - Features: Report queue management, privileged user lookup, warning/ban desk with reason requirement, moderation audit logs.

2. **Admin Control Center (`tab=admin`)**:
   - Component: `src/components/OwnerControlView.tsx`
   - Access Guard: `canAccessAdmin(currentUser)` (`ADMIN`, `ROOT_OWNER`).
   - Features: Staff role assignment, site configuration, security logs, catalog admin shortcuts.

3. **Creator Control Center (`tab=host-giveaways`)**:
   - Component: `src/components/HostDashboardView.tsx`
   - Access Guard: `canHostGiveaways(currentUser)` (`APPROVED_CREATOR`, `MODERATOR`, `ADMIN`, `ROOT_OWNER`).

---

## 4. Server-Side & API Protection

- `apiCreateGiveaway()` in `src/utils/giveaways.ts`: Rejects requests if `user.role === 'MEMBER'`.
- `canAssignRole()` in `src/utils/permissions.ts`: Validates acting user weight vs target user weight and requested role.
- All destructive actions (BAN, UNBAN, ROLE_CHANGE) require a mandatory staff reason string for audit logging.

---

## 5. Audit Logging Architecture

Audit records are stored in append-only Supabase tables:
- `role_audit_log`: Tracks `ROLE_ASSIGNED` and `ROLE_REVOKED` actions with `actor_username`, `target_username`, `previous_role`, `new_role`, and `reason`.
- `moderation_audit_log`: Tracks `WARN`, `MUTE`, `SUSPEND`, `BAN`, `UNBAN`, and `RESOLVE_REPORT` staff actions.
