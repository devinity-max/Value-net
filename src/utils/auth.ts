import { AuthUser } from '../types';
import { safeFetchJson } from './apiHelper';
import { supabase, getCanonicalSiteUrl } from '../lib/supabaseClient';

const AUTH_USER_STORAGE_KEY = 'valuenet_auth_user';

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  const user = getStoredUser();
  return user?.token || null;
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to update stored user:', err);
  }
}

export async function apiLogin(
  identifierOrCredentials: string | { identifier?: string; username?: string; password?: string },
  maybePassword?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  let identifier = '';
  let password = '';

  if (typeof identifierOrCredentials === 'string') {
    identifier = identifierOrCredentials;
    password = maybePassword || '';
  } else {
    identifier = identifierOrCredentials.identifier || identifierOrCredentials.username || '';
    password = identifierOrCredentials.password || '';
  }

  // 1. Supabase Auth Direct Integration
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      let emailToUse = identifier;
      if (!identifier.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, id, username')
          .eq('username', identifier)
          .maybeSingle();
        if (profile?.email) {
          emailToUse = profile.email;
        }
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (!authErr && authData?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        const authUser: AuthUser = {
          id: authData.user.id,
          username: userProfile?.username || authData.user.email?.split('@')[0] || 'user',
          displayName: userProfile?.display_name || userProfile?.username || 'Trader',
          email: authData.user.email || '',
          avatarUrl: userProfile?.avatar_url || 'person',
          token: authData.session?.access_token || 'sb-token',
          role: (userProfile?.role as any) || 'MEMBER',
          profile: userProfile as any || {
            id: authData.user.id,
            username: userProfile?.username || 'user',
            displayName: userProfile?.display_name || 'Trader',
            role: userProfile?.role || 'MEMBER',
            avatarUrl: 'person',
            bannerUrl: 'midnight',
            bio: '',
            status: 'ONLINE',
            titleId: 'trader',
            tradingStyle: 'Fair Trades',
            lookingFor: [],
            notInterestedIn: [],
            profileTheme: 'midnight',
            showProfile: true,
            showPreferences: true,
            showActivity: true,
            showTradeStats: true,
            server: 'Sea 3',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };

        setStoredUser(authUser);
        return { success: true, user: authUser };
      } else if (authErr) {
        console.warn('Supabase Auth response:', authErr.message);
        return { success: false, error: authErr.message || 'Invalid username/email or password.' };
      }
    } catch (sbErr: any) {
      console.warn('Supabase Auth error:', sbErr);
      return { success: false, error: sbErr?.message || 'Authentication error occurred.' };
    }
  }

  // 2. Local Express Server Fallback
  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.success || !res.data?.success || !res.data.user) {
    const rawError = res.data?.error || res.error || 'Invalid username/email or password.';
    const sanitizedError = rawError.includes('500') || rawError.includes('HTTP')
      ? 'Invalid username/email or password.'
      : rawError;
    return {
      success: false,
      error: sanitizedError,
    };
  }

  setStoredUser(res.data.user);
  return { success: true, user: res.data.user };
}

