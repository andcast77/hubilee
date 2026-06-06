import type { NextRequest } from 'next/server'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

async function requireUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const v = await verifyAccessToken(token)
  if (!v.ok) return null
  return v.payload.sub
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function GET(
  request: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>
) {
  const userId = await requireUserId(request)
  if (!userId) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'No autenticado.' },
      { status: 401 }
    )
  }

  const { id } = await context.params

  // Verificar que el profesional pertenece al usuario
  const professional = await prisma.professional.findFirst({
    where: { id, accountOwnerId: userId },
    select: { id: true },
  })
  if (!professional) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Profesional no encontrado.' },
      { status: 404 }
    )
  }

  const total = await prisma.expediente.count({
    where: {
      OR: [
        { principalProfessionalId: id },
        { secondProfessionalId: id },
        { actuantes: { some: { professionalId: id } } },
      ],
    },
  })

  return jsonWithCors(request, { count: total }, { status: 200 })
}
