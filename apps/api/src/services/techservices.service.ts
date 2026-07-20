import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { getCompanyModules } from '../core/modules.js'
import { sseManager } from './sse.service.js'
import * as workOrdersService from './work-orders.service.js'
import * as techservicesHelper from '../helpers/techservices.helper.js'
import { parsePagination } from '../common/database/index.js'
import type {
  WorkOrderListQuery,
  WorkOrderCreateBody,
  WorkOrderUpdateBody,
  AssetListQuery,
  AssetCreateBody,
  AssetUpdateBody,
  PartCreateBody,
  PartUpdateBody,
  VisitCreateBody,
  VisitUpdateBody,
  TechServicesMeCompany,
} from '../dto/techservices.dto.js'

// ----- Work orders (delegate to work-orders.service) -----

export async function listWorkOrders(ctx: CompanyContext, query: WorkOrderListQuery) {
  const result = await workOrdersService.listWorkOrders(ctx, query)
  return {
    workOrders: result.workOrders.map((row) => techservicesHelper.toWorkOrderResponse(row)),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  }
}

export async function getWorkOrderById(ctx: CompanyContext, id: string) {
  const row = await workOrdersService.getWorkOrderById(ctx, id)
  return row ? techservicesHelper.toWorkOrderResponse(row) : null
}

/** Validate assetId and assignedEmployeeId belong to company; return error message or null */
export async function validateWorkOrderRefs(
  ctx: CompanyContext,
  body: { assetId?: string | null; assignedEmployeeId?: string | null }
): Promise<{ error: string } | null> {
  if (body.assetId) {
    const asset = await prisma.technicalAsset.findFirst({
      where: { id: body.assetId, companyId: ctx.companyId },
    })
    if (!asset) return { error: 'Activo invalido' }
  }
  if (body.assignedEmployeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: body.assignedEmployeeId, companyId: ctx.companyId, isDeleted: false },
    })
    if (!employee) return { error: 'Empleado invalido' }
  }
  return null
}

export async function createWorkOrder(ctx: CompanyContext, body: WorkOrderCreateBody) {
  const refError = await validateWorkOrderRefs(ctx, body)
  if (refError) return refError
  const row = await workOrdersService.createWorkOrder(ctx, body)
  sseManager.emit(ctx.companyId, 'techservices:dashboard:invalidate', { reason: 'work-order-created' })
  return { data: techservicesHelper.toWorkOrderResponse(row) }
}

export async function updateWorkOrder(ctx: CompanyContext, id: string, body: WorkOrderUpdateBody) {
  const refError = await validateWorkOrderRefs(ctx, body)
  if (refError) return refError
  const row = await workOrdersService.updateWorkOrder(ctx, id, body)
  if (row) sseManager.emit(ctx.companyId, 'techservices:dashboard:invalidate', { reason: 'work-order-updated' })
  return row ? { data: techservicesHelper.toWorkOrderResponse(row) } : null
}

// ----- Assets -----