export async function apiSignup(
  usernameOrData: string | { username: string; email?: string; password?: string; displayName?: string },
  maybePassword?: string,
  maybeEmail?: string
): Promise<{ success: boolean; user?: AuthUser; confirmationRequired?: boolean; email?: string; message?: string; error?: string }> {
  let username = '';
  let email = '';
  let password = '';
  let displayName = '';

  if (typeof usernameOrData === 'string') {
    username = usernameOrData;
    password = maybePassword || '';
    email = maybeEmail || `${username.toLowerCase()}@valuenet.local`;
    displayName = username;
  } else {
    username = usernameOrData.username;
    email = usernameOrData.email || `${usernameOrData.username.toLowerCase()}@valuenet.local`;
    password = usernameOrData.password || '';
    displayName = usernameOrData.displayName || username;
  }

  // Supabase Signup Direct Integration
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const redirectUrl = `${getCanonicalSiteUrl()}/?auth=confirmed`;
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            displayName,
          },
        },
      });

      if (!authErr && authData?.user) {
        const authUser: AuthUser = {
          id: authData.user.id,
          username,
          displayName,
          email,
          avatarUrl: 'person',
          token: authData.session?.access_token || 'sb-token',
          role: 'MEMBER',
          profile: {
            id: authData.user.id,
            username,
            displayName,
            role: 'MEMBER',
            avatarUrl: 'person',
            bannerUrl: 'midnight',
            bio: '',
            status: 'ONLINE',
            titleId: 'trader',
            tradingStyle: 'Fair Trades',
            lookingFor: [],
            notInterestedIn: [],
            profileTheme: 'midnight',
            showProfile: true,
            showPreferences: true,
            showActivity: true,
            showTradeStats: true,
            server: 'Sea 3',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };

        // Determine if user is confirmed/authenticated immediately (Option A / Email Confirmation Disabled)
        const isConfirmed = !!authData.user.email_confirmed_at || !!authData.session;
        if (isConfirmed) {
          setStoredUser(authUser);
          return { success: true, user: authUser };
        } else {
          // Email confirmation is required by Supabase Auth configuration (Option B)
          return {
            success: true,
            user: authUser,
            confirmationRequired: true,
            email,
            message: 'Account created! Check your email inbox to confirm your account before signing in.',
          };
        }
      } else if (authErr) {
        console.warn('Supabase Signup error:', authErr.message);
        return { success: false, error: authErr.message || 'Failed to create account.' };
      }
    } catch (sbErr: any) {
      console.warn('Supabase Signup error:', sbErr);
      return { success: false, error: sbErr?.message || 'Failed to create account.' };
    }
  }

  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, displayName }),
  });

  if (!res.success || !res.data?.success || !res.data.user) {
    const rawError = res.data?.error || res.error || 'Failed to create account.';
    const sanitizedError = rawError.includes('500') || rawError.includes('HTTP')
      ? 'Failed to create account. Please check your information and try again.'
      : rawError;
    return {
      success: false,
      error: sanitizedError,
    };
  }

  setStoredUser(res.data.user);
  return { success: true, user: res.data.user };
}

export const apiRegister = apiSignup;

export async function apiResendConfirmationEmail(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const redirectUrl = `${getCanonicalSiteUrl()}/?auth=confirmed`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (!error) {
        return { success: true, message: 'Confirmation email sent! Please check your inbox.' };
      } else {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend confirmation email.' };
    }
  }
  return { success: false, error: 'Authentication service not available.' };
}

export async function apiLogout(): Promise<void> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
  const token = getAuthToken();
  if (token) {
    try {
      await safeFetchJson('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {}
  }
  setStoredUser(null);
}

export async function apiGetMe(): Promise<AuthUser | null> {
  const stored = getStoredUser();
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (userProfile) {
          const authUser: AuthUser = {
            id: sbUser.id,
            username: userProfile.username || sbUser.email?.split('@')[0] || 'user',
            displayName: userProfile.display_name || userProfile.username || 'Trader',
            email: sbUser.email || '',
            avatarUrl: userProfile.avatar_url || 'person',
            token: stored?.token || 'sb-token',
            role: (userProfile.role as any) || 'MEMBER',
            profile: userProfile as any,
          };
          setStoredUser(authUser);
          return authUser;
        }
      }
    } catch {}
  }

  if (stored) return stored;
  return null;
}

export async function apiForgotPassword(
  email: string
): Promise<{ success: boolean; message?: string; code?: string; error?: string }> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const redirectUrl = `${getCanonicalSiteUrl()}/?auth=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (!error) {
        return { success: true, message: 'Password reset instructions sent to your email.' };
      } else {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to request password reset.' };
    }
  }

  const res = await safeFetchJson<{ success: boolean; message?: string; code?: string; error?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }
  );

  if (!res.success || !res.data?.success) {
    return {
      success: false,
      error: res.data?.error || res.error || 'Failed to request password reset.',
    };
  }

  return {
    success: true,
    message: res.data.message,
    code: res.data.code,
  };
}

export async function apiResetPassword(data: {
  email?: string;
  code?: string;
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (!error) {
        return { success: true, message: 'Your password has been successfully reset.' };
      }
    } catch {}
  }

  const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
    '/api/auth/reset-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

  if (!res.success || !res.data?.success) {
    return {
      success: false,
      error: res.data?.error || res.error || 'Failed to reset password.',
    };
  }

  return {
    success: true,
    message: res.data.message,
  };
}
