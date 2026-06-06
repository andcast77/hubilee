import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'
import { summarizeProfessionalTitles } from '@/lib/professional/registration-pick'

/** Sesión debe ser datos actuales, no desde cachés de rutas intermedias */
export const dynamic = 'force-dynamic'

function emailVerifiedToIso(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

const TRANSIENT_PRISMA = new Set<string>([
  'P1001', // Can't reach database server
  'P1002', // Db connection timeout
  'P1017', // Server closed connection
  'P2024', // Timed out fetching connection from pool
])

function isTransientPrisma(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA.has(err.code)
  }
  if (err instanceof Error && err.constructor.name === 'PrismaClientInitializationError') {
    return true
  }
  return false
}

async function withDbRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (e) {
    if (!isTransientPrisma(e)) throw e
    await new Promise((r) => setTimeout(r, 400))
    return await op()
  }
}

type MePayload = {
  user: {
    id: string
    email: string
    emailVerified: string | null
  }
  profile: {
    displayName: string
    professionalTitle: 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR'
    titleGrammarGender: 'MASCULINO' | 'FEMENINO'
    titularProfessionalId: string
  } | null
}

async function loadMePayload(userId: string): Promise<MePayload | null> {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        titularProfessionalId: true,
      },
    })
  )

  if (!user) return null

  const { titularProfessionalId, emailVerified, ...userRest } = user

  let profile: MePayload['profile'] = null

  if (titularProfessionalId) {
    const titular = await withDbRetry(() =>
      prisma.professional.findFirst({
        where: { id: titularProfessionalId, accountOwnerId: user.id },
        include: {
          registrations: {
            orderBy: [{ jurisdiction: 'asc' as const }, { licenseNumber: 'asc' as const }],
          },
        },
      })
    )
    if (titular) {
      const t = summarizeProfessionalTitles(titular.professionalTitle, titular.sexo)
      profile = {
        displayName: titular.displayName,
        professionalTitle: t.professionalTitle,
        titleGrammarGender: t.titleGrammarGender,
        titularProfessionalId,
      }
    }
  }

  return {
    user: {
      ...userRest,
      emailVerified: emailVerifiedToIso(emailVerified),
    },
    profile,
  }
}

function devErrorExtras(e: unknown): Record<string, string | undefined> {
  if (process.env.NODE_ENV === 'production') return {}
  const out: Record<string, string | undefined> = {}
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    out.prisma_code = e.code
    try {
      out.prisma_meta = JSON.stringify(e.meta ?? null).slice(0, 400)
    } catch {
      out.prisma_meta = undefined
    }
  }
  if (e instanceof Error) {
    out.debug = `${e.name}: ${e.message}`.slice(0, 800)
    const cause = (e as Error & { cause?: unknown }).cause
    if (cause instanceof Error) {
      out.cause = `${cause.name}: ${cause.message}`.slice(0, 400)
    }
  } else if (e != null && typeof e === 'object' && 'message' in e) {
    out.debug = String((e as { message: unknown }).message).slice(0, 800)
  } else {
    out.debug = String(e).slice(0, 800)
  }
  return out
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ACCESS_COOKIE)?.value
    const v = await verifyAccessToken(token)
    if (!v.ok) {
      return jsonWithCors(
        request,
        { error: 'unauthorized', message: 'No autenticado.' },
        {
          status: 401,
        }
      )
    }

    const snapshot = await loadMePayload(v.payload.sub)

    if (!snapshot) {
      return jsonWithCors(
        request,
        { error: 'unauthorized', message: 'No autenticado.' },
        {
          status: 401,
        }
      )
    }

    return jsonWithCors(request, snapshot, { status: 200 })
  } catch (e) {
    console.error('[GET /api/auth/me]', e)

    if (isTransientPrisma(e)) {
      return jsonWithCors(
        request,
        {
          error: 'service_unavailable',
          message: 'No pudimos conectar con la base de datos. Probá de nuevo en unos segundos.',
          ...devErrorExtras(e),
        },
        { status: 503 }
      )
    }

    const body: Record<string, unknown> = {
      error: 'server_error',
      message: 'No pudimos cargar tu cuenta. Probá de nuevo en unos minutos.',
      ...devErrorExtras(e),
    }

    return jsonWithCors(request, body, { status: 500 })
  }
}
