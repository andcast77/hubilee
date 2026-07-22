import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAuthPost = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/client', () => ({
  authApi: {
    post: (...args: unknown[]) => mockAuthPost(...args),
    get: vi.fn(),
  },
}))

import { codeLogin, floorLogin, login } from '../authService'

const OK_ENVELOPE = {
  success: true,
  data: {
    user: { id: 'u1', email: null, name: 'Caja', role: 'USER' },
    companyId: 'c1',
  },
}

describe('Pos authService — unified /login only', () => {
  beforeEach(() => {
    mockAuthPost.mockReset()
    mockAuthPost.mockResolvedValue(OK_ENVELOPE)
  })

  it('login posts email credentials to /login', async () => {
    await login({ email: 'owner@empresa.com', password: 'secret' })
    expect(mockAuthPost).toHaveBeenCalledWith('/login', {
      email: 'owner@empresa.com',
      password: 'secret',
    })
    const paths = mockAuthPost.mock.calls.map((c) => c[0] as string)
    expect(paths.every((p) => p === '/login')).toBe(true)
    expect(paths.some((p) => p.includes('floor-login'))).toBe(false)
  })

  it('codeLogin posts userCode to /login (never /floor-login)', async () => {
    await codeLogin({
      userCode: '12345678',
      password: 'pin-secret',
      captchaToken: 'turnstile-ok',
    })
    expect(mockAuthPost).toHaveBeenCalledWith('/login', {
      userCode: '12345678',
      password: 'pin-secret',
      captchaToken: 'turnstile-ok',
    })
    const path = mockAuthPost.mock.calls[0]?.[0] as string
    expect(path).toBe('/login')
    expect(path).not.toContain('floor-login')
  })

  it('deprecated floorLogin alias also posts to /login only', async () => {
    await floorLogin({ userCode: '87654321', password: 'pin-secret' })
    const path = mockAuthPost.mock.calls[0]?.[0] as string
    expect(path).toBe('/login')
    expect(JSON.stringify(mockAuthPost.mock.calls)).not.toContain('floor-login')
  })
})
