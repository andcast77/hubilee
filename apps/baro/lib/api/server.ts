import 'server-only'

import { cookies } from 'next/headers'
import { ApiClient } from '@hubilee/shared'
import type { ApiResponse } from '@hubilee/contracts'

const API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function forwardCookieHeader(): Promise<HeadersInit> {
  const jar = await cookies()
  const parts = jar.getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
  return parts.length > 0 ? { Cookie: parts.join('; ') } : {}
}

function serverClient() {
  return new ApiClient(API_URL, { refreshOn401: true })
}

async function withCookies(options?: RequestInit): Promise<RequestInit> {
  const cookieHeaders = await forwardCookieHeader()
  return {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...cookieHeaders,
    },
  }
}

export async function serverAuthGet<T>(endpoint: string): Promise<T> {
  return serverClient().get<T>(`/v1/auth${endpoint}`, await withCookies())
}

export async function serverAuthPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return serverClient().post<T>(`/v1/auth${endpoint}`, data, await withCookies())
}

export async function serverBaroGet<T>(endpoint: string): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return serverClient().get<T>(`/v1/baro${path}`, await withCookies())
}

export async function serverBaroPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return serverClient().post<T>(`/v1/baro${path}`, data, await withCookies())
}

export async function serverBaroPut<T>(endpoint: string, data?: unknown): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return serverClient().put<T>(`/v1/baro${path}`, data, await withCookies())
}

export async function serverBaroPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_URL}/v1/baro${path}`
  const cookieHeaders = await forwardCookieHeader()
  const headers = new Headers({ 'Content-Type': 'application/json', ...cookieHeaders })
  let response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (response.status === 401) {
    await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cookieHeaders },
      body: '{}',
    })
    response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  }
  if (!response.ok) throw new Error(`API Error: ${response.status}`)
  return response.json() as Promise<T>
}

export async function serverBaroDelete<T>(endpoint: string): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return serverClient().delete<T>(`/v1/baro${path}`, undefined, await withCookies())
}

export async function serverBaroGetData<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await serverBaroGet<ApiResponse<T>>(endpoint)
    return res.success && res.data !== undefined ? res.data : null
  } catch {
    return null
  }
}

export async function serverAuthGetData<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await serverAuthGet<ApiResponse<T>>(endpoint)
    return res.success && res.data !== undefined ? res.data : null
  } catch {
    return null
  }
}
