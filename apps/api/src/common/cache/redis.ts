import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

/**
 * Vercel / dashboard env pastes often keep dotenv-style quotes as part of the value.
 * Upstash requires a bare `https://…` URL — quoted values throw UrlError.
 */
export function sanitizeEnvValue(raw: string | undefined): string {
  if (raw == null) return ''
  let v = raw.trim()
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

/**
 * Get the Redis client singleton.
 * Returns null if UPSTASH_REDIS_REST_URL is not configured,
 * allowing the app to work without Redis in development.
 */
export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance

  const url = sanitizeEnvValue(process.env.UPSTASH_REDIS_REST_URL)
  const token = sanitizeEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN)

  if (!url || !token) return null

  redisInstance = new Redis({ url, token })
  return redisInstance
}
