import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { openCashSessionSchema, closeCashSessionSchema } from '../../../dto/shopflow.dto.js'
import * as cashService from '../../../services/shopflow-cash.service.js'
import { requirePermission } from '../../../core/permissions.js'
import { ok } from '../../../common/api-response.js'
import { getCtx, handle, pre } from './_shared.js'

function toSessionStatus(raw: string | undefined): 'OPEN' | 'CLOSED' | undefined {
  return raw === 'OPEN' || raw === 'CLOSED' ? raw : undefined
}

async function listCashSessions(
  request: FastifyRequest<{ Querystring: { storeId?: string; cashRegisterId?: string; status?: string } }>,
  reply: FastifyReply,
) {
  const ctx = getCtx(request, true)
  const { storeId, cashRegisterId, status } = request.query
  const sessions = await cashService.listCashSessions(ctx, {
    storeId,
    cashRegisterId,
    status: toSessionStatus(status),
  })
  return ok({ sessions })
}

async function openCashSession(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(openCashSessionSchema, request.body)
  const ctx = getCtx(request, true)
  const session = await cashService.openCashSession(ctx, body)
  return ok(session)
}

async function closeCashSession(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const body = validateBody(closeCashSessionSchema, request.body)
  const ctx = getCtx(request, true)
  const session = await cashService.closeCashSession(ctx, request.params.id, body)
  return ok(session)
}

async function getCashSessionReport(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const report = await cashService.getCashSessionReport(ctx, request.params.id)
  return ok(report)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/shopflow/cash-sessions',
    { preHandler: [...pre, requirePermission('shopflow.cash-sessions', 'read')] },
    handle(listCashSessions),
  )
  fastify.post(
    '/v1/shopflow/cash-sessions/open',
    { preHandler: [...pre, requirePermission('shopflow.cash-sessions', 'open')] },
    handle(openCashSession),
  )
  fastify.post<{ Params: { id: string } }>(
    '/v1/shopflow/cash-sessions/:id/close',
    { preHandler: [...pre, requirePermission('shopflow.cash-sessions', 'close')] },
    handle(closeCashSession),
  )
  fastify.get<{ Params: { id: string } }>(
    '/v1/shopflow/cash-sessions/:id/report',
    { preHandler: [...pre, requirePermission('shopflow.cash-sessions', 'read')] },
    handle(getCashSessionReport),
  )
}
