import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../core/auth.js'
import { validateBody } from '../../core/validate.js'
import { updateCompanyBodySchema } from '../../dto/companies.dto.js'
import { ok } from '../../common/api-response.js'
import * as companiesService from '../../services/companies.service.js'
import * as companiesHelper from '../../helpers/companies.helper.js'
import { assertCompanyAccess } from '../../policies/company-authorization.policy.js'
import { listJobHistory } from '../../jobs/job-history.service.js'

async function requireCompanyAccessParam(
  request: FastifyRequest<{ Params: { id: string } }>,
  _reply: FastifyReply
) {
  assertCompanyAccess(request.user!, request.params.id)
}

export async function getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id: companyId } = request.params
  const company = await companiesService.getById(companyId)
  const data = await companiesHelper.toCompanyResponse(company)
  return ok(data)
}

export async function getCredentials(request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) {
  const data = await companiesService.getCredentials(request.params.id, request.user!)
  return ok(data)
}

export async function getStats(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id: companyId } = request.params
  const result = await companiesService.getStats(companyId)
  const lastMemberData = companiesHelper.toCompanyStatsLastMember(result.lastMember)
  return ok({
    totalMembers: result.totalMembers,
    ownerCount: result.ownerCount,
    adminCount: result.adminCount,
    userCount: result.userCount,
    lastMember: lastMemberData,
  })
}

export async function update(request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) {
  const body = validateBody(updateCompanyBodySchema, request.body)
  const result = await companiesService.update(request.params.id, request.user!, body)
  return {
    success: true,
    data: { id: result.id, name: result.name, modules: result.modules, updatedAt: result.updatedAt },
    message: 'Empresa actualizada correctamente',
  }
}

export async function remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await companiesService.remove(request.params.id, request.user!)
  return { success: true, message: 'Empresa eliminada correctamente' }
}

export async function getJobHistory(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>,
  _reply: FastifyReply,
) {
  const { id: companyId } = request.params
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)))
  const result = await listJobHistory(companyId, limit)
  return ok(result)
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    '/v1/companies/:id',
    { preHandler: [requireAuth, requireCompanyAccessParam] },
    (request, reply) => getById(request, reply)
  )
  fastify.get<{ Params: { id: string } }>(
    '/v1/companies/:id/stats',
    { preHandler: [requireAuth, requireCompanyAccessParam] },
    (request, reply) => getStats(request, reply)
  )
  fastify.get<{ Params: { id: string } }>(
    '/v1/companies/:id/credentials',
    { preHandler: [requireAuth] },
    (request, reply) => getCredentials(request, reply)
  )
  fastify.put<{ Params: { id: string }; Body: unknown }>('/v1/companies/:id', { preHandler: [requireAuth] }, (request, reply) => update(request, reply))
  fastify.delete<{ Params: { id: string } }>('/v1/companies/:id', { preHandler: [requireAuth] }, (request, reply) => remove(request, reply))
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/v1/companies/:id/jobs/history',
    { preHandler: [requireAuth, requireCompanyAccessParam] },
    (request, reply) => getJobHistory(request, reply)
  )
}
