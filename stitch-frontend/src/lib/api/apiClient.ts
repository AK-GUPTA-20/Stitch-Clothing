// src/lib/api/apiClient.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Token Storage Abstraction ────────────────────────────────────────────────
// Centralises all localStorage access for tokens so it's easy to migrate
// to httpOnly cookies / in-memory storage in the future.
export const tokenStore = {
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setAccess: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  },
  setRefresh: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  },
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// ── Error Class ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ── Core Request ──────────────────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = tokenStore.getAccess();

  const headers = new Headers(options.headers || {});

  if (options.body instanceof FormData) {
    // Let the browser set Content-Type with boundary automatically for FormData
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error: any) {
    throw new ApiError(0, error?.message || 'Network error: Failed to fetch', error);
  }

  // ── Token Refresh ────────────────────────────────────────────────────────
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/user/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.accessToken) {
            tokenStore.setAccess(refreshData.accessToken);
            if (refreshData.refreshToken) {
              tokenStore.setRefresh(refreshData.refreshToken);
            }
            // Retry the original request with the new token
            headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
            response = await fetch(url, { ...options, headers });
          } else {
            // Refresh succeeded but returned no token — treat as failure
            tokenStore.clear();
            window.location.href = '/login';
            return Promise.reject(new ApiError(401, 'Session expired. Please log in again.'));
          }
        } else {
          // Refresh failed — clear tokens and redirect
          tokenStore.clear();
          window.location.href = '/login';
          return Promise.reject(new ApiError(401, 'Session expired. Please log in again.'));
        }
      } catch {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(new ApiError(401, 'Session expired. Please log in again.'));
      }
    }
  }

  let data = await response.json().catch(() => null);

  // SANITIZE DATA globally to prevent any legacy localhost image URLs from breaking the site
  if (data) {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.includes('http://localhost:4000') 
          ? "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80" 
          : obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = sanitize(obj[key]);
        }
        return newObj;
      }
      return obj;
    };
    data = sanitize(data);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data as { message?: string })?.message || response.statusText,
      data
    );
  }

  return data as T;
}

// ── API Client ────────────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Upload a file (multipart/form-data). Does NOT set Content-Type so the
   * browser fills in the correct boundary string automatically.
   */
  uploadFile: <T>(endpoint: string, formData: FormData): Promise<T> =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
    }),
};
