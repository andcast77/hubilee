import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createSaleSchema, settleSaleSchema } from '../../../dto/pos.dto.js'
import * as posService from '../../../services/pos.service.js'
import { sseManager } from '../../../services/sse.service.js'
import { requirePermission } from '../../../core/permissions.js'
import { getCtx, handle, pre } from './_shared.js'
import { writeAuditLog } from '../../../services/audit-log.service.js'

async function listSales(
  request: FastifyRequest<{
    Querystring: { storeId?: string; customerId?: string; userId?: string; status?: string; paymentMethod?: string; startDate?: string; endDate?: string; page?: string; limit?: string }
  }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  return posService.listSales(ctx, request.query)
}

async function getSaleById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  return posService.getSaleById(ctx, request.params.id)
}

async function createSale(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createSaleSchema, request.body)
  const ctx = getCtx(request, true)
  const result = await posService.createSale(ctx, body)
  sseManager.emit(ctx.companyId, 'sale:created', { companyId: ctx.companyId, storeId: request.storeId ?? null })
  if (result.success && result.data) {
    writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'SALE_CREATED',
      entityType: 'sale',
      entityId: (result.data as { id?: string }).id,
      after: { total: (result.data as Record<string, unknown>).total, status: (result.data as Record<string, unknown>).status },
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    })
  }
  return result
}

async function settleSale(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const body = validateBody(settleSaleSchema, request.body)
  const ctx = getCtx(request, true)
  const result = await posService.settleSale(ctx, request.params.id, body)
  sseManager.emit(ctx.companyId, 'sale:settled', { companyId: ctx.companyId, storeId: request.storeId ?? null })
  if (result.success && result.data) {
    writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: 'SALE_SETTLED',
      entityType: 'sale',
      entityId: request.params.id,
      after: { status: (result.data as Record<string, unknown>).status, cashSessionId: (result.data as Record<string, unknown>).cashSessionId },
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    })
  }
  return result
}

async function cancelSale(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const result = await posService.cancelSale(ctx, request.params.id)
  writeAuditLog({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: 'SALE_CANCELLED',
    entityType: 'sale',
    entityId: request.params.id,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
  })
  return result
}

async function refundSale(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const result = await posService.refundSale(ctx, request.params.id)
  writeAuditLog({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: 'SALE_REFUNDED',
    entityType: 'sale',
    entityId: request.params.id,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
  })
  return result
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/sales', { preHandler: pre }, handle(listSales))
  fastify.get<{ Params: { id: string } }>('/v1/pos/sales/:id', { preHandler: pre }, handle(getSaleById))
  fastify.post('/v1/pos/sales', { preHandler: [...pre, requirePermission('pos.sales', 'create')] }, handle(createSale))
  fastify.post<{ Params: { id: string } }>('/v1/pos/sales/:id/cancel', { preHandler: [...pre, requirePermission('pos.sales', 'cancel')] }, handle(cancelSale))
  fastify.post<{ Params: { id: string } }>('/v1/pos/sales/:id/settle', { preHandler: [...pre, requirePermission('pos.sales', 'settle')] }, handle(settleSale))
  fastify.post<{ Params: { id: string } }>('/v1/pos/sales/:id/refund', { preHandler: [...pre, requirePermission('pos.sales', 'refund')] }, handle(refundSale))
}
