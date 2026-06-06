import * as jose from 'jose'

export type AccessJwtPayload = {
  sub: string
  email: string
}

function getSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret || secret.length < 16) {
    return null
  }
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: AccessJwtPayload): Promise<string | null> {
  const key = getSecretKey()
  if (!key) return null
  return new jose.SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key)
}

export async function verifyAccessToken(
  token: string | undefined
): Promise<{ ok: true; payload: AccessJwtPayload } | { ok: false }> {
  if (!token) return { ok: false }
  const key = getSecretKey()
  if (!key) return { ok: false }
  try {
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] })
    const sub = payload.sub
    const email = payload.email
    if (typeof sub !== 'string' || typeof email !== 'string') return { ok: false }
    return { ok: true, payload: { sub, email } }
  } catch {
    return { ok: false }
  }
}
