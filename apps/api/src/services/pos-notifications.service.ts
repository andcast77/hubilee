import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError, ForbiddenError } from '../common/errors/app-error.js'
import { parsePagination } from '../common/database/index.js'
import { sseManager } from './sse.service.js'

export type CreateNotificationBody = {
  userId: string
  type: string
  priority?: string
  title: string
  message: string
  data?: Record<string, unknown>
  actionUrl?: string
  expiresAt?: string
}

export async function createNotification(ctx: CompanyContext, body: CreateNotificationBody) {
  const { userId, type, priority, title, message, data, actionUrl, expiresAt } = body
  if (!userId || !type || !title || !message) {
    throw new BadRequestError('userId, type, title y message son requeridos')
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      companyId: ctx.companyId,
      type: type as Prisma.NotificationCreateInput['type'],
      priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority ?? '')
        ? priority
        : 'MEDIUM') as Prisma.NotificationCreateInput['priority'],
      title,
      message,
      data: data != null ? (data as Prisma.InputJsonValue) : undefined,
      actionUrl: actionUrl ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'UNREAD',
    },
  })
  sseManager.emit(ctx.companyId, 'notification:created', { userId, id: notification.id })
  return { ...notification, data: notification.data ?? null }
}

export type ListNotificationsQuery = {
  userId?: string
  type?: string
  status?: string
  priority?: string
  page?: string
  limit?: string
}

export async function listNotifications(ctx: CompanyContext, query: ListNotificationsQuery) {
  const { page: pageNum, limit: limitNum, skip } = parsePagination(query)

  const where: Prisma.NotificationWhereInput = {
    companyId: ctx.companyId,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  }
  if (query.userId) where.userId = query.userId
  if (query.type) where.type = query.type as Prisma.NotificationWhereInput['type']
  if (query.status) where.status = query.status as 'UNREAD' | 'READ'
  if (query.priority) where.priority = query.priority as 'LOW' | 'MEDIUM' | 'HIGH'

  const [total, results] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
  ])
  const notifications = results.map((row) => ({ ...row, data: row.data ?? null }))

  return {
    notifications,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  }
}

export async function markNotificationAsRead(ctx: CompanyContext, id: string, body: { userId: string }) {
  const { userId } = body
  if (!userId) throw new BadRequestError('userId es requerido')

  const existing = await prisma.notification.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new NotFoundError('Notificación no encontrada')
  if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado')

  const result = await prisma.notification.updateMany({
    where: { id, companyId: ctx.companyId, userId },
    data: { status: 'READ', readAt: new Date() },
  })
  if (result.count === 0) throw new NotFoundError('Notificación no encontrada')
}

export async function markNotificationAsUnread(ctx: CompanyContext, id: string, body: { userId: string }) {
  const { userId } = body
  if (!userId) throw new BadRequestError('userId es requerido')

  const existing = await prisma.notification.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new NotFoundError('Notificación no encontrada')
  if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado')

  const result = await prisma.notification.updateMany({
    where: { id, companyId: ctx.companyId, userId },
    data: { status: 'UNREAD', readAt: null },
  })
  if (result.count === 0) throw new NotFoundError('Notificación no encontrada')
}

export async function markAllNotificationsRead(ctx: CompanyContext, body: { userId: string }) {
  const { userId } = body
  if (!userId) throw new BadRequestError('userId es requerido')

  const result = await prisma.notification.updateMany({
    where: { userId, companyId: ctx.companyId, status: 'UNREAD' },
    data: { status: 'READ', readAt: new Date() },
  })
  return { count: result.count }
}

export async function deleteNotification(ctx: CompanyContext, id: string, body: { userId: string }) {
  const { userId } = body
  if (!userId) throw new BadRequestError('userId es requerido')

  const existing = await prisma.notification.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new NotFoundError('Notificación no encontrada')
  if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado')

  const result = await prisma.notification.deleteMany({ where: { id, companyId: ctx.companyId, userId } })
  if (result.count === 0) throw new NotFoundError('Notificación no encontrada')
}

export async function getUnreadCount(ctx: CompanyContext, query: { userId?: string }) {
  const { userId } = query
  if (!userId) throw new BadRequestError('userId es requerido')

  const count = await prisma.notification.count({
    where: {
      userId,
      companyId: ctx.companyId,
      status: 'UNREAD',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })
  return { count }
}

export async function getNotificationPreferences(ctx: CompanyContext, userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  })
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
      },
    })
  }
  return prefs
}

type PerTypeChannels = { inApp?: boolean; push?: boolean; email?: boolean }

function mergeNotificationPreferencesJson(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, PerTypeChannels> | undefined
): Prisma.InputJsonValue | undefined {
  if (!patch || Object.keys(patch).length === 0) return undefined
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, PerTypeChannels>)
      : {}
  const merged: Record<string, PerTypeChannels> = { ...base }
  for (const [key, ch] of Object.entries(patch)) {
    merged[key] = { ...(merged[key] ?? {}), ...ch }
  }
  return merged as Prisma.InputJsonValue
}

export async function updateNotificationPreferences(
  ctx: CompanyContext,
  userId: string,
  body: { inAppEnabled?: boolean; pushEnabled?: boolean; emailEnabled?: boolean; preferences?: Record<string, PerTypeChannels> },
) {
  const allowed =
    ctx.isSuperuser ||
    ctx.userId === userId ||
    ctx.membershipRole === 'OWNER' ||
    ctx.membershipRole === 'ADMIN'
  if (!allowed) throw new ForbiddenError('No puedes editar las preferencias de este usuario')

  const hasGlobals =
    body.inAppEnabled !== undefined || body.pushEnabled !== undefined || body.emailEnabled !== undefined
  const hasPrefs = body.preferences !== undefined && Object.keys(body.preferences).length > 0
  if (!hasGlobals && !hasPrefs) throw new BadRequestError('No hay campos para actualizar')

  const data: Prisma.NotificationPreferenceUpdateInput = {}
  if (body.inAppEnabled !== undefined) data.inAppEnabled = body.inAppEnabled
  if (body.pushEnabled !== undefined) data.pushEnabled = body.pushEnabled
  if (body.emailEnabled !== undefined) data.emailEnabled = body.emailEnabled

  if (hasPrefs) {
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: { preferences: true },
    })
    const merged = mergeNotificationPreferencesJson(existing?.preferences, body.preferences)
    if (merged !== undefined) data.preferences = merged
  }

  return prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      inAppEnabled: body.inAppEnabled ?? true,
      pushEnabled: body.pushEnabled ?? false,
      emailEnabled: body.emailEnabled ?? false,
      preferences: hasPrefs
        ? (mergeNotificationPreferencesJson(null, body.preferences) ?? Prisma.JsonNull)
        : undefined,
    },
    update: data,
  })
}
