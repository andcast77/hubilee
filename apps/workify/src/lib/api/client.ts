import { ApiClient as SharedApiClient } from '@hubilee/shared'

// API Client for Workify Frontend
// All data from central API (NEXT_PUBLIC_API_URL). No internal Next.js API routes for data.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const apiClient = new SharedApiClient(API_URL)

/** Auth headers for fetch (e.g. FormData). */
export function getAuthHeaders(): HeadersInit {
  return {}
}

// Workify API: prefix /v1/workify (central API)
export const workifyApi = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient.get<T>(`/v1/workify${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.post<T>(`/v1/workify${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.put<T>(`/v1/workify${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, data, options),
  delete: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.delete<T>(`/v1/workify${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, data, options),
}

// Auth API: prefix /v1/auth
export const authApi = {
  get: <T>(endpoint: string, options?: RequestInit) => apiClient.get<T>(`/v1/auth${endpoint}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.post<T>(`/v1/auth${endpoint}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.put<T>(`/v1/auth${endpoint}`, data, options),
  delete: <T>(endpoint: string, options?: RequestInit) => apiClient.delete<T>(`/v1/auth${endpoint}`, undefined, options),
}

/** Cuenta (misma instancia ApiClient que auth — cookies de sesión). */
export const accountApi = {
  acceptPrivacy: () =>
    apiClient.post<{ success: boolean; message?: string }>('/v1/account/accept-privacy', {}),
}

// Company members API (usuarios de la empresa - misma lista en Workify y Shopflow)
export const companiesApi = {
  getMembers: <T>(companyId: string) =>
    apiClient.get<T>(`/v1/companies/${companyId}/members`),
  createMember: <T>(companyId: string, data: { email: string; password: string; firstName?: string; lastName?: string; membershipRole: 'ADMIN' | 'USER' }) =>
    apiClient.post<T>(`/v1/companies/${companyId}/members`, data),
}

// Generic API response types (from shared contracts)
export type { ApiResponse } from '@hubilee/contracts'

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
