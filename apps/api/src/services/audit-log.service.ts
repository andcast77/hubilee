import { prisma, Prisma } from '../db/index.js'

export type WriteAuditLogParams = {
  /** Omit or null for platform-scoped events (no tenant). */
  companyId?: string | null
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

export type ListAuditLogsQuery = {
  entityType?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: string
  pageSize?: string
}

/**
 * Fire-and-forget audit write. Never blocks the main request path.
 * Errors are logged but do not propagate.
 */
export function writeAuditLog(params: WriteAuditLogParams): void {
  setImmediate(() => {
    prisma.auditLog
      .create({
        data: {
          companyId: params.companyId ?? null,
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          before: (params.before as Prisma.InputJsonValue | null | undefined) ?? undefined,
          after: (params.after as Prisma.InputJsonValue | null | undefined) ?? undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      })
      .catch((err: unknown) => {
        console.error('[audit-log] write failed', { action: params.action, err })
      })
  })
}

export async function listAuditLogs(companyId: string, query: ListAuditLogsQuery) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '20', 10)))
  const skip = (page - 1) * pageSize

  const where: {
    companyId: string
    entityType?: string
    action?: string
    userId?: string
    createdAt?: { gte?: Date; lte?: Date }
  } = { companyId }

  if (query.entityType) where.entityType = query.entityType
  if (query.action) where.action = query.action
  if (query.userId) where.userId = query.userId
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    }
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        userId: true,
      },
    }),
  ])

  const uniqueUserIds = [...new Set(items.map(i => i.userId).filter((id): id is string => id != null))]
  let userMap = new Map<string, { id: string; email: string | null; firstName: string; lastName: string }>()
  if (uniqueUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, email: true, firstName: true, lastName: true },
    })
    userMap = new Map(users.map(u => [u.id, u]))
  }

  return {
    items: items.map(item => ({
      ...item,
      user: item.userId ? (userMap.get(item.userId) ?? null) : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
