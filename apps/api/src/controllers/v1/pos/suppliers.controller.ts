import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createSupplierSchema, updateSupplierSchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function listSuppliers(
  request: FastifyRequest<{
    Querystring: {
      search?: string
      active?: string
      page?: string
      limit?: string
      sortBy?: string
      sortOrder?: string
    }
  }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.listSuppliers(ctx, request.query)
  return ok(data)
}

async function getSupplierById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const data = await posService.getSupplierById(ctx, request.params.id)
  return ok(data)
}

async function createSupplier(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createSupplierSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.createSupplier(ctx, body)
  return ok(data)
}

async function updateSupplier(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const body = validateBody(updateSupplierSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.updateSupplier(ctx, request.params.id, body)
  return ok(data)
}

async function deleteSupplier(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  await posService.deleteSupplier(ctx, request.params.id)
  return { success: true }
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/suppliers', { preHandler: pre }, handle(listSuppliers))
  fastify.get<{ Params: { id: string } }>('/v1/pos/suppliers/:id', { preHandler: pre }, handle(getSupplierById))
  fastify.post('/v1/pos/suppliers', { preHandler: pre }, handle(createSupplier))
  fastify.put<{ Params: { id: string } }>('/v1/pos/suppliers/:id', { preHandler: pre }, handle(updateSupplier))
  fastify.delete<{ Params: { id: string } }>('/v1/pos/suppliers/:id', { preHandler: pre }, handle(deleteSupplier))
}
