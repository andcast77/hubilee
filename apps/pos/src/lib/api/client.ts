import { ApiClient as SharedApiClient } from '@hubilee/shared'
import type { MeResponse } from '@hubilee/contracts'
import { createApiClientOptions } from '@/lib/platform'

// API Client for POS Frontend
// Points to unified API with module prefixes (all requests go to external API, not Next.js routes)

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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

// Cookie transport (web, default) or Bearer transport backed by Tauri secure
// storage (desktop) — see `sdd/web-desktop-vite-tauri/design` ADR-A3 and
// `platform.ts`. `createApiClientOptions()` returns `{}` on web, so this is
// byte-identical to `new SharedApiClient(API_URL)` there.
const sharedClient = new SharedApiClient(API_URL, createApiClientOptions())

/** Auth headers for fetch to external API (e.g. FormData uploads). */
export function getAuthHeaders(): HeadersInit {
  return {}
}

// Unified API Client
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => sharedClient.get<T>(endpoint, withStoreIdHeader(options)),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    sharedClient.post<T>(endpoint, data, withStoreIdHeader(options)),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    sharedClient.put<T>(endpoint, data, withStoreIdHeader(options)),
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
}

export const accountApi = {
  acceptPrivacy: () =>
    apiClient.post<{ success: boolean; message?: string }>('/v1/account/accept-privacy', {}),
}

// Company members API (usuarios de la empresa - misma lista en Hr y Pos)
export const companiesApi = {
  getMembers: <T>(companyId: string) => apiClient.get<T>(`/v1/companies/${companyId}/members`),
  createMember: <T>(
    companyId: string,
    data: {
      email: string
      password: string
      firstName?: string
      lastName?: string
      membershipRole: 'ADMIN' | 'USER'
      storeIds?: string[]
    }
  ) => apiClient.post<T>(`/v1/companies/${companyId}/members`, data),
  updateMemberStores: <T>(companyId: string, userId: string, storeIds: string[]) =>
    apiClient.put<T>(`/v1/companies/${companyId}/members/${userId}/stores`, { storeIds }),
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
