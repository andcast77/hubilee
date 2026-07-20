import { describe, it, expect } from 'vitest'
import { updateNotificationPreferencesSchema } from '../../dto/pos.dto.js'

describe('updateNotificationPreferencesSchema (PLAN-23)', () => {
  it('accepts global channel toggles only', () => {
    const r = updateNotificationPreferencesSchema.safeParse({ inAppEnabled: false })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.inAppEnabled).toBe(false)
  })

  it('accepts per-type preferences only', () => {
    const r = updateNotificationPreferencesSchema.safeParse({
      preferences: {
        LOW_STOCK: { inApp: true, push: false },
        SECURITY: { email: true },
      },
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty body (no fields to update)', () => {
    const r = updateNotificationPreferencesSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('rejects preferences: {} without globals', () => {
    const r = updateNotificationPreferencesSchema.safeParse({ preferences: {} })
    expect(r.success).toBe(false)
  })

  it('rejects unknown keys inside per-type channel object (strict)', () => {
    const r = updateNotificationPreferencesSchema.safeParse({
      preferences: {
        LOW_STOCK: { inApp: true, sms: true } as Record<string, unknown>,
      },
    })
    expect(r.success).toBe(false)
  })
})
