import { AuthUser } from '../types';
import { safeFetchJson } from './apiHelper';

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
  let bodyPayload: { identifier: string; password?: string };

  if (typeof identifierOrCredentials === 'string') {
    bodyPayload = {
      identifier: identifierOrCredentials,
      password: maybePassword,
    };
  } else {
    bodyPayload = {
      identifier: identifierOrCredentials.identifier || identifierOrCredentials.username || '',
      password: identifierOrCredentials.password,
    };
  }

  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.success || !res.data?.success || !res.data.user) {
    return {
      success: false,
      error: res.data?.error || res.error || 'Invalid username or password.',
    };
  }

  setStoredUser(res.data.user);
  return { success: true, user: res.data.user };
}

export async function apiSignup(
  usernameOrData: string | { username: string; email?: string; password?: string; displayName?: string },
  maybePassword?: string,
  maybeEmail?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  let bodyPayload: { username: string; email?: string; password?: string; displayName?: string };

  if (typeof usernameOrData === 'string') {
    bodyPayload = {
      username: usernameOrData,
      password: maybePassword,
      email: maybeEmail || `${usernameOrData.toLowerCase()}@valuenet.local`,
    };
  } else {
    bodyPayload = {
      username: usernameOrData.username,
      email: usernameOrData.email || `${usernameOrData.username.toLowerCase()}@valuenet.local`,
      password: usernameOrData.password,
      displayName: usernameOrData.displayName,
    };
  }

  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.success || !res.data?.success || !res.data.user) {
    return {
      success: false,
      error: res.data?.error || res.error || 'Failed to create account.',
    };
  }

  setStoredUser(res.data.user);
  return { success: true, user: res.data.user };
}

export const apiRegister = apiSignup;

export async function apiLogout(): Promise<void> {
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
  const token = getAuthToken();
  if (!token) return null;

  const res = await safeFetchJson<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.success && res.data?.success && res.data.user) {
    setStoredUser(res.data.user);
    return res.data.user;
  }

  setStoredUser(null);
  return null;
}

export async function apiForgotPassword(
  email: string
): Promise<{ success: boolean; message?: string; code?: string; error?: string }> {
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
