import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Returns the environment-aware canonical site URL for auth redirects.
 * In browser: uses current window.location.origin (e.g. https://value-net-ten.vercel.app or http://localhost:3000)
 * In SSR / fallback: uses VITE_SITE_URL / VITE_APP_URL env vars or production default.
 */
export function getCanonicalSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin !== 'null' && origin.startsWith('http')) {
      return origin;
    }
  }
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL.replace(/\/$/, '');
  }
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL.replace(/\/$/, '');
  }
  return 'https://value-net-ten.vercel.app';
}

// Safe client fallback: will not crash at module evaluation time
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

