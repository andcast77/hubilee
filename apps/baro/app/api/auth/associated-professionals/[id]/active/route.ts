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

export async function PATCH(
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

  // Obtener el profesional principal actual del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { titularProfessionalId: true },
  })

  // Verificar que no sea el principal
  if (user?.titularProfessionalId === id) {
    return jsonWithCors(
      request,
      { error: 'is_principal', message: 'No podés desactivar al profesional principal.' },
      { status: 400 }
    )
  }

  // Verificar que el profesional pertenece al usuario
  const professional = await prisma.professional.findFirst({
    where: { id, accountOwnerId: userId },
    select: { id: true, active: true },
  })
  if (!professional) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Profesional no encontrado.' },
      { status: 404 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonWithCors(
      request,
      { error: 'invalid_json', message: 'Cuerpo JSON inválido.' },
      { status: 400 }
    )
  }

  // Solo aceptar active
  if (typeof body !== 'object' || body === null || !('active' in body)) {
    return jsonWithCors(
      request,
      { error: 'invalid_body', message: 'Falta el campo active.' },
      { status: 400 }
    )
  }

  const { active } = body as { active: boolean }

  try {
    await prisma.professional.update({
      where: { id },
      data: { active },
    })
    return jsonWithCors(request, { success: true, active }, { status: 200 })
  } catch (e) {
    console.error('[PATCH /api/auth/associated-professionals/[id]/active]', e)
    return jsonWithCors(
      request,
      { error: 'server_error', message: 'No pudimos cambiar el estado.' },
      { status: 500 }
    )
  }
}
