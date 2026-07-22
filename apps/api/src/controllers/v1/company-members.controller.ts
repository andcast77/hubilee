import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { requireAuth, userDisplayName } from '../../core/auth.js'
import { validateBody } from '../../core/validate.js'
import {
  attachMemberEmailBodySchema,
  createMemberBodySchema,
  resetMemberPasswordBodySchema,
  updateMemberStoresBodySchema,
} from '../../dto/company-members.dto.js'
import { ok } from '../../common/api-response.js'
import * as companyMembersService from '../../services/company-members.service.js'
import * as companyMembersHelper from '../../helpers/company-members.helper.js'

export async function list(request: FastifyRequest<{ Params: { companyId: string } }>, reply: FastifyReply) {
  const result = await companyMembersService.list(request.params.companyId, request.user!)
  const data = result.members.map((m: (typeof result.members)[number]) =>
    companyMembersHelper.toMemberResponse(m, m.membershipRole === 'USER' ? (result.userStoresMap.get(m.userId) ?? []) : undefined)
  )
  return ok(data)
}

export async function create(request: FastifyRequest<{ Params: { companyId: string }; Body: unknown }>, reply: FastifyReply) {
  const body = validateBody(createMemberBodySchema, request.body)
  const result = await companyMembersService.create(request.params.companyId, request.user!, body)
  return ok({
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    name: userDisplayName(result.user),
    membershipRole: result.membershipRole,
    employeeCode: result.employeeCode,
    storeIds: result.storeIds,
  })
}

export async function updateStores(
  request: FastifyRequest<{ Params: { companyId: string; userId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(updateMemberStoresBodySchema, request.body)
  const result = await companyMembersService.updateStores(request.params.companyId, request.params.userId, request.user!, body)
  return ok({ storeIds: result.storeIds })
}

export async function resetPassword(
  request: FastifyRequest<{ Params: { companyId: string; userId: string }; Body: unknown }>,
  _reply: FastifyReply,
) {
  const body = validateBody(resetMemberPasswordBodySchema, request.body)
  const result = await companyMembersService.resetMemberPassword(
    request.params.companyId,
    request.params.userId,
    request.user!,
    body,
  )
  return ok(result)
}

export async function attachEmail(
  request: FastifyRequest<{ Params: { companyId: string; userId: string }; Body: unknown }>,
  _reply: FastifyReply,
) {
  const body = validateBody(attachMemberEmailBodySchema, request.body)
  const result = await companyMembersService.attachMemberEmail(
    request.params.companyId,
    request.params.userId,
    request.user!,
    body,
  )
  return ok(result)
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { companyId: string } }>('/v1/companies/:companyId/members', { preHandler: [requireAuth] }, (request, reply) => list(request, reply))
  fastify.post<{ Params: { companyId: string }; Body: unknown }>('/v1/companies/:companyId/members', { preHandler: [requireAuth] }, (request, reply) => create(request, reply))
  fastify.put<{ Params: { companyId: string; userId: string }; Body: unknown }>('/v1/companies/:companyId/members/:userId/stores', { preHandler: [requireAuth] }, (request, reply) => updateStores(request, reply))
  fastify.put<{ Params: { companyId: string; userId: string }; Body: unknown }>(
    '/v1/companies/:companyId/members/:userId/password',
    { preHandler: [requireAuth] },
    (request, reply) => resetPassword(request, reply),
  )
  fastify.patch<{ Params: { companyId: string; userId: string }; Body: unknown }>(
    '/v1/companies/:companyId/members/:userId/email',
    { preHandler: [requireAuth] },
    (request, reply) => attachEmail(request, reply),
  )
}
