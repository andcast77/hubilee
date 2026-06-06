import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, isAuthenticatedRequest, isAuthEnabled } from '@/lib/auth/client'

const publicRoutes = ['/', '/login', '/register']

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/api/')

  if (isPublic) {
    return NextResponse.next()
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value
  if (await isAuthenticatedRequest(token)) {
    return NextResponse.next()
  }

  const login = new URL('/login', request.url)
  login.searchParams.set('from', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
}
