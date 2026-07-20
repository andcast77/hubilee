import type { NextRequest } from 'next/server'

function getRequestInfo(request: NextRequest) {
  const ipHeader =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip')

  const ip = typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : 'unknown'

  return {
    ip,
    path: request.nextUrl?.pathname ?? 'unknown',
    method: request.method ?? 'unknown',
  }
}

export const SecurityLogger = {
  unauthorizedAccess: (request: NextRequest) => {
    const info = getRequestInfo(request)
    console.warn('[SECURITY] Unauthorized access', info)
  },
  tokenInvalid: (request: NextRequest) => {
    const info = getRequestInfo(request)
    console.warn('[SECURITY] Invalid token', info)
  },
}
