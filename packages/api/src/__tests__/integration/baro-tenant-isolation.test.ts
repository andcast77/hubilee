/**
 * check-structure PR2: Baro API tenant isolation + module access.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@multisystem/database'
import { Buffer } from 'node:buffer'

import './setup'

import { generateToken } from '../../core/auth.js'

type InjectResult = {
  statusCode: number
  payload: unknown
}

function getJsonPayload(res: InjectResult | any): any {
  const payload = res.payload ?? res.body
  if (payload == null) return null
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch {
      return payload
    }
  }
  if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString('utf8'))
  if (payload instanceof Uint8Array) return JSON.parse(Buffer.from(payload).toString('utf8'))
  if (typeof payload === 'object') return payload
  return JSON.parse(String(payload))
}

async function injectJson(app: FastifyInstance, opts: any) {
  const res = await app.inject(opts)
  return { res: res as unknown as InjectResult, json: getJsonPayload(res as unknown as InjectResult) }
}

describe('check-structure PR2: Baro API', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeMemberId: string
  let acmeProfessionalId: string
  let acmeExpedienteId: string

  let acmeOwnerToken: string
  let acmeUserToken: string
  let betaOwnerToken: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const acmeVentasUser = await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } })
    const betaOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!acmeOwnerUser || !acmeVentasUser || !betaOwnerUser) {
      throw new Error('Missing seeded users for baro tests')
    }

    const acmeMember = await prisma.companyMember.findFirst({
      where: { userId: acmeVentasUser.id, companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeMember) throw new Error('Missing CompanyMember for acmeVentas')
    acmeMemberId = acmeMember.id

    acmeOwnerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      isSuperuser: acmeOwnerUser.isSuperuser,
      companyId: acmeCompanyId,
      membershipRole: 'OWNER',
    })

    acmeUserToken = generateToken({
      id: acmeVentasUser.id,
      email: acmeVentasUser.email,
      role: acmeVentasUser.role,
      isSuperuser: acmeVentasUser.isSuperuser,
      companyId: acmeCompanyId,
      membershipRole: 'USER',
    })

    betaOwnerToken = generateToken({
      id: betaOwnerUser.id,
      email: betaOwnerUser.email,
      role: betaOwnerUser.role,
      isSuperuser: betaOwnerUser.isSuperuser,
      companyId: betaCompanyId,
      membershipRole: 'OWNER',
    })

    const professional = await prisma.baroProfessional.create({
      data: {
        companyId: acmeCompanyId,
        userId: acmeOwnerUser.id,
        displayName: 'Roberto Acme',
        addressLine1: 'Av. Test 123',
        locality: 'San Juan',
        dni: '12345678',
        sexo: 'M',
      },
    })
    acmeProfessionalId = professional.id

    const expediente = await prisma.baroExpediente.create({
      data: {
        companyId: acmeCompanyId,
        createdById: acmeOwnerUser.id,
        objetoExpedienteId: 'obj-test-001',
        nomenclaturaCatastral: '01-02-03',
        propietario: 'Propietario Test',
        principalProfessionalId: acmeProfessionalId,
        status: 'DRAFT',
      },
    })
    acmeExpedienteId = expediente.id
  }, 30_000)

  it('Owner can list baro expedientes for their company', async () => {
    const { res, json } = await injectJson(app, {
      method: 'GET',
      url: '/v1/baro/expedientes',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.some((e: { id: string }) => e.id === acmeExpedienteId)).toBe(true)
  })

  it('Beta user cannot read Acme expediente by id (cross-tenant → 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'GET',
      url: `/v1/baro/expedientes/${acmeExpedienteId}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Member with baro disabled in CompanyMemberModule gets 403 on baro routes', async () => {
    const baroModule = await prisma.module.findUnique({ where: { key: 'baro' } })
    if (!baroModule) throw new Error('baro module not found in seed')

    await prisma.companyMemberModule.upsert({
      where: { companyMemberId_moduleId: { companyMemberId: acmeMemberId, moduleId: baroModule.id } },
      create: { companyMemberId: acmeMemberId, moduleId: baroModule.id, enabled: false },
      update: { enabled: false },
    })

    const { res } = await injectJson(app, {
      method: 'GET',
      url: '/v1/baro/expedientes',
      headers: { Authorization: `Bearer ${acmeUserToken}` },
    })
    expect(res.statusCode).toBe(403)

    await prisma.companyMemberModule.update({
      where: { companyMemberId_moduleId: { companyMemberId: acmeMemberId, moduleId: baroModule.id } },
      data: { enabled: true },
    })
  })

  it('Owner can create expediente via POST /v1/baro/expedientes', async () => {
    const { res, json } = await injectJson(app, {
      method: 'POST',
      url: '/v1/baro/expedientes',
      headers: {
        Authorization: `Bearer ${acmeOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: {
        objetoExpedienteId: 'obj-test-002',
        nomenclaturaCatastral: '04-05-06',
        propietario: 'Nuevo Propietario',
        principalProfessionalId: acmeProfessionalId,
      },
    })
    expect(res.statusCode).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.companyId).toBe(acmeCompanyId)
    expect(json.data.status).toBe('DRAFT')
  })
})