export async function listAssets(ctx: CompanyContext, query: AssetListQuery) {
  const { page, limit, skip } = parsePagination(query)
  const where: Prisma.TechnicalAssetWhereInput = { companyId: ctx.companyId }
  if (query.active === 'true') where.isActive = true
  else if (query.active === 'false') where.isActive = false
  if (query.search?.trim()) {
    const term = query.search.trim()
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { serialNumber: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
      { customerEmail: { contains: term, mode: 'insensitive' } },
      { customerPhone: { contains: term, mode: 'insensitive' } },
      { brand: { contains: term, mode: 'insensitive' } },
      { model: { contains: term, mode: 'insensitive' } },
    ]
  }
  const [total, rows] = await Promise.all([
    prisma.technicalAsset.count({ where }),
    prisma.technicalAsset.findMany({
      where,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
  ])
  return {
    items: rows.map((r) => techservicesHelper.toAssetResponse(r as techservicesHelper.AssetEntity)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getAssetById(ctx: CompanyContext, id: string) {
  const row = await prisma.technicalAsset.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  return row ? techservicesHelper.toAssetResponse(row as techservicesHelper.AssetEntity) : null
}

export async function createAsset(ctx: CompanyContext, body: AssetCreateBody) {
  const row = await prisma.technicalAsset.create({
    data: {
      companyId: ctx.companyId,
      name: body.name.trim(),
      brand: body.brand ?? null,
      model: body.model ?? null,
      serialNumber: body.serialNumber ?? null,
      customerName: body.customerName ?? null,
      customerEmail: body.customerEmail ?? null,
      customerPhone: body.customerPhone ?? null,
      notes: body.notes ?? null,
    },
  })
  return techservicesHelper.toAssetResponse(row as techservicesHelper.AssetEntity)
}

export async function updateAsset(ctx: CompanyContext, id: string, body: AssetUpdateBody) {
  const existing = await prisma.technicalAsset.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  if (!existing) return null

  const data: Prisma.TechnicalAssetUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.brand !== undefined) data.brand = body.brand
  if (body.model !== undefined) data.model = body.model
  if (body.serialNumber !== undefined) data.serialNumber = body.serialNumber
  if (body.customerName !== undefined) data.customerName = body.customerName
  if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail
  if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone
  if (body.notes !== undefined) data.notes = body.notes
  if (body.isActive !== undefined) data.isActive = body.isActive

  if (Object.keys(data).length === 0) return getAssetById(ctx, id)

  const updated = await prisma.technicalAsset.updateMany({
    where: { id, companyId: ctx.companyId },
    data,
  })
  if (updated.count === 0) return null
  const row = await prisma.technicalAsset.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  return row ? techservicesHelper.toAssetResponse(row as techservicesHelper.AssetEntity) : null
}

export async function deleteAsset(ctx: CompanyContext, id: string) {
  const row = await prisma.technicalAsset.updateMany({
    where: { id, companyId: ctx.companyId },
    data: { isActive: false },
  })
  return row.count > 0
}

// ----- Parts -----

export async function listParts(ctx: CompanyContext, workOrderId: string) {
  const rows = await prisma.workOrderPart.findMany({
    where: {
      workOrderId,
      workOrder: { companyId: ctx.companyId },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) =>
    techservicesHelper.toPartResponse({ ...r, unitCost: Number(r.unitCost) } as unknown as techservicesHelper.PartEntity)
  )
}

export async function createPart(ctx: CompanyContext, workOrderId: string, body: PartCreateBody) {
  const order = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId: ctx.companyId },
  })
  if (!order) return { notFound: true as const }

  const row = await prisma.workOrderPart.create({
    data: {
      companyId: ctx.companyId,
      workOrderId,
      name: body.name.trim(),
      quantity: body.quantity ?? 1,
      unitCost: body.unitCost,
      notes: body.notes ?? null,
    },
  })
  return {
    data: techservicesHelper.toPartResponse(
      { ...row, unitCost: Number(row.unitCost) } as unknown as techservicesHelper.PartEntity
    ),
  }
}

export async function updatePart(ctx: CompanyContext, partId: string, body: PartUpdateBody) {
  const existing = await prisma.workOrderPart.findFirst({
    where: { id: partId, workOrder: { companyId: ctx.companyId } },
  })
  if (!existing) return null

  const data: Parameters<typeof prisma.workOrderPart.update>[0]['data'] = {}
  if (body.name !== undefined) data.name = body.name
  if (body.quantity !== undefined) data.quantity = body.quantity
  if (body.unitCost !== undefined) data.unitCost = body.unitCost
  if (body.notes !== undefined) data.notes = body.notes
  if (Object.keys(data).length === 0) return { updated: true }

  const updated = await prisma.workOrderPart.updateMany({
    where: { id: partId, workOrder: { companyId: ctx.companyId } },
    data,
  })
  if (updated.count === 0) return null
  return { updated: true }
}

export async function deletePart(ctx: CompanyContext, partId: string) {
  const existing = await prisma.workOrderPart.findFirst({
    where: { id: partId, workOrder: { companyId: ctx.companyId } },
  })
  if (!existing) return false
  const deleted = await prisma.workOrderPart.deleteMany({
    where: { id: partId, workOrder: { companyId: ctx.companyId } },
  })
  return deleted.count > 0
}

// ----- Visits -----

async function validateEmployee(ctx: CompanyContext, employeeId: string | null): Promise<string | null> {
  if (!employeeId) return null
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: ctx.companyId, isDeleted: false },
  })
  return emp ? null : 'Empleado invalido'
}

