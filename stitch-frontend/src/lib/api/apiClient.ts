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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Network error: Failed to fetch';
    throw new ApiError(0, msg, error);
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

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data as { message?: string })?.message || response.statusText,
      data
    );
  }

  // Transparently unwrap the new standardized ResponseFormatter format
  if (data && typeof data === 'object' && (data.status === 'success' || data.success === true) && 'data' in data) {
    // If it's an array, ALWAYS return an object so `res.data` is accessible
    if (Array.isArray(data.data)) {
      return {
        success: true,
        data: data.data,
        pagination: data.meta?.pagination || (typeof data.total === 'number' ? {
          total: data.total,
          page: data.page,
          totalPages: data.pages,
        } : undefined),
        total: data.meta?.pagination?.total ?? data.total ?? data.count ?? data.data.length,
        page: data.meta?.pagination?.page ?? data.page ?? 1,
        pages: data.meta?.pagination?.totalPages ?? data.pages ?? 1,
        count: data.data.length
      } as unknown as T;
    }
    
    // If it's an object with keys (e.g. { user, token }), unpack it but keep success
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      return {
        success: true,
        ...data.data,
      } as unknown as T;
    }

    return data.data as T;
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
