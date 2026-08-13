// Shared API client used by the SkillBridge web portal.
//
// IMPORTANT: The web Next.js app previously had its OWN auth endpoints
// (app/api/auth/*) backed by Supabase. That created two separate auth
// backends — the Express API (apps/api) for mobile and Supabase for web.
//
// This client consolidates everything onto the single Express API so both
// mobile + web share one auth + data layer.
//
// The API base URL must be set via NEXT_PUBLIC_API_URL in .env.local.
// In dev it defaults to /api/v1 (same-origin) which Next.js rewrites to the
// Express server on :3001. This keeps requests on the Next.js origin so the
// dev Content Security Policy doesn't block cross-origin fetches.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    profile: '/users/profile',
    updateProfile: '/users/profile',
  },
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    apply: (id: string) => `/projects/${id}/apply`,
    myApplications: '/projects/student/applications',
    match: '/projects/student/match',
    employerProjects: '/projects/employer/projects',
    employerApplications: '/projects/employer/applications',
    employerOverview: '/projects/employer/overview',
    employerCandidates: '/projects/employer/candidates',
    updateApplication: (projectId: string, applicationId: string) =>
      `/projects/${projectId}/applications/${applicationId}`,
    updateStage: (projectId: string, applicationId: string) =>
      `/projects/${projectId}/applications/${applicationId}/stage`,
  },
  admin: {
    overview: '/admin/overview',
    verifications: '/admin/verifications',
    verifyUser: (type: string, id: string) => `/admin/verifications/${type}/${id}`,
    users: '/users',
    opportunities: '/admin/opportunities',
    applications: '/admin/applications',
    deleteUser: (id: string) => `/admin/users/${id}`,
    deleteOpportunity: (id: string) => `/admin/opportunities/${id}`,
    updateApplication: (id: string) => `/admin/applications/${id}`,
  },
} as const;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined>;
}

interface ErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof String)
  );
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  // API_URL is now a same-origin path (e.g. /api/v1) so requests stay on the
  // Next.js origin and pass the dev Content Security Policy. The Next rewrite
  // proxies /api/v1/* -> the Express backend on :3001.
  const base =
    typeof window !== 'undefined' && API_URL.startsWith('/')
      ? `${window.location.origin}${API_URL}`
      : API_URL;
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token, query }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include', // for any cookie-based flows
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (isErrorBody(data) && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    const details = isErrorBody(data) ? data.details : undefined;
    throw new ApiError(message, res.status, details);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth helpers — cookie-based on web but hitting the same Express API.
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'employer' | 'factory' | 'admin' | 'worker';
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
  refreshToken: string;
}

/**
 * Persist the JWT pair in localStorage (web) so the web portal can make
 * authenticated requests to the Express API just like the mobile app does
 * with its bearer tokens.
 */
export function storeToken(token: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
}
