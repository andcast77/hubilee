import type { NextRequest } from 'next/server'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import { professionalProfileUpsertSchema } from '@/lib/professional/profile'
import {
  pickRepresentativeRegistration,
  summarizeProfessionalTitles,
} from '@/lib/professional/registration-pick'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

async function requireUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const v = await verifyAccessToken(token)
  if (!v.ok) return null
  return v.payload.sub
}

const orderByName = { displayName: 'asc' as const }

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

/** Colaboradores del estudio (excluye al titular; mismo modelo de datos que el perfil de Cuenta). */
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
    const titularId = user?.titularProfessionalId

    const items = await prisma.professional.findMany({
      where: {
        accountOwnerId: userId,
        ...(titularId ? { NOT: { id: titularId } } : {}),
      },
      orderBy: orderByName,
      include: {
        registrations: {
          orderBy: [{ jurisdiction: 'asc' as const }, { licenseNumber: 'asc' as const }],
        },
      },
    })
    return jsonWithCors(
      request,
      {
        professionals: items.map((p) => {
          const rep = pickRepresentativeRegistration(p.registrations)
          const { titleGrammarGender } = summarizeProfessionalTitles(p.professionalTitle, p.sexo)
          return {
            id: p.id,
            displayName: p.displayName,
            professionalTitle: p.professionalTitle,
            titleGrammarGender,
            locality: p.locality,
            phone: p.phone,
            professionalEmail: p.professionalEmail,
            addressLine1: p.addressLine1,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            active: p.active,
            primaryMatricula: rep?.licenseNumber ?? null,
            primaryJurisdiction: rep?.jurisdiction ?? null,
            registrations: p.registrations.map((r) => ({
              id: r.id,
              licenseNumber: r.licenseNumber,
              jurisdiction: r.jurisdiction,
              bodyName: r.bodyName,
            })),
          }
        }),
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('[GET /api/auth/associated-professionals]', e)
    return jsonWithCors(
      request,
      { error: 'server_error', message: 'No pudimos cargar el registro de colaboradores.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

  const { registrations, ...fields } = parsed.data
  const registrationCreates = registrations.map((r) => ({
    licenseNumber: r.licenseNumber,
    jurisdiction: r.jurisdiction,
    bodyName: r.bodyName,
  }))

  try {
    const created = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.findUnique({
        where: { id: userId },
        select: { titularProfessionalId: true },
      })
      const professional = await tx.professional.create({
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
        include: {
          registrations: { orderBy: [{ jurisdiction: 'asc' }, { licenseNumber: 'asc' }] },
        },
      })
      if (!owner?.titularProfessionalId) {
        await tx.user.update({
          where: { id: userId },
          data: { titularProfessionalId: professional.id },
        })
      }
      return professional
    })
    return jsonWithCors(request, { professional: created }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/auth/associated-professionals]', e)
    return jsonWithCors(
      request,
      { error: 'server_error', message: 'No pudimos guardar el colaborador.' },
      { status: 500 }
    )
  }
}
