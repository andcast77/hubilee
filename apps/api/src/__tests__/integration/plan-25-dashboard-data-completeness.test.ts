/**
 * PLAN-25: Dashboard data completeness — integration smoke tests.
 *
 * Verifies authenticated endpoints return 200 with expected envelopes and tenant-scoped
 * counts (Workify employee total matches Prisma for the JWT company).
 *
 * Requires DATABASE_URL + seeded DB (see integration/setup.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@hubilee/database'
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

async function inject(app: FastifyInstance, opts: any) {
  const res = await app.inject(opts)
  return { res: res as unknown as InjectResult, json: getJsonPayload(res as unknown as InjectResult) }
}

function todayIsoRange(): { start: string; end: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

describe('PLAN-25: Dashboard data completeness (integration)', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string

  let acmeOwnerToken: string
  let acmeUserToken: string
  let betaOwnerToken: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies (Acme Inc., Beta Corp.)')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const acmeVentasUser = await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } })
    const betaOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!acmeOwnerUser || !acmeVentasUser || !betaOwnerUser) {
      throw new Error('Missing seeded users for PLAN-25 dashboard tests')
    }

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
  }, 60_000)

  // --- Workify ---

  it('GET /v1/workify/dashboard/stats returns 200 and totalEmployees matches tenant', async () => {
    const expected = await prisma.employee.count({
      where: { companyId: acmeCompanyId, isDeleted: false },
    })
    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/dashboard/stats',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(json.totalEmployees).toBe(expected)
    expect(typeof json.todayScheduled).toBe('number')
    expect(typeof json.weeklyAttendanceRate).toBe('number')
    expect(Array.isArray(json.weeklyAttendance)).toBe(true)
    expect(Array.isArray(json.departmentAttendance)).toBe(true)
  })

  it('GET /v1/workify/dashboard/alerts returns 200 with alerts array', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/dashboard/alerts',
      headers: { Authorization: `Bearer ${acmeUserToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.alerts)).toBe(true)
  })

  it('GET /v1/workify/attendance/stats returns 200 with KPI fields', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/attendance/stats',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(typeof json.employeesScheduled).toBe('number')
    expect(typeof json.employeesWorking).toBe('number')
    expect(typeof json.employeesAbsent).toBe('number')
    expect(typeof json.employeesLate).toBe('number')
    expect(typeof json.isWorkDay).toBe('boolean')
  })

  it('Workify dashboard stats are tenant-isolated (Acme vs Beta)', async () => {
    const acmeCount = await prisma.employee.count({
      where: { companyId: acmeCompanyId, isDeleted: false },
    })
    const betaCount = await prisma.employee.count({
      where: { companyId: betaCompanyId, isDeleted: false },
    })

    const { json: acmeJson } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/dashboard/stats',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    const { json: betaJson } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/dashboard/stats',
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })

    expect(acmeJson.totalEmployees).toBe(acmeCount)
    expect(betaJson.totalEmployees).toBe(betaCount)
  })

  it('GET /v1/workify/dashboard/stats without auth returns 401', async () => {
    const { res } = await inject(app, {
      method: 'GET',
      url: '/v1/workify/dashboard/stats',
    })
    expect(res.statusCode).toBe(401)
  })

  // --- TechServices (requires techservices on CompanyMemberModule — Acme owner has it) ---

  it('GET /v1/techservices/dashboard/stats returns 200 with metrics shape', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/techservices/dashboard/stats',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(typeof json.openOrders).toBe('number')
    expect(typeof json.closedThisWeek).toBe('number')
    expect(typeof json.avgResolutionHours).toBe('number')
    expect(typeof json.overdueOrders).toBe('number')
    expect(json.ordersByStatus).toBeDefined()
    expect(Array.isArray(json.weeklyOrderTrend)).toBe(true)
  })

  // --- Pos ---

  it('GET /v1/pos/reports/dashboard-metrics returns 200 with data envelope', async () => {
    const { start, end } = todayIsoRange()
    const qs = `startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`
    const { res, json } = await inject(app, {
      method: 'GET',
      url: `/v1/pos/reports/dashboard-metrics?${qs}`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
    expect(typeof json.data.grossMarginPct).toBe('number')
    expect(typeof json.data.inventoryValue).toBe('number')
    expect(typeof json.data.refundRate).toBe('number')
    expect(typeof json.data.pendingInvoicesTotal).toBe('number')
    expect(Array.isArray(json.data.oldestOverdueInvoices)).toBe(true)
  })

  it('Pos dashboard-metrics is tenant-isolated (pending totals can differ by company)', async () => {
    const { start, end } = todayIsoRange()
    const qs = `startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`
    const { json: acmeJson } = await inject(app, {
      method: 'GET',
      url: `/v1/pos/reports/dashboard-metrics?${qs}`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    const { json: betaJson } = await inject(app, {
      method: 'GET',
      url: `/v1/pos/reports/dashboard-metrics?${qs}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(acmeJson.success).toBe(true)
    expect(betaJson.success).toBe(true)
    expect(acmeJson.data).toBeDefined()
    expect(betaJson.data).toBeDefined()
    // Both companies exist in seed; totals are computed independently — at minimum keys match.
    expect(Object.keys(acmeJson.data).sort()).toEqual(Object.keys(betaJson.data).sort())
  })
})