export async function listVisits(ctx: CompanyContext, workOrderId: string) {
  const rows = await prisma.serviceVisit.findMany({
    where: { workOrderId, workOrder: { companyId: ctx.companyId } },
    orderBy: { scheduledStartAt: 'asc' },
    include: { assignedEmployee: { select: { id: true, firstName: true, lastName: true } } },
  })
  return rows.map((r) =>
    techservicesHelper.toVisitResponse({
      ...r,
      employee_first_name: r.assignedEmployee?.firstName ?? null,
      employee_last_name: r.assignedEmployee?.lastName ?? null,
    } as techservicesHelper.VisitEntity)
  )
}

export async function createVisit(ctx: CompanyContext, workOrderId: string, body: VisitCreateBody) {
  const err = await validateEmployee(ctx, body.assignedEmployeeId ?? null)
  if (err) return { badRequest: err }

  const order = await prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId: ctx.companyId },
  })
  if (!order) return { notFound: true as const }

  const status = (['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).includes((body.status as 'SCHEDULED') ?? 'SCHEDULED')
    ? (body.status as 'SCHEDULED')
    : 'SCHEDULED'
  const row = await prisma.serviceVisit.create({
    data: {
      companyId: ctx.companyId,
      workOrderId,
      assignedEmployeeId: body.assignedEmployeeId ?? null,
      scheduledStartAt: new Date(body.scheduledStartAt),
      scheduledEndAt: body.scheduledEndAt ? new Date(body.scheduledEndAt) : null,
      status,
      notes: body.notes ?? null,
    },
  })
  sseManager.emit(ctx.companyId, 'techservices:dashboard:invalidate', { reason: 'visit-created' })
  return { data: techservicesHelper.toVisitResponse(row as techservicesHelper.VisitEntity) }
}

export async function updateVisit(ctx: CompanyContext, visitId: string, body: VisitUpdateBody) {
  const existing = await prisma.serviceVisit.findFirst({
    where: { id: visitId, workOrder: { companyId: ctx.companyId } },
  })
  if (!existing) return null

  if (body.assignedEmployeeId !== undefined) {
    const err = await validateEmployee(ctx, body.assignedEmployeeId)
    if (err) return { badRequest: err }
  }

  const data: Prisma.ServiceVisitUpdateInput = {}
  if (body.scheduledStartAt !== undefined)
    data.scheduledStartAt = body.scheduledStartAt ? new Date(body.scheduledStartAt) : undefined
  if (body.scheduledEndAt !== undefined)
    data.scheduledEndAt = body.scheduledEndAt ? new Date(body.scheduledEndAt) : { set: null }
  if (body.status !== undefined) data.status = body.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  if (body.assignedEmployeeId !== undefined) {
    data.assignedEmployee = body.assignedEmployeeId
      ? { connect: { id: body.assignedEmployeeId } }
      : { disconnect: true }
  }
  if (body.notes !== undefined) data.notes = body.notes
  if (Object.keys(data).length === 0) return { updated: true }

  const updated = await prisma.serviceVisit.updateMany({
    where: { id: visitId, workOrder: { companyId: ctx.companyId } },
    data,
  })
  if (updated.count === 0) return null
  sseManager.emit(ctx.companyId, 'techservices:dashboard:invalidate', { reason: 'visit-updated' })
  return { updated: true }
}

export async function deleteVisit(ctx: CompanyContext, visitId: string) {
  const existing = await prisma.serviceVisit.findFirst({
    where: { id: visitId, workOrder: { companyId: ctx.companyId } },
  })
  if (!existing) return false
  const deleted = await prisma.serviceVisit.deleteMany({
    where: { id: visitId, workOrder: { companyId: ctx.companyId } },
  })
  if (deleted.count > 0) sseManager.emit(ctx.companyId, 'techservices:dashboard:invalidate', { reason: 'visit-deleted' })
  return deleted.count > 0
}

export async function getDashboardStats(ctx: CompanyContext) {
  const now = new Date()
  const weekStart = new Date(now)
  const dow = weekStart.getDay()
  const diff = weekStart.getDate() - dow + (dow === 0 ? -6 : 1)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const companyId = ctx.companyId

  const [
    openOrders,
    closedThisWeek,
    completedForAvg,
    overdueOrders,
    statusGroups,
    activeVisits,
    techVisitGroups,
    assetsCount,
  ] = await Promise.all([
    prisma.workOrder.count({
      where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] } },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.workOrder.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: { not: null, gte: fourWeeksAgo },
      },
      select: { requestedAt: true, completedAt: true },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] },
        OR: [
          { dueAt: { lt: now } },
          {
            requestedAt: { lt: new Date(now.getTime() - 7 * 24 * 3600_000) },
          },
        ],
      },
    }),
    prisma.workOrder.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true,
    }),
    prisma.serviceVisit.count({
      where: {
        companyId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    }),
    prisma.serviceVisit.groupBy({
      by: ['assignedEmployeeId'],
      where: {
        companyId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        assignedEmployeeId: { not: null },
      },
      _count: true,
    }),
    prisma.technicalAsset.count({ where: { companyId, isActive: true } }),
  ])

  let totalMs = 0
  let n = 0
  for (const r of completedForAvg) {
    if (r.completedAt && r.requestedAt) {
      totalMs += r.completedAt.getTime() - r.requestedAt.getTime()
      n++
    }
  }
  const avgResolutionHours = n > 0 ? Math.round((totalMs / n / 3_600_000) * 100) / 100 : 0

  const techniciansWithActiveVisits = techVisitGroups.length
  const technicianUtilizationRatio =
    techniciansWithActiveVisits > 0 ? Math.round((activeVisits / techniciansWithActiveVisits) * 100) / 100 : 0

  const ordersByStatus: Record<string, number> = {}
  for (const g of statusGroups) {
    ordersByStatus[g.status] = g._count
  }

  const weeklyOrderTrend: { date: string; opened: number; closed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const de = new Date(ds)
    de.setDate(de.getDate() + 1)
    const [opened, closed] = await Promise.all([
      prisma.workOrder.count({
        where: { companyId, createdAt: { gte: ds, lt: de } },
      }),
      prisma.workOrder.count({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: { gte: ds, lt: de },
        },
      }),
    ])
    weeklyOrderTrend.push({
      date: ds.toISOString().split('T')[0],
      opened,
      closed,
    })
  }

  return {
    openOrders,
    closedThisWeek,
    avgResolutionHours,
    overdueOrders,
    ordersByStatus,
    weeklyOrderTrend,
    activeVisits,
    techniciansWithActiveVisits,
    technicianUtilizationRatio,
    assetsCount,
  }
}

// ----- Me -----

export async function getMe(ctx: CompanyContext) {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  })
  if (!user || !user.isActive) return { unauthorized: 'Usuario no encontrado o inactivo' as const }

  const company = await prisma.company.findFirst({
    where: { id: ctx.companyId, isActive: true },
    select: { id: true, name: true },
  })
  const modules = company ? await getCompanyModules(company.id) : undefined
  const companyForMe: TechServicesMeCompany | undefined = company
    ? {
        id: company.id,
        name: company.name,
        hrEnabled: modules?.hr ?? false,
        posEnabled: modules?.pos ?? false,
        technicalServicesEnabled: modules?.techservices ?? false,
      }
    : undefined
  return techservicesHelper.toMeResponse(user, companyForMe, ctx)
}
