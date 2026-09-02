// API helper for unified client-server fetch operations with token handling

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('valuenet_auth_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('valuenet_auth_token', token);
    } else {
      localStorage.removeItem('valuenet_auth_token');
    }
  } catch {
    // ignore
  }
}

export async function fetchApi<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string; [key: string]: unknown }> {
  try {
    const headers = new Headers(options.headers || {});
    const token = getStoredToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string }).error || `Request failed with status ${response.status}`,
        ...data,
      };
    }
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network request failed';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (errBody as { error?: string }).error || `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network failure',
    };
  }
}

