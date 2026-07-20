import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { updateUserPreferencesSchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function getUserPreferences(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, false)
  const preferences = await posService.getUserPreferences(ctx, request.params.userId)
  return ok(preferences)
}

async function updateUserPreferences(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
  const body = validateBody(updateUserPreferencesSchema, request.body)
  const ctx = getCtx(request, false)
  const preferences = await posService.updateUserPreferences(ctx, request.params.userId, body)
  return ok(preferences)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { userId: string } }>('/v1/pos/user-preferences/:userId', { preHandler: pre }, handle(getUserPreferences))
  fastify.put<{ Params: { userId: string } }>('/v1/pos/user-preferences/:userId', { preHandler: pre }, handle(updateUserPreferences))
}
