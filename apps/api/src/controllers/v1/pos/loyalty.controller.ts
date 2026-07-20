import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { updateLoyaltyConfigSchema, awardLoyaltyPointsSchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function getLoyaltyConfig(request: FastifyRequest, reply: FastifyReply) {
  const ctx = getCtx(request, false)
  const config = await posService.getLoyaltyConfig(ctx)
  return ok(config)
}

async function updateLoyaltyConfig(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(updateLoyaltyConfigSchema, request.body)
  const ctx = getCtx(request, false)
  const config = await posService.updateLoyaltyConfig(ctx, body)
  return ok(config)
}

async function getCustomerPoints(request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const data = await posService.getCustomerPoints(ctx, request.params.customerId)
  return ok(data)
}

async function awardLoyaltyPoints(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(awardLoyaltyPointsSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.awardLoyaltyPoints(ctx, body)
  return ok(data)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/loyalty/config', { preHandler: pre }, handle(getLoyaltyConfig))
  fastify.put('/v1/pos/loyalty/config', { preHandler: pre }, handle(updateLoyaltyConfig))
  fastify.get<{ Params: { customerId: string } }>('/v1/pos/loyalty/points/:customerId', { preHandler: pre }, handle(getCustomerPoints))
  fastify.post('/v1/pos/loyalty/points/award', { preHandler: pre }, handle(awardLoyaltyPoints))
}
