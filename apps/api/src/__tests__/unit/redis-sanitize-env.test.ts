import { describe, expect, it } from 'vitest'
import { sanitizeEnvValue } from '../../common/cache/redis.js'

describe('sanitizeEnvValue', () => {
  it('strips surrounding double quotes', () => {
    expect(sanitizeEnvValue('"https://tolerant-pika-181700.upstash.io"')).toBe(
      'https://tolerant-pika-181700.upstash.io',
    )
  })

  it('strips surrounding single quotes', () => {
    expect(sanitizeEnvValue("'https://example.upstash.io'")).toBe('https://example.upstash.io')
  })

  it('leaves bare values alone', () => {
    expect(sanitizeEnvValue('https://example.upstash.io')).toBe('https://example.upstash.io')
  })

  it('trims whitespace', () => {
    expect(sanitizeEnvValue('  https://example.upstash.io  ')).toBe('https://example.upstash.io')
  })

  it('returns empty for missing', () => {
    expect(sanitizeEnvValue(undefined)).toBe('')
    expect(sanitizeEnvValue('')).toBe('')
  })
})
