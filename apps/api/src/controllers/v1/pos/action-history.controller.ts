import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createActionHistorySchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { handle, pre } from './_shared.js'

async function createActionHistory(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createActionHistorySchema, request.body)
  const data = await posService.createAction(body)
  return ok(data)
}

async function listActionHistory(request: FastifyRequest<{ Querystring: Record<string, string | undefined> }>, reply: FastifyReply) {
  const data = await posService.listActions((request.query ?? {}) as Record<string, string>)
  return ok(data)
}

async function getActionHistoryByUser(request: FastifyRequest<{ Params: { userId: string }; Querystring: Record<string, string | undefined> }>, reply: FastifyReply) {
  const query = { ...(request.query ?? {}), userId: request.params.userId }
  const data = await posService.listActions(query)
  return ok(data)
}

async function getActionHistoryByEntity(request: FastifyRequest<{ Params: { entityType: string; entityId: string }; Querystring: Record<string, string | undefined> }>, reply: FastifyReply) {
  const query = { ...(request.query ?? {}), entityType: request.params.entityType, entityId: request.params.entityId }
  const data = await posService.listActions(query)
  return ok(data)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/pos/action-history', { preHandler: pre }, handle(createActionHistory))
  fastify.get('/v1/pos/action-history', { preHandler: pre }, handle(listActionHistory))
  fastify.get<{ Params: { userId: string } }>('/v1/pos/action-history/user/:userId', { preHandler: pre }, handle(getActionHistoryByUser))
  fastify.get<{ Params: { entityType: string; entityId: string } }>('/v1/pos/action-history/entity/:entityType/:entityId', { preHandler: pre }, handle(getActionHistoryByEntity))
}
