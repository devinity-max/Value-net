import { AuthUser, UserProfile, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

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

// --- Row -> UserProfile mapping (snake_case DB columns -> camelCase app types) ---
function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as UserRole,
    isGiveawaySuspended: row.is_giveaway_suspended,
    avatarUrl: row.avatar_url || '',
    bannerUrl: row.banner_url || '',
    bio: row.bio || '',
    status: row.status,
    customStatus: row.custom_status ?? undefined,
    titleId: row.title_id || '',
    favoriteFruitId: row.favorite_fruit_id,
    tradingStyle: row.trading_style,
    lookingFor: row.looking_for || [],
    notInterestedIn: row.not_interested_in || [],
    profileTheme: row.profile_theme,
    showProfile: row.show_profile,
    showPreferences: row.show_preferences,
    showActivity: row.show_activity,
    showTradeStats: row.show_trade_stats,
    server: row.server || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    badges: row.badges || [],
  };
}

async function fetchProfileRow(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

async function buildAuthUser(supabaseUser: { id: string; email?: string }, token: string): Promise<AuthUser> {
  const row = await fetchProfileRow(supabaseUser.id);
  const profile = rowToProfile(row);
  return {
    id: supabaseUser.id,
    username: profile.username,
    displayName: profile.displayName,
    email: supabaseUser.email || '',
    avatarUrl: profile.avatarUrl,
    token,
    role: profile.role,
    profile,
  };
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Invalid username/email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email before signing in.';
  if (/user already registered/i.test(message)) return 'Email address is already registered.';
  return message;
}

// --- Client-side validation mirrors the DB trigger's rules (see handle_new_user) ---
const RESERVED_USERNAMES = new Set([
  'admin', 'system', 'valuenet', 'valuenet_admin', 'moderator', 'root', 'blox', 'official', 'support', 'bot',
]);

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) return 'Username must be between 3 and 20 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return 'This username is reserved by the system.';
  return null;
}

export async function apiSignup(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const usernameError = validateUsername(data.username);
  if (usernameError) return { success: false, error: usernameError };
  if (data.password.length < 6) return { success: false, error: 'Password must be at least 6 characters long.' };

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { username: data.username, display_name: data.displayName || data.username },
    },
  });

  if (error) return { success: false, error: friendlyAuthError(error.message) };
  if (!signUpData.session || !signUpData.user) {
    // Email confirmation is required by the project's auth settings — there is no session yet.
    return {
      success: false,
      error: 'Account created. Check your email to confirm your address before signing in.',
    };
  }

  const user = await buildAuthUser(signUpData.user, signUpData.session.access_token);
  setStoredUser(user);
  return { success: true, user };
}

export async function apiLogin(credentials: {
  identifier: string;
  password: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  let email = credentials.identifier.trim();

  if (!email.includes('@')) {
    const { data: resolvedEmail, error: lookupError } = await supabase.rpc('email_for_username', {
      p_username: email,
    });
    if (lookupError || !resolvedEmail) {
      return { success: false, error: 'Invalid username/email or password.' };
    }
    email = resolvedEmail as string;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: credentials.password });
  if (error || !data.session || !data.user) {
    return { success: false, error: friendlyAuthError(error?.message || 'Invalid username/email or password.') };
  }

  const user = await buildAuthUser(data.user, data.session.access_token);
  setStoredUser(user);
  return { success: true, user };
}

export async function apiLogout(): Promise<void> {
  await supabase.auth.signOut();
  setStoredUser(null);
}

export async function apiGetMe(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || !data.session.user) {
    setStoredUser(null);
    return null;
  }

  try {
    const user = await buildAuthUser(data.session.user, data.session.access_token);
    setStoredUser(user);
    return user;
  } catch {
    setStoredUser(null);
    return null;
  }
}

export async function apiForgotPassword(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  // Always return a generic success message, regardless of whether the email exists,
  // to avoid leaking which addresses are registered.
  if (error && !/rate limit/i.test(error.message)) {
    return { success: true, message: 'If an account matches this email, a reset link has been sent.' };
  }
  if (error) {
    return { success: false, error: 'Too many requests — please wait a moment and try again.' };
  }

  return { success: true, message: 'If an account matches this email, a reset link has been sent.' };
}

// Called after the user follows the reset link in their email (Supabase restores a
// recovery session automatically via detectSessionInUrl) and submits a new password.
export async function apiResetPassword(data: {
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (data.newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const { error } = await supabase.auth.updateUser({ password: data.newPassword });
  if (error) {
    return { success: false, error: 'Reset link expired or invalid. Please request a new one.' };
  }

  return { success: true, message: 'Password has been successfully updated.' };
}
