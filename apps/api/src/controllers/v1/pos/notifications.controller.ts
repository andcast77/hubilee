import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import {
  createNotificationSchema,
  notificationUserSchema,
  updateNotificationPreferencesSchema,
} from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function createNotification(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createNotificationSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.createNotification(ctx, body)
  return ok(data)
}

async function listNotifications(
  request: FastifyRequest<{ Querystring: { userId?: string; type?: string; status?: string; priority?: string; page?: string; limit?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.listNotifications(ctx, request.query)
  return ok(data)
}

async function markNotificationAsRead(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = validateBody(notificationUserSchema, request.body)
  const ctx = getCtx(request, true)
  await posService.markNotificationAsRead(ctx, request.params.id, body)
  return { success: true }
}

async function markNotificationAsUnread(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = validateBody(notificationUserSchema, request.body)
  const ctx = getCtx(request, true)
  await posService.markNotificationAsUnread(ctx, request.params.id, body)
  return { success: true }
}

async function markAllNotificationsRead(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(notificationUserSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.markAllNotificationsRead(ctx, body)
  return ok(data)
}

async function deleteNotification(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = validateBody(notificationUserSchema, request.body)
  const ctx = getCtx(request, true)
  await posService.deleteNotification(ctx, request.params.id, body)
  return { success: true }
}

async function getUnreadNotificationCount(
  request: FastifyRequest<{ Querystring: { userId: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getUnreadCount(ctx, request.query)
  return ok(data)
}

async function getNotificationPreferences(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const data = await posService.getNotificationPreferences(ctx, request.params.userId)
  return ok(data)
}

async function patchNotificationPreferences(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  const body = validateBody(updateNotificationPreferencesSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.updateNotificationPreferences(ctx, request.params.userId, body)
  return ok(data)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/pos/notifications', { preHandler: pre }, handle(createNotification))
  fastify.get('/v1/pos/notifications', { preHandler: pre }, handle(listNotifications))
  fastify.put<{ Params: { id: string } }>('/v1/pos/notifications/:id/read', { preHandler: pre }, handle(markNotificationAsRead))
  fastify.put<{ Params: { id: string } }>('/v1/pos/notifications/:id/unread', { preHandler: pre }, handle(markNotificationAsUnread))
  fastify.put('/v1/pos/notifications/read-all', { preHandler: pre }, handle(markAllNotificationsRead))
  fastify.delete<{ Params: { id: string } }>('/v1/pos/notifications/:id', { preHandler: pre }, handle(deleteNotification))
  fastify.get<{ Querystring: { userId: string } }>('/v1/pos/notifications/unread-count', { preHandler: pre }, handle(getUnreadNotificationCount))
  fastify.get<{ Params: { userId: string } }>('/v1/pos/notifications/preferences/:userId', { preHandler: pre }, handle(getNotificationPreferences))
  fastify.get<{ Params: { userId: string } }>('/v1/pos/users/:userId/notification-preferences', { preHandler: pre }, handle(getNotificationPreferences))
  fastify.put<{ Params: { userId: string } }>(
    '/v1/pos/users/:userId/notification-preferences',
    { preHandler: pre },
    handle(patchNotificationPreferences)
  )
}
