import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import { createCustomerSchema, updateCustomerSchema } from '../../../dto/pos.dto.js'
import { ok } from '../../../common/api-response.js'
import * as posService from '../../../services/pos.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function listCustomers(
  request: FastifyRequest<{
    Querystring: {
      search?: string
      email?: string
      phone?: string
      page?: string
      limit?: string
      sortBy?: string
      sortOrder?: string
    }
  }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const data = await posService.listCustomers(ctx, request.query)
  return ok(data)
}

async function getCustomerById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const data = await posService.getCustomerById(ctx, request.params.id)
  return ok(data)
}

async function createCustomer(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createCustomerSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.createCustomer(ctx, body)
  return ok(data)
}

async function updateCustomer(request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) {
  const body = validateBody(updateCustomerSchema, request.body)
  const ctx = getCtx(request, true)
  const data = await posService.updateCustomer(ctx, request.params.id, body)
  return ok(data)
}

async function deleteCustomer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  await posService.deleteCustomer(ctx, request.params.id)
  return { success: true }
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/customers', { preHandler: pre }, handle(listCustomers))
  fastify.get<{ Params: { id: string } }>('/v1/pos/customers/:id', { preHandler: pre }, handle(getCustomerById))
  fastify.post('/v1/pos/customers', { preHandler: pre }, handle(createCustomer))
  fastify.put<{ Params: { id: string } }>('/v1/pos/customers/:id', { preHandler: pre }, handle(updateCustomer))
  fastify.delete<{ Params: { id: string } }>('/v1/pos/customers/:id', { preHandler: pre }, handle(deleteCustomer))
}
