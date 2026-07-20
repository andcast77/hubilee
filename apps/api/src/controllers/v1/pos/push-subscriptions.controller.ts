import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createPushSubscriptionSchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function listPushSubscriptions(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const data = await posService.listPushSubscriptions(ctx, request.params.userId)
  return ok(data)
}

async function createPushSubscription(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createPushSubscriptionSchema, request.body)
  const ctx = getCtx(request, true)
  const sub = await posService.createPushSubscription(ctx, body)
  return ok(sub)
}

async function deletePushSubscription(request: FastifyRequest<{ Querystring: { endpoint?: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  await posService.deletePushSubscription(ctx, request.query.endpoint ?? '')
  return { success: true }
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { userId: string } }>('/v1/pos/users/:userId/push-subscriptions', { preHandler: pre }, handle(listPushSubscriptions))
  fastify.post('/v1/pos/push-subscriptions', { preHandler: pre }, handle(createPushSubscription))
  fastify.delete('/v1/pos/push-subscriptions', { preHandler: pre }, handle(deletePushSubscription))
}
