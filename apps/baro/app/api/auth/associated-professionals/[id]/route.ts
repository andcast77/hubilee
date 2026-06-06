import type { NextRequest } from 'next/server'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import {
  professionalProfileUpsertSchema,
  professionalProfileApiShape,
  type FullProfessionalProfile,
} from '@/lib/professional/profile'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

async function requireUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const v = await verifyAccessToken(token)
  if (!v.ok) return null
  return v.payload.sub
}

const registrationOrderBy = [{ jurisdiction: 'asc' as const }, { licenseNumber: 'asc' as const }]

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

  // Allow editing any professional (titular or collaborator) that belongs to this account
  const professional = await prisma.professional.findFirst({
    where: { id, accountOwnerId: userId },
    include: { registrations: { orderBy: registrationOrderBy } },
  })
  if (!professional) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Profesional no encontrado.' },
      { status: 404 }
    )
  }

  const shaped = professionalProfileApiShape(professional as FullProfessionalProfile)
  return jsonWithCors(request, { professional: { ...shaped, userId } }, { status: 200 })
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

  const parsed = professionalProfileUpsertSchema.safeParse(body)
  if (!parsed.success) {
    return jsonWithCors(
      request,
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    )
  }

  // Allow editing any professional (titular or collaborator) that belongs to this account
  const existing = await prisma.professional.findFirst({
    where: { id, accountOwnerId: userId },
  })
  if (!existing) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Profesional no encontrado.' },
      { status: 404 }
    )
  }

  const { registrations, active, ...fields } = parsed.data
  const registrationCreates = registrations.map((r) => ({
    licenseNumber: r.licenseNumber,
    jurisdiction: r.jurisdiction,
    bodyName: r.bodyName,
  }))

  const updateData: Record<string, unknown> = {
    professionalTitle: fields.professionalTitle,
    displayName: fields.displayName,
    dni: fields.dni,
    sexo: fields.sexo,
    phone: fields.phone,
    whatsapp: fields.whatsapp,
    professionalEmail: fields.professionalEmail,
    addressLine1: fields.addressLine1,
    addressLine2: fields.addressLine2,
    locality: fields.locality,
    province: fields.province,
    postalCode: fields.postalCode,
    websiteUrl: fields.websiteUrl,
    cuit: fields.cuit,
    registrations: {
      deleteMany: {},
      create: registrationCreates,
    },
  }

  // Actualizar active si viene en el body
  if (active !== undefined) {
    updateData.active = active
  }

  try {
    await prisma.professional.update({
      where: { id },
      data: updateData,
    })

    const updated = await prisma.professional.findUniqueOrThrow({
      where: { id },
      include: { registrations: { orderBy: registrationOrderBy } },
    })
    const shaped = professionalProfileApiShape(updated as FullProfessionalProfile)
    return jsonWithCors(request, { professional: { ...shaped, userId } }, { status: 200 })
  } catch (e) {
    console.error('[PATCH /api/auth/associated-professionals/[id]]', e)
    return jsonWithCors(
      request,
      { error: 'server_error', message: 'No pudimos actualizar el colaborador.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

  const existing = await prisma.professional.findFirst({
    where: { id, accountOwnerId: userId },
  })
  if (!existing) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Colaborador no encontrado.' },
      { status: 404 }
    )
  }

  // Verificar si tiene expedientes asociados
  const expedientesCount = await prisma.expediente.count({
    where: {
      OR: [
        { principalProfessionalId: id },
        { secondProfessionalId: id },
        { actuantes: { some: { professionalId: id } } },
      ],
    },
  })
  if (expedientesCount > 0) {
    return jsonWithCors(
      request,
      {
        error: 'has_expedientes',
        message: `No podés eliminar: tiene ${expedientesCount} expediente${expedientesCount === 1 ? '' : 's'} asociado${expedientesCount === 1 ? '' : 's'}.`,
      },
      { status: 400 }
    )
  }

  try {
    await prisma.professional.delete({ where: { id } })
    return jsonWithCors(request, { ok: true }, { status: 200 })
  } catch (e) {
    console.error('[DELETE /api/auth/associated-professionals/[id]]', e)
    return jsonWithCors(
      request,
      { error: 'server_error', message: 'No pudimos eliminar el colaborador.' },
      { status: 500 }
    )
  }
}
