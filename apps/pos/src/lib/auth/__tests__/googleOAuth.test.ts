import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { safeNextPath, startGoogleOAuth } from '../googleOAuth'

describe('safeNextPath', () => {
  it('allows same-origin paths only', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard')
    expect(safeNextPath('/app/sales')).toBe('/app/sales')
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
  })
})

describe('startGoogleOAuth', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'http://localhost:3002',
        assign: vi.fn(),
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('navigates to API Google start with login intent and returnOrigin', () => {
    startGoogleOAuth({ intent: 'login', next: '/dashboard' })
    expect(window.location.assign).toHaveBeenCalled()
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('/v1/auth/google')
    expect(url).toContain('intent=login')
    expect(url).toContain(encodeURIComponent('http://localhost:3002'))
    expect(url).toContain('next=%2Fdashboard')
  })

  it('navigates with register intent', () => {
    startGoogleOAuth({ intent: 'register' })
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('intent=register')
  })
})
