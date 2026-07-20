import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function getStats(
  request: FastifyRequest<{ Querystring: { storeId?: string; startDate?: string; endDate?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getStats(ctx, request.query)
  return ok(data)
}

async function getDaily(
  request: FastifyRequest<{ Querystring: { storeId?: string; days?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getDaily(ctx, request.query)
  return ok(data)
}

async function getTopProducts(
  request: FastifyRequest<{ Querystring: { storeId?: string; limit?: string; startDate?: string; endDate?: string; categoryId?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getTopProducts(ctx, request.query)
  return ok(data)
}

async function getPaymentMethods(
  request: FastifyRequest<{ Querystring: { storeId?: string; startDate?: string; endDate?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getPaymentMethods(ctx, request.query)
  return ok(data)
}

async function getInventoryReport(
  request: FastifyRequest<{ Querystring: { storeId?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getInventory(ctx, request.query)
  return ok(data)
}

async function getTodayReport(
  request: FastifyRequest<{ Querystring: { storeId?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getToday(ctx, request.query)
  return ok(data)
}

async function getWeekReport(
  request: FastifyRequest<{ Querystring: { storeId?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getWeek(ctx, request.query)
  return ok(data)
}

async function getMonthReport(
  request: FastifyRequest<{ Querystring: { storeId?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getMonth(ctx, request.query)
  return ok(data)
}

async function getReportByUser(
  request: FastifyRequest<{ Params: { userId: string }; Querystring: { startDate?: string; endDate?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getByUser(ctx, request.params, request.query)
  return ok(data)
}

async function getDashboardBusinessMetrics(
  request: FastifyRequest<{ Querystring: { storeId?: string; startDate?: string; endDate?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.getDashboardBusinessMetrics(ctx, request.query)
  return ok(data)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/reports/stats', { preHandler: pre }, handle(getStats))
  fastify.get('/v1/pos/reports/daily', { preHandler: pre }, handle(getDaily))
  fastify.get('/v1/pos/reports/top-products', { preHandler: pre }, handle(getTopProducts))
  fastify.get('/v1/pos/reports/payment-methods', { preHandler: pre }, handle(getPaymentMethods))
  fastify.get('/v1/pos/reports/inventory', { preHandler: pre }, handle(getInventoryReport))
  fastify.get('/v1/pos/reports/today', { preHandler: pre }, handle(getTodayReport))
  fastify.get('/v1/pos/reports/week', { preHandler: pre }, handle(getWeekReport))
  fastify.get('/v1/pos/reports/month', { preHandler: pre }, handle(getMonthReport))
  fastify.get('/v1/pos/reports/dashboard-metrics', { preHandler: pre }, handle(getDashboardBusinessMetrics))
  fastify.get<{ Params: { userId: string } }>('/v1/pos/reports/by-user/:userId', { preHandler: pre }, handle(getReportByUser))
}
