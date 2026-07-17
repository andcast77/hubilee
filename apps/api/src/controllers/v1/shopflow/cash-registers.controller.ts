import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createCashRegisterSchema } from '../../../dto/shopflow.dto.js'
import * as cashService from '../../../services/shopflow-cash.service.js'
import { requirePermission } from '../../../core/permissions.js'
import { ok } from '../../../common/api-response.js'
import { getCtx, handle, pre } from './_shared.js'

async function listCashRegisters(
  request: FastifyRequest<{ Querystring: { storeId?: string } }>,
  reply: FastifyReply,
) {
  const ctx = getCtx(request, true)
  const registers = await cashService.listCashRegisters(ctx, { storeId: request.query.storeId })
  return ok({ registers })
}

async function createCashRegister(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createCashRegisterSchema, request.body)
  const ctx = getCtx(request, true)
  const register = await cashService.createCashRegister(ctx, body)
  return ok(register)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/shopflow/cash-registers',
    { preHandler: [...pre, requirePermission('shopflow.cash-registers', 'read')] },
    handle(listCashRegisters),
  )
  fastify.post(
    '/v1/shopflow/cash-registers',
    { preHandler: [...pre, requirePermission('shopflow.cash-registers', 'create')] },
    handle(createCashRegister),
  )
}
