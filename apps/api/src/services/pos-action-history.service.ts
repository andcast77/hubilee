import { prisma, Prisma } from '../db/index.js'
import { BadRequestError } from '../common/errors/app-error.js'

type ActionHistoryQuery = {
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
  page?: string
  limit?: string
  companyId?: string
}

export async function createAction(body: Record<string, unknown>) {
  const { userId, companyId, action, entityType, entityId, details, ipAddress, userAgent } = body
  if (!userId || !action || !entityType) {
    throw new BadRequestError('userId, action y entityType son requeridos')
  }
  const validActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'OTHER'] as const
  const validEntityTypes = ['USER', 'PRODUCT', 'SALE', 'CUSTOMER', 'STORE', 'COMPANY', 'OTHER'] as const
  const created = await prisma.actionHistory.create({
    data: {
      userId: userId as string,
      companyId: (companyId as string) ?? null,
      action: (validActions.includes((action as string) as (typeof validActions)[number]) ? action : 'OTHER') as (typeof validActions)[number],
      entityType: (validEntityTypes.includes((entityType as string) as (typeof validEntityTypes)[number]) ? entityType : 'OTHER') as (typeof validEntityTypes)[number],
      entityId: (entityId as string) ?? null,
      details: details ? (typeof details === 'object' ? details : JSON.parse(String(details))) : undefined,
      ipAddress: (ipAddress as string) ?? null,
      userAgent: (userAgent as string) ?? null,
    },
  })
  return { id: created.id }
}

export async function listActions(query: ActionHistoryQuery) {
  const pageNum = parseInt(query.page ?? '1')
  const limitNum = parseInt(query.limit ?? '50')
  const skip = (pageNum - 1) * limitNum

  const where: Prisma.ActionHistoryWhereInput = {}
  if (query.userId) where.userId = query.userId
  if (query.companyId) where.companyId = query.companyId
  if (query.action) where.action = query.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'OTHER'
  if (query.entityType) where.entityType = query.entityType as 'USER' | 'PRODUCT' | 'SALE' | 'CUSTOMER' | 'STORE' | 'COMPANY' | 'OTHER'
  if (query.entityId) where.entityId = query.entityId
  if (query.startDate && query.endDate) where.createdAt = { gte: new Date(query.startDate), lte: new Date(query.endDate) }
  else if (query.startDate) where.createdAt = { gte: new Date(query.startDate) }
  else if (query.endDate) where.createdAt = { lte: new Date(query.endDate) }

  const [total, results] = await Promise.all([
    prisma.actionHistory.count({ where }),
    prisma.actionHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: { user: { select: { id: true, email: true, role: true } } },
    }),
  ])

  const actions = results.map((row) => ({
    id: row.id,
    userId: row.userId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    user: { id: row.user.id, name: row.user.email, email: row.user.email, role: row.user.role },
  }))
  return { actions, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } }
}
