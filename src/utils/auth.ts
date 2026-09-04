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

/**
 * Maps raw Supabase or server error responses to human-friendly messages.
 */
function mapAuthError(err: any): string {
  if (!err) return 'An error occurred during authentication.';
  const msg = typeof err === 'string' ? err : err.message || '';
  const code = err.code || err.status || '';
  const lowerMsg = msg.toLowerCase();

  if (code === 'over_email_send_rate_limit' || code === '429' || lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
    return 'Too many authentication attempts right now. Please wait a few minutes before trying again.';
  }

  if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid_credentials') || lowerMsg.includes('wrong password')) {
    return 'Incorrect email/username or password.';
  }

  if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('unconfirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for the confirmation link.';
  }

  if (lowerMsg.includes('user already registered') || lowerMsg.includes('already exists')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  if (lowerMsg.includes('password') && lowerMsg.includes('short')) {
    return 'Password must be at least 6 characters long.';
  }

  if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('failed to fetch')) {
    return 'Unable to reach VALUE.NET servers. Please check your internet connection and try again.';
  }

  return msg || 'Authentication failed. Please try again.';
}

/**
 * Ensures a user profile exists in the Supabase `profiles` table idempotently.
 */
export async function apiEnsureProfile(
  userId: string,
  data: { username: string; email: string; displayName?: string }
): Promise<{ success: boolean; profile?: any; error?: string }> {
  if (!userId || userId === 'local-trader') return { success: false, error: 'Invalid user ID' };

  try {
    // 1. Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      // Profile exists! Safely fill any missing email or username
      const updates: Record<string, any> = {};
      if (!existing.email && data.email) updates.email = data.email.trim().toLowerCase();
      if (!existing.username && data.username) updates.username = data.username.trim();

      if (Object.keys(updates).length > 0) {
        const { data: updated } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .maybeSingle();
        return { success: true, profile: updated || existing };
      }
      return { success: true, profile: existing };
    }

    // 2. Profile does not exist — Create new profile row safely
    const cleanUsername = data.username.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanDisplayName = (data.displayName || cleanUsername).trim();

    const newProfile = {
      id: userId,
      username: cleanUsername,
      display_name: cleanDisplayName,
      email: cleanEmail,
      role: 'MEMBER',
      avatar_url: 'person',
      banner_url: 'midnight',
      bio: '',
      status: 'ONLINE',
      title_id: 'trader',
      trading_style: 'Fair Trades',
      profile_theme: 'midnight',
      show_profile: true,
      show_preferences: true,
      show_activity: true,
      show_trade_stats: true,
      server: 'Sea 3',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .maybeSingle();

    if (!insertErr && inserted) {
      return { success: true, profile: inserted };
    }

    // Handle potential duplicate username constraint violation
    if (insertErr?.code === '23505' || insertErr?.message?.includes('unique') || insertErr?.message?.includes('duplicate')) {
      const uniqueUsername = `${cleanUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: retryInserted, error: retryErr } = await supabase
        .from('profiles')
        .insert({ ...newProfile, username: uniqueUsername })
        .select()
        .maybeSingle();

      if (!retryErr && retryInserted) {
        return { success: true, profile: retryInserted };
      }
    }

    console.warn('apiEnsureProfile insert warning:', insertErr?.message);
    return { success: false, error: insertErr?.message || 'Failed to initialize user profile.' };
  } catch (err: any) {
    console.error('apiEnsureProfile error:', err);
    return { success: false, error: err.message };
  }
}

export async function apiLogin(
  identifierOrCredentials: string | { identifier?: string; username?: string; password?: string },
  maybePassword?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  let identifier = '';
  let password = '';

  if (typeof identifierOrCredentials === 'string') {
    identifier = identifierOrCredentials.trim();
    password = maybePassword || '';
  } else {
    identifier = (identifierOrCredentials.identifier || identifierOrCredentials.username || '').trim();
    password = identifierOrCredentials.password || '';
  }

  if (!identifier || !password) {
    return { success: false, error: 'Please enter your email or username and password.' };
  }

  // 1. Supabase Auth Direct Integration
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      let emailToUse = identifier;

      // If user typed a Roblox username (no '@'), look up their registered email in profiles table
      if (!identifier.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, id, username')
          .ilike('username', identifier)
          .maybeSingle();

        if (profile?.email) {
          emailToUse = profile.email;
        } else {
          // Alternative exact match lookup
          const { data: exactProfile } = await supabase
            .from('profiles')
            .select('email, id, username')
            .eq('username', identifier)
            .maybeSingle();

          if (exactProfile?.email) {
            emailToUse = exactProfile.email;
          }
        }
      } else {
        emailToUse = identifier.toLowerCase();
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (!authErr && authData?.user) {
        // Ensure profile exists in Supabase DB for this user
        const usernameFallback = identifier.includes('@') ? authData.user.email?.split('@')[0] || 'user' : identifier;
        const profileRes = await apiEnsureProfile(authData.user.id, {
          username: usernameFallback,
          email: authData.user.email || emailToUse,
          displayName: usernameFallback,
        });

        const userProfile = profileRes.profile;

        const authUser: AuthUser = {
          id: authData.user.id,
          username: userProfile?.username || usernameFallback,
          displayName: userProfile?.display_name || userProfile?.username || usernameFallback,
          email: authData.user.email || emailToUse,
          avatarUrl: userProfile?.avatar_url || 'person',
          token: authData.session?.access_token || 'sb-token',
          role: (userProfile?.role as any) || 'MEMBER',
          profile: (userProfile as any) || {
            id: authData.user.id,
            username: usernameFallback,
            displayName: usernameFallback,
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

        setStoredUser(authUser);
        return { success: true, user: authUser };
      } else if (authErr) {
        return { success: false, error: mapAuthError(authErr) };
      }
    } catch (sbErr: any) {
      console.warn('Supabase Auth error:', sbErr);
      return { success: false, error: mapAuthError(sbErr) };
    }
  }

  // 2. Local Express Server Fallback
  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.success || !res.data?.success || !res.data.user) {
    const rawError = res.data?.error || res.error || 'Invalid credentials.';
    const sanitizedError = rawError.includes('500') || rawError.includes('HTTP')
      ? 'Incorrect email/username or password.'
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
    username = usernameOrData.trim();
    password = maybePassword || '';
    email = (maybeEmail || '').trim().toLowerCase();
    displayName = username;
  } else {
    username = (usernameOrData.username || '').trim();
    email = (usernameOrData.email || '').trim().toLowerCase();
    password = usernameOrData.password || '';
    displayName = (usernameOrData.displayName || username).trim();
  }

  if (!username) {
    return { success: false, error: 'Trading username is required.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (!email || !email.includes('@')) {
    return { success: false, error: 'A valid email address is required to create an account.' };
  }

  // Supabase Signup Direct Integration
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      // Pre-check if username is already taken in profiles table
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', username)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: `Username '${username}' is already taken. Please choose a different username.` };
      }

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
        // Ensure profile row is inserted into DB profiles table
        const profileRes = await apiEnsureProfile(authData.user.id, {
          username,
          email,
          displayName,
        });

        const userProfile = profileRes.profile;

        const authUser: AuthUser = {
          id: authData.user.id,
          username: userProfile?.username || username,
          displayName: userProfile?.display_name || displayName,
          email,
          avatarUrl: 'person',
          token: authData.session?.access_token || 'sb-token',
          role: 'MEMBER',
          profile: (userProfile as any) || {
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

        const isConfirmed = !!authData.user.email_confirmed_at || !!authData.session;
        if (isConfirmed) {
          setStoredUser(authUser);
          return { success: true, user: authUser };
        } else {
          return {
            success: true,
            user: authUser,
            confirmationRequired: true,
            email,
            message: 'Account created! Check your email inbox to confirm your account before signing in.',
          };
        }
      } else if (authErr) {
        return { success: false, error: mapAuthError(authErr) };
      }
    } catch (sbErr: any) {
      console.warn('Supabase Signup error:', sbErr);
      return { success: false, error: mapAuthError(sbErr) };
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
        return { success: false, error: mapAuthError(error) };
      }
    } catch (err: any) {
      return { success: false, error: mapAuthError(err) };
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
        const usernameFallback = stored?.username || sbUser.email?.split('@')[0] || 'user';

        // Ensure profile exists defensively
        const profileRes = await apiEnsureProfile(sbUser.id, {
          username: usernameFallback,
          email: sbUser.email || '',
          displayName: usernameFallback,
        });

        const userProfile = profileRes.profile;

        if (userProfile) {
          const authUser: AuthUser = {
            id: sbUser.id,
            username: userProfile.username || usernameFallback,
            displayName: userProfile.display_name || userProfile.username || usernameFallback,
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
        return { success: false, error: mapAuthError(error) };
      }
    } catch (err: any) {
      return { success: false, error: mapAuthError(err) };
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
