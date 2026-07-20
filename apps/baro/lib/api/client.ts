import { ApiClient as SharedApiClient } from '@hubilee/shared'
import type { LoginResponse } from '@hubilee/contracts'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const apiClient = new SharedApiClient(API_URL, { refreshOn401: true })

export const authApi = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient.get<T>(`/v1/auth${endpoint}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.post<T>(`/v1/auth${endpoint}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.put<T>(`/v1/auth${endpoint}`, data, options),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiClient.delete<T>(`/v1/auth${endpoint}`, undefined, options),
  login: (email: string, password: string) =>
    apiClient.post<{ success: boolean; data?: LoginResponse; message?: string; error?: string }>(
      '/v1/auth/login',
      { email, password }
    ),
  logout: () =>
    apiClient.post<{ success: boolean; message?: string; error?: string }>('/v1/auth/logout'),
  refresh: () =>
    apiClient.post<{ success: boolean; message?: string; error?: string }>('/v1/auth/refresh', {}),
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    apiClient.post<{ success: boolean; message?: string; error?: string }>('/v1/auth/password', {
      currentPassword,
      newPassword,
      confirmPassword,
    }),
}

export const baroApi = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient.get<T>(`/v1/baro${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.post<T>(`/v1/baro${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiClient.put<T>(`/v1/baro${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, data, options),
  patch: async <T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> => {
    const path = `/v1/baro${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const url = `${API_URL}${path}`
    const headers = new Headers(options?.headers)
    headers.set('Content-Type', 'application/json')
    let response = await fetch(url, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    })
    if (response.status === 401) {
      await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      response = await fetch(url, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: data !== undefined ? JSON.stringify(data) : undefined,
        ...options,
      })
    }
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return response.json() as Promise<T>
  },
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiClient.delete<T>(`/v1/baro${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, undefined, options),
}

export type { ApiResponse } from '@hubilee/contracts'
