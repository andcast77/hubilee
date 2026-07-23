import { ApiClient as SharedApiClient } from '@hubilee/shared'
import type { MeResponse } from '@hubilee/contracts'
import { createApiClientOptions } from '@/lib/platform'

// API Client for POS Frontend
// Client-side: relative URL → Next.js rewrite proxy (/v1/* → localhost:3000) → same-origin → no CORS.
// Server-side (SSR): absolute URL → direct API access (no proxy available on server).
// Override with NEXT_PUBLIC_API_URL for custom deployments.
//
// IMPORTANT: Google OAuth, popup bridge origin checks, and other flows that need
// a real absolute URL must import ABSOLUTE_API_URL instead.

export const API_URL = process.env.NEXT_PUBLIC_API_URL
  ?? (typeof window === 'undefined' ? "http://localhost:3000" : '');

/** Absolute API base URL — always absolute; never overridden to '' on client side.
 *  Use this for Google OAuth redirects, popup bridge origin checks, and other
 *  flows that need a real URL (not the Next.js rewrite proxy). */
export const ABSOLUTE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** Current store ID for X-Store-Id header (set by StoreContext). */
declare global {
  interface Window {
    __POS_STORE_ID?: string | null
  }
}
function getStoreIdHeader(): string | null {
  if (typeof window === 'undefined') return null
  const id = window.__POS_STORE_ID
  return id && typeof id === 'string' && id.trim() ? id.trim() : null
}

function withStoreIdHeader(options?: RequestInit): RequestInit {
  const storeId = getStoreIdHeader()
  if (!storeId) return options ?? {}

  const headers = new Headers(options?.headers)
  if (!headers.has('X-Store-Id')) headers.set('X-Store-Id', storeId)

  return { ...(options ?? {}), headers }
}

// Cookie transport (web, default) or Bearer transport backed by Electron
// secure storage (desktop) — see `pos-desktop-auth-transport` / platform.ts.
// Options come from `createApiClientOptions()`: web `{ refreshOn401: true }`,
// desktop `{ refreshOn401: true, authTransport: bearer }`.
const sharedClient = new SharedApiClient(API_URL, createApiClientOptions())

/** Same origin/credentials as main client, but no refresh-on-401 — guest login/register probes. */
const guestProbeClient = new SharedApiClient(API_URL, { refreshOn401: false })

/** Auth headers for fetch to external API (e.g. FormData uploads). */
export function getAuthHeaders(): HeadersInit {
  return {}
}

/** PATCH helper — SharedApiClient has no patch; cookie transport for web POS. */
async function patchJson<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
  const init = withStoreIdHeader(options)
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    try {
      const errorData = (await response.json()) as { error?: string; message?: string }
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // ignore non-JSON
    }
    throw new Error(errorMessage)
  }
  return response.json() as Promise<T>
}

// Unified API Client
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => sharedClient.get<T>(endpoint, withStoreIdHeader(options)),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    sharedClient.post<T>(endpoint, data, withStoreIdHeader(options)),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    sharedClient.put<T>(endpoint, data, withStoreIdHeader(options)),
  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    patchJson<T>(endpoint, data, options),
  delete: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    sharedClient.delete<T>(endpoint, data, withStoreIdHeader(options)),
}

// POS API Client (uses /v1/pos prefix — will be renamed to /v1/pos in API task)
export const posApi = {
  get: <T>(endpoint: string, options?: RequestInit) => apiClient.get<T>(`/v1/pos${endpoint}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiClient.post<T>(`/v1/pos${endpoint}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiClient.put<T>(`/v1/pos${endpoint}`, data, options),
  delete: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiClient.delete<T>(`/v1/pos${endpoint}`, data, options),
}

// Auth API Client (uses /v1/auth prefix)
export const authApi = {
  get: <T>(endpoint: string, options?: RequestInit) => apiClient.get<T>(`/v1/auth${endpoint}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiClient.post<T>(`/v1/auth${endpoint}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiClient.put<T>(`/v1/auth${endpoint}`, data, options),
  delete: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.delete<T>(`/v1/auth${endpoint}`, data, options),
  me: () => apiClient.get<MeResponse>('/v1/auth/me'),
  /**
   * GET /v1/auth/me without refresh-on-401. For login/register “already logged in?” checks only.
   * Unauthenticated users still get 401 once (expected); avoids an extra POST /v1/auth/refresh 401.
   */
  meGuestProbe: () => guestProbeClient.get<MeResponse>('/v1/auth/me'),
}

export const accountApi = {
  acceptPrivacy: () =>
    apiClient.post<{ success: boolean; message?: string }>('/v1/account/accept-privacy', {}),
}

// Company members API (usuarios de la empresa - misma lista en Hr y Pos)
export const companiesApi = {
  /** GET /v1/companies/:id — full company record (name, taxId, address, phone, logo). */
  get: <T>(companyId: string) => apiClient.get<T>(`/v1/companies/${companyId}`),
  /** PUT /v1/companies/:id — update company fiscal profile (name, taxId, address?, phone?, logo?). */
  update: <T>(companyId: string, data: Record<string, unknown>) =>
    apiClient.put<T>(`/v1/companies/${companyId}`, data),
  getMembers: <T>(companyId: string) => apiClient.get<T>(`/v1/companies/${companyId}/members`),
  getCredentials: <T>(companyId: string) =>
    apiClient.get<T>(`/v1/companies/${companyId}/credentials`),
  createMember: <T>(
    companyId: string,
    data: {
      email?: string
      password: string
      firstName?: string
      lastName?: string
      membershipRole: 'ADMIN' | 'USER'
      storeIds?: string[]
    }
  ) => apiClient.post<T>(`/v1/companies/${companyId}/members`, data),
  updateMemberStores: <T>(companyId: string, userId: string, storeIds: string[]) =>
    apiClient.put<T>(`/v1/companies/${companyId}/members/${userId}/stores`, { storeIds }),
  resetMemberPassword: <T>(companyId: string, userId: string, password: string) =>
    apiClient.put<T>(`/v1/companies/${companyId}/members/${userId}/password`, { password }),
  attachMemberEmail: <T>(companyId: string, userId: string, email: string) =>
    apiClient.patch<T>(`/v1/companies/${companyId}/members/${userId}/email`, { email }),
}

// Generic API response types
export type ApiResult<T> =
  | {
      success: true
      data: T
      message?: string
      code?: string
      details?: unknown
    }
  | {
      success: false
      error?: string
      message?: string
      code?: string
      details?: unknown
      data?: T
    }

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
