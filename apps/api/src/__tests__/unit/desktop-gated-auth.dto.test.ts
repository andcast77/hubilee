import { describe, expect, it } from 'vitest'
import { refreshBodySchema } from '../../dto/auth.dto.js'
import { isDesktopClient } from '../../controllers/v1/auth.controller.js'

describe('refreshBodySchema', () => {
  it('accepts an empty body (refreshToken optional)', () => {
    const parsed = refreshBodySchema.safeParse({})
    expect(parsed.success).toBe(true)
  })

  it('accepts a body with a refreshToken string', () => {
    const parsed = refreshBodySchema.safeParse({ refreshToken: 'some-refresh-token' })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.refreshToken).toBe('some-refresh-token')
  })

  it('rejects an empty string refreshToken', () => {
    const parsed = refreshBodySchema.safeParse({ refreshToken: '' })
    expect(parsed.success).toBe(false)
  })
})

describe('isDesktopClient', () => {
  function requestWithHeaders(headers: Record<string, string | undefined>) {
    return { headers } as unknown as Parameters<typeof isDesktopClient>[0]
  }

  it('returns true only for exact "x-client: desktop" header', () => {
    expect(isDesktopClient(requestWithHeaders({ 'x-client': 'desktop' }))).toBe(true)
  })

  it('returns false when header is absent', () => {
    expect(isDesktopClient(requestWithHeaders({}))).toBe(false)
  })

  it('returns false for a different x-client value', () => {
    expect(isDesktopClient(requestWithHeaders({ 'x-client': 'web' }))).toBe(false)
  })

  it('returns false for a case-mismatched value (exact match required)', () => {
    expect(isDesktopClient(requestWithHeaders({ 'x-client': 'Desktop' }))).toBe(false)
  })
})
