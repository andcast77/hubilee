import { afterEach, describe, expect, it, vi } from 'vitest'
import { env } from '../env'

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads VITE_API_URL from import.meta.env', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test')
    expect(env.apiUrl).toBe('https://api.example.test')
  })

  it('falls back to an empty string when a VITE_* var is missing', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(env.apiUrl).toBe('')
  })

  it('exposes all pos VITE_* mirrors of the former NEXT_PUBLIC_* contract', () => {
    vi.stubEnv('VITE_HUB_URL', 'https://hub.example.test')
    vi.stubEnv('VITE_POS_URL', 'https://pos.example.test')
    vi.stubEnv('VITE_TECHSERVICES_URL', 'https://techservices.example.test')
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'turnstile-key')
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'vapid-key')
    vi.stubEnv('VITE_HR_URL', 'https://hr.example.test')

    expect(env.hubUrl).toBe('https://hub.example.test')
    expect(env.posUrl).toBe('https://pos.example.test')
    expect(env.techservicesUrl).toBe('https://techservices.example.test')
    expect(env.turnstileSiteKey).toBe('turnstile-key')
    expect(env.vapidPublicKey).toBe('vapid-key')
    expect(env.hrUrl).toBe('https://hr.example.test')
  })
})
