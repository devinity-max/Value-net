# VALUE.NET — VERCEL PRODUCTION DEPLOYMENT GUIDE

**Target Production Supabase Project:** `qvqhysrfwdgfsjdwodfh` (ACTIVE_HEALTHY)  
**Hosting Target:** Vercel (Hobby / Free)  

---

## 1. DATABASE STATUS

> [!IMPORTANT]
> **NO DATABASE MIGRATIONS ARE NEEDED.**  
> Your live Supabase database `qvqhysrfwdgfsjdwodfh` is 100% complete, healthy, and populated with all 25+ tables (including `trade_ads`, `giveaways` with secret code hashing, `fruits` with 43 seeded items, and `devness` as `ROOT_OWNER`).

Do **NOT** run `supabase db reset` or execute any manual SQL scripts against `qvqhysrfwdgfsjdwodfh`.

---

## 2. VERCEL ENVIRONMENT VARIABLES CONFIGURATION

In Vercel -> Project Settings -> **Environment Variables**, configure:

### Public Frontend Variables
- `VITE_SUPABASE_URL`: `https://qvqhysrfwdgfsjdwodfh.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `<anon-key-from-qvqhysrfwdgfsjdwodfh>`

### Private Server Variables
- `SUPABASE_SERVICE_ROLE_KEY`: `<service-role-key-from-qvqhysrfwdgfsjdwodfh>`
- `ROOT_OWNER_EMAIL`: `owner@valuenet.gg`
- `ROOT_OWNER_PASSWORD`: `<your-root-password>`

---

## 3. VERCEL DEPLOYMENT SETTINGS

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** 20.x or 22.x
