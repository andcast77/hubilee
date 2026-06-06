import { prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import type { CreateBaroExpedienteBody, BaroExpedienteResponse, BaroProfessionalResponse } from '../dto/baro.dto.js'

function toProfessional(p: {
  id: string
  companyId: string
  userId: string | null
  displayName: string
  professionalTitle: string
  dni: string
  active: boolean
}): BaroProfessionalResponse {
  return {
    id: p.id,
    companyId: p.companyId,
    userId: p.userId,
    displayName: p.displayName,
    professionalTitle: p.professionalTitle,
    dni: p.dni,
    active: p.active,
  }
}

function toExpediente(e: {
  id: string
  companyId: string
  status: string
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  propietario: string
  principalProfessionalId: string
  secondProfessionalId: string | null
  createdAt: Date
  updatedAt: Date
}): BaroExpedienteResponse {
  return {
    id: e.id,
    companyId: e.companyId,
    status: e.status,
    objetoExpedienteId: e.objetoExpedienteId,
    nomenclaturaCatastral: e.nomenclaturaCatastral,
    propietario: e.propietario,
    principalProfessionalId: e.principalProfessionalId,
    secondProfessionalId: e.secondProfessionalId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }
}

export async function listProfessionals(ctx: CompanyContext): Promise<BaroProfessionalResponse[]> {
  const rows = await prisma.baroProfessional.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { displayName: 'asc' },
  })
  return rows.map(toProfessional)
}

export async function getProfessionalById(ctx: CompanyContext, id: string): Promise<BaroProfessionalResponse | null> {
  const row = await prisma.baroProfessional.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  return row ? toProfessional(row) : null
}

export async function listExpedientes(ctx: CompanyContext): Promise<BaroExpedienteResponse[]> {
  const rows = await prisma.baroExpediente.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { updatedAt: 'desc' },
  })
  return rows.map(toExpediente)
}

export async function getExpedienteById(ctx: CompanyContext, id: string): Promise<BaroExpedienteResponse | null> {
  const row = await prisma.baroExpediente.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  return row ? toExpediente(row) : null
}

export async function createExpediente(
  ctx: CompanyContext,
  body: CreateBaroExpedienteBody
): Promise<BaroExpedienteResponse> {
  const principal = await prisma.baroProfessional.findFirst({
    where: { id: body.principalProfessionalId, companyId: ctx.companyId },
  })
  if (!principal) {
    throw new Error('Profesional principal no encontrado en la empresa')
  }

  if (body.secondProfessionalId) {
    const second = await prisma.baroProfessional.findFirst({
      where: { id: body.secondProfessionalId, companyId: ctx.companyId },
    })
    if (!second) {
      throw new Error('Segundo profesional no encontrado en la empresa')
    }
  }

  const created = await prisma.baroExpediente.create({
    data: {
      companyId: ctx.companyId,
      createdById: ctx.userId,
      objetoExpedienteId: body.objetoExpedienteId,
      nomenclaturaCatastral: body.nomenclaturaCatastral,
      propietario: body.propietario,
      principalProfessionalId: body.principalProfessionalId,
      secondProfessionalId: body.secondProfessionalId ?? null,
      status: 'DRAFT',
    },
  })
  return toExpediente(created)
}
