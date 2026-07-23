export type ApiClientOptions = {
  /** On 401, POST `/v1/auth/refresh` once then retry the request. */
  refreshOn401?: boolean
  /**
   * Auth transport strategy (design `sdd/web-desktop-vite-tauri/design` ADR-A3).
   * Defaults to `{ mode: 'cookie' }` — today's exact web behavior (httpOnly
   * session cookie, `credentials: 'include'`, no extra headers). Pass
   * `{ mode: 'bearer', ... }` for desktop (Tauri) clients that have no cookie
   * jar and must carry `Authorization: Bearer <token>` explicitly.
   */
  authTransport?: AuthTransport
}

/**
 * Injectable auth transport (design ADR-A3). `cookie` is the default and is
 * byte-identical to pre-PR4 behavior. `bearer` is used by desktop (Tauri)
 * clients: the access token is attached to every request, and on a 401 the
 * stored refresh token is sent explicitly to `/v1/auth/refresh` (there is no
 * cookie jar to rely on).
 */
export type AuthTransport =
  | { mode: 'cookie' }
  | {
      mode: 'bearer'
      getAccessToken(): Promise<string | null>
      getRefreshToken(): Promise<string | null>
      onRotated(tokens: { accessToken: string; refreshToken: string }): Promise<void>
      onAuthCleared(): Promise<void>
    }

type BearerAuthTransport = Extract<AuthTransport, { mode: 'bearer' }>

type TokenPair = { accessToken: string; refreshToken: string }

function extractTokens(body: unknown): TokenPair | undefined {
  const tokens = (body as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } })?.data?.tokens
  if (tokens?.accessToken && tokens?.refreshToken) {
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
  }
  return undefined
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
    const transport = this.clientOptions?.authTransport
    if (transport?.mode === 'bearer') {
      return this.requestBearer<T>(endpoint, options, transport)
    }

    // --- Cookie mode (web, default) — UNCHANGED from pre-PR4 behavior. ---
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
      !endpoint.startsWith('/v1/auth/refresh') &&
      !endpoint.startsWith('/v1/auth/logout')
    ) {
      const refreshRes = await fetch(`${this.baseURL}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (refreshRes.ok) {
        response = await fetchOnce()
      } else {
        // Stale cookies after DB reset / revoked session: ask API to expire httpOnly jar.
        // Without this, login keeps seeing cookies and re-probes /me in a loop.
        void fetch(`${this.baseURL}/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }).catch(() => {})
      }
    }

    return this.parseResponse<T>(response)
  }

  /** Bearer (desktop) request path — see design ADR-A3. */
  private async requestBearer<T>(
    endpoint: string,
    options: RequestInit,
    transport: BearerAuthTransport,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const buildHeaders = async () => {
      const headers = new Headers(options.headers)
      if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json')
      }
      const accessToken = await transport.getAccessToken()
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
      headers.set('X-Client', 'desktop')
      return headers
    }

    const fetchOnce = async () =>
      fetch(url, {
        credentials: 'include',
        ...options,
        headers: await buildHeaders(),
      })

    let response = await fetchOnce()

    if (
      response.status === 401 &&
      this.clientOptions?.refreshOn401 === true &&
      !endpoint.startsWith('/v1/auth/refresh')
    ) {
      const refreshed = await this.refreshBearerSession(transport)
      if (refreshed) {
        response = await fetchOnce()
      }
    }

    const result = await this.parseResponse<T>(response)
    const tokens = extractTokens(result)
    if (tokens) await transport.onRotated(tokens)
    return result
  }

  /**
   * Desktop has no cookie jar/refresh rotation, so the stored refresh token
   * is sent explicitly in the request body (design ADR-A2). On any failure
   * (missing token, non-OK response, or a response without `data.tokens`),
   * clears the stored session — the caller's next auth-gated read (e.g. the
   * app's `me` query) will surface as unauthenticated and route back to
   * login, matching the spec's "invalid refresh forces re-login" scenario.
   */
  private async refreshBearerSession(transport: BearerAuthTransport): Promise<boolean> {
    const refreshToken = await transport.getRefreshToken()
    if (!refreshToken) {
      await transport.onAuthCleared()
      return false
    }

    const refreshRes = await fetch(`${this.baseURL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Client': 'desktop' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!refreshRes.ok) {
      await transport.onAuthCleared()
      return false
    }

    const body = await refreshRes.json().catch(() => null)
    const tokens = extractTokens(body)
    if (!tokens) {
      await transport.onAuthCleared()
      return false
    }

    await transport.onRotated(tokens)
    return true
  }

  private async parseResponse<T>(response: Response): Promise<T> {
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
 * Usage: createPrefixedApi(client, '/v1/pos')
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
