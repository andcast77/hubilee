export type ApiClientOptions = {
  /** On 401, POST `/v1/auth/refresh` once then retry the request (cookie-based sessions). */
  refreshOn401?: boolean
}

const GENERIC_HTTP_ERROR_PHRASES = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Conflict',
  'Unprocessable Entity',
  'Too Many Requests',
  'Internal Server Error',
  'Service Unavailable',
])

function resolveApiErrorMessage(errorData: Record<string, unknown>): string | undefined {
  const errStr = typeof errorData.error === 'string' ? errorData.error.trim() : ''
  const msgStr = typeof errorData.message === 'string' ? errorData.message.trim() : ''
  const code = typeof errorData.code === 'string' ? errorData.code : undefined

  if (msgStr && (genericHttpError(errStr) || (code && msgStr !== errStr))) {
    return msgStr
  }
  if (code && msgStr) return msgStr
  if (errStr && !genericHttpError(errStr)) return errStr
  if (msgStr) return msgStr
  if (errStr) return errStr
  return undefined
}

function genericHttpError(value: string): boolean {
  return GENERIC_HTTP_ERROR_PHRASES.has(value)
}

/**
 * Shared API client — sends httpOnly session cookie via credentials (API must set CORS origin).
 */
export class ApiClient {
  constructor(
    private baseURL: string,
    private clientOptions?: ApiClientOptions,
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers = new Headers(options.headers)
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const fetchOnce = () =>
      fetch(url, {
        headers,
        credentials: 'include',
        ...options,
      })

    let response = await fetchOnce()

    if (
      response.status === 401 &&
      this.clientOptions?.refreshOn401 === true &&
      !endpoint.startsWith('/v1/auth/refresh')
    ) {
      const refreshRes = await fetch(`${this.baseURL}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (refreshRes.ok) {
        response = await fetchOnce()
      }
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`
      let code: string | undefined
      let retryAfterSeconds: number | undefined
      try {
        const errorData = (await response.json()) as Record<string, unknown>
        if (typeof errorData.code === 'string') code = errorData.code
        if (typeof errorData.retryAfterSeconds === 'number') retryAfterSeconds = errorData.retryAfterSeconds
        const resolved = resolveApiErrorMessage(errorData)
        if (resolved) errorMessage = resolved
      } catch {
        // Response body is not JSON
      }
      throw new ApiError(errorMessage, response.status, code, retryAfterSeconds)
    }

    return response.json()
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async delete<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Use credentials: 'include' for API calls; optional Bearer for server-side scripts. */
export function getAuthHeaders(bearerToken?: string | null): HeadersInit {
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}
}

/**
 * Create a prefixed API client for a specific module.
 * Usage: createPrefixedApi(client, '/v1/shopflow')
 */
export function createPrefixedApi(client: ApiClient, prefix: string) {
  const normalize = (ep: string) => ep.startsWith('/') ? ep : `/${ep}`
  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      client.get<T>(`${prefix}${normalize(endpoint)}`, options),
    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
      client.post<T>(`${prefix}${normalize(endpoint)}`, data, options),
    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
      client.put<T>(`${prefix}${normalize(endpoint)}`, data, options),
    delete: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
      client.delete<T>(`${prefix}${normalize(endpoint)}`, data, options),
  }
}

export type PrefixedApi = ReturnType<typeof createPrefixedApi>

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
