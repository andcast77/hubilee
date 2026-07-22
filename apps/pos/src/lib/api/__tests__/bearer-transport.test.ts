import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiError } from '@hubilee/shared'
import type { AuthTransport } from '@hubilee/shared'

/**
 * Transport-selection and refresh logic for the desktop Bearer auth path
 * (design `sdd/web-desktop-vite-tauri/design` ADR-A2/ADR-A3, PR4).
 *
 * These tests exercise `ApiClient` directly (not `platform.ts`) so the
 * cookie-vs-bearer contract is verified independently of the Electron
 * detection seam. `platform.test.ts` covers the `isDesktop()`-driven
 * transport selection built on top of this.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createBearerTransport(overrides: Partial<Extract<AuthTransport, { mode: 'bearer' }>> = {}) {
  return {
    mode: 'bearer' as const,
    getAccessToken: vi.fn(async () => 'access-1'),
    getRefreshToken: vi.fn(async () => 'refresh-1'),
    onRotated: vi.fn(async () => {}),
    onAuthCleared: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('ApiClient auth transport (PR4 desktop Bearer)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('cookie mode (default, no authTransport) sends no Authorization/X-Client header — web regression guard', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }))
    const client = new ApiClient('https://api.test')

    await client.get('/v1/pos/products')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/v1/pos/products')
    const headers = new Headers(init.headers)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.has('X-Client')).toBe(false)
    expect(init.credentials).toBe('include')
  })

  it('bearer mode attaches Authorization and X-Client headers on every request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }))
    const transport = createBearerTransport()
    const client = new ApiClient('https://api.test', { authTransport: transport })

    await client.get('/v1/pos/products')

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer access-1')
    expect(headers.get('X-Client')).toBe('desktop')
  })

  it('persists tokens present in a successful bearer response (e.g. login/register/mfa)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { user: { id: '1' }, tokens: { accessToken: 'a2', refreshToken: 'r2' } },
      }),
    )
    const transport = createBearerTransport()
    const client = new ApiClient('https://api.test', { authTransport: transport })

    await client.post('/v1/auth/login', { email: 'a', password: 'b' })

    expect(transport.onRotated).toHaveBeenCalledWith({ accessToken: 'a2', refreshToken: 'r2' })
  })

  it('bearer mode: a 401 triggers refresh with the stored refresh token in the body, then retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: 'Unauthorized' }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: { tokens: { accessToken: 'a2', refreshToken: 'r2' } } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }))

    const transport = createBearerTransport()
    const client = new ApiClient('https://api.test', { refreshOn401: true, authTransport: transport })

    const result = await client.get<{ success: boolean; data: { ok: boolean } }>('/v1/pos/products')

    expect(result.data.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1]
    expect(refreshUrl).toBe('https://api.test/v1/auth/refresh')
    expect(JSON.parse(refreshInit.body as string)).toEqual({ refreshToken: 'refresh-1' })
    const refreshHeaders = new Headers(refreshInit.headers)
    expect(refreshHeaders.get('X-Client')).toBe('desktop')

    expect(transport.onRotated).toHaveBeenCalledWith({ accessToken: 'a2', refreshToken: 'r2' })

    const [, retryInit] = fetchMock.mock.calls[2]
    const retryHeaders = new Headers(retryInit.headers)
    expect(retryHeaders.get('Authorization')).toBe('Bearer access-1')
  })

  it('bearer mode: an invalid refresh clears stored tokens and rejects with the original 401 (no infinite retry)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: 'Sesión no encontrada' }))

    const transport = createBearerTransport()
    const client = new ApiClient('https://api.test', { refreshOn401: true, authTransport: transport })

    await expect(client.get('/v1/pos/products')).rejects.toThrow(ApiError)
    expect(transport.onAuthCleared).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bearer mode: no stored refresh token clears the session without calling the refresh endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { success: false, error: 'Unauthorized' }))
    const transport = createBearerTransport({ getRefreshToken: vi.fn(async () => null) })
    const client = new ApiClient('https://api.test', { refreshOn401: true, authTransport: transport })

    await expect(client.get('/v1/pos/products')).rejects.toThrow(ApiError)
    expect(transport.onAuthCleared).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cookie mode refresh path (existing behavior) stays an empty-body POST with no X-Client header', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { refreshed: true } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }))

    const client = new ApiClient('https://api.test', { refreshOn401: true })
    const result = await client.get<{ success: boolean; data: { ok: boolean } }>('/v1/pos/products')

    expect(result.data.ok).toBe(true)
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1]
    expect(refreshUrl).toBe('https://api.test/v1/auth/refresh')
    expect(refreshInit.body).toBe('{}')
    const refreshHeaders = new Headers(refreshInit.headers)
    expect(refreshHeaders.has('X-Client')).toBe(false)
  })
})
