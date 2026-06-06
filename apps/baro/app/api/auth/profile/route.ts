import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import { verifyAccessToken } from '@/lib/auth/jwt'
import {
  type FullProfessionalProfile,
  professionalProfileApiShape,
  professionalProfileUpsertSchema,
  setPrincipalSchema,
  toPublicProfessionalProfile,
} from '@/lib/professional/profile'
import { omit } from '@/lib/utils'
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

/**
 * Perfil titular (`User.titularProfessionalId`). Mismo esquema que colaboradores.
 */
export async function GET(request: NextRequest) {
  const userId = await requireUserId(request)
  if (!userId) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'No autenticado.' },
      { status: 401 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { titularProfessionalId: true },
    })

    if (!user?.titularProfessionalId) {
      return jsonWithCors(request, { profile: null, publicMembrete: null }, { status: 200 })
    }

    const profile = await prisma.professional.findFirst({
      where: { id: user.titularProfessionalId, accountOwnerId: userId },
      include: { registrations: { orderBy: registrationOrderBy } },
    })

    if (!profile) {
      return jsonWithCors(request, { profile: null, publicMembrete: null }, { status: 200 })
    }

    const shaped = professionalProfileApiShape(profile as FullProfessionalProfile)
    const full = { ...shaped, userId } as FullProfessionalProfile & { userId: string }
    return jsonWithCors(
      request,
      {
        profile: full,
        publicMembrete: toPublicProfessionalProfile(profile as FullProfessionalProfile),
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('[GET /api/auth/profile]', e)
    return jsonWithCors(
      request,
      {
        error: 'server_error',
        message: 'No pudimos cargar el perfil. Comprobá la base de datos o probá de nuevo.',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId(request)
  if (!userId) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'No autenticado.' },
      { status: 401 }
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

  const parsed = professionalProfileUpsertSchema.safeParse(body)

  // Primero verificar si es un cambio de principal
  const setParsed = setPrincipalSchema.safeParse(body)
  if (setParsed.success) {
    const { profesionalPrincipalId } = setParsed.data
    // Verificar que el profesional pertenece al usuario
    const professional = await prisma.professional.findFirst({
      where: { id: profesionalPrincipalId, accountOwnerId: userId },
      select: { id: true },
    })
    if (!professional) {
      return jsonWithCors(
        request,
        { error: 'not_found', message: 'Profesional no encontrado o no pertenece a tu cuenta.' },
        { status: 404 }
      )
    }
    await prisma.user.update({
      where: { id: userId },
      data: { titularProfessionalId: profesionalPrincipalId },
    })
    return jsonWithCors(request, { message: 'Profesional principal actualizado.' }, { status: 200 })
  }

  if (!parsed.success) {
    return jsonWithCors(
      request,
      {
        error: 'validation_error',
        message: 'Revisá los datos del formulario.',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    )
  }

  const registrationCreates = parsed.data.registrations.map((r) => ({
    licenseNumber: r.licenseNumber,
    jurisdiction: r.jurisdiction,
    bodyName: r.bodyName,
  }))

  const fields = omit(parsed.data, 'registrations')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { titularProfessionalId: true },
  })

  let professionalId = user?.titularProfessionalId ?? null

  if (professionalId) {
    const titularOwned = await prisma.professional.findFirst({
      where: { id: professionalId, accountOwnerId: userId },
      select: { id: true },
    })
    if (!titularOwned) {
      await prisma.user.update({
        where: { id: userId },
        data: { titularProfessionalId: null },
      })
      professionalId = null
    }
  }

  try {
    if (professionalId) {
      await prisma.professional.update({
        where: { id: professionalId },
        data: {
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
        },
      })
    } else {
      const created = await prisma.professional.create({
        data: {
          accountOwnerId: userId,
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
          registrations: { create: registrationCreates },
        },
      })
      professionalId = created.id
      await prisma.user.update({
        where: { id: userId },
        data: { titularProfessionalId: professionalId },
      })
    }

    const saved = await prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      include: { registrations: { orderBy: registrationOrderBy } },
    })

    const shaped = professionalProfileApiShape(saved as FullProfessionalProfile)
    const full = { ...shaped, userId } as FullProfessionalProfile & { userId: string }
    return jsonWithCors(
      request,
      {
        profile: full,
        publicMembrete: toPublicProfessionalProfile(saved as FullProfessionalProfile),
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('[PATCH /api/auth/profile]', e)
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return jsonWithCors(
          request,
          {
            error: 'conflict',
            message:
              'Conflicto al guardar (dato duplicado). Refrescá la página o probá con otros valores.',
          },
          { status: 409 }
        )
      }
      if (e.code === 'P2025') {
        return jsonWithCors(
          request,
          {
            error: 'not_found',
            message: 'No encontramos el perfil titular. Refrescá la página y volvé a intentar.',
          },
          { status: 404 }
        )
      }
    }
    return jsonWithCors(
      request,
      {
        error: 'server_error',
        message:
          'No pudimos guardar el perfil. Si sigue fallando, refrescá la página o probá más tarde.',
      },
      { status: 500 }
    )
  }
}
