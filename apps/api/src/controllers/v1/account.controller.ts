import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { requireAuth } from '../../core/auth.js'
import { validateBody } from '../../core/validate.js'
import { ok } from '../../common/api-response.js'
import { BadRequestError } from '../../common/errors/app-error.js'
import * as accountService from '../../services/account.service.js'
import * as accountMfaService from '../../services/account-mfa.service.js'
import {
  mfaConfirmBodySchema,
  mfaDisableBodySchema,
  mfaRegenerateBackupBodySchema,
} from '../../dto/account-mfa.dto.js'
import { writeAuditLog } from '../../services/audit-log.service.js'

async function getMyData(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.id
  const data = await accountService.exportMyData(userId)
  reply.header('Content-Disposition', 'attachment; filename="my-data.json"')
  return ok(data)
}

async function deleteMyData(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.id
  const result = await accountService.anonymizeMyData(userId)
  return ok(result)
}

async function acceptPrivacy(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.id
  const result = await accountService.acceptPrivacy(userId)
  return ok(result)
}

async function postMfaSetup(request: FastifyRequest, reply: FastifyReply) {
  const u = request.user!
  if (!u.email) {
    throw new BadRequestError('MFA requiere una cuenta con email')
  }
  const result = await accountMfaService.setupMfa(u.id, u.email)
  return ok(result)
}

async function postMfaConfirm(request: FastifyRequest, reply: FastifyReply) {
  const u = request.user!
  const body = validateBody(mfaConfirmBodySchema, request.body)
  const result = await accountMfaService.confirmMfa(u.id, body.totpCode)
  if (u.companyId) {
    writeAuditLog({
      companyId: u.companyId,
      userId: u.id,
      action: 'MFA_ENABLED',
      entityType: 'auth',
      entityId: u.id,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    })
  }
  return ok(result)
}

async function deleteMfa(request: FastifyRequest, reply: FastifyReply) {
  const u = request.user!
  const body = validateBody(mfaDisableBodySchema, request.body)
  await accountMfaService.disableMfa(u.id, body.totpCode, body.backupCode)
  if (u.companyId) {
    writeAuditLog({
      companyId: u.companyId,
      userId: u.id,
      action: 'MFA_DISABLED',
      entityType: 'auth',
      entityId: u.id,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    })
  }
  return ok({ disabled: true })
}

async function getMfaBackupCodes(request: FastifyRequest, reply: FastifyReply) {
  const u = request.user!
  const rows = await accountMfaService.getBackupCodesMeta(u.id)
  return ok({ codes: rows })
}

async function postMfaRegenerateBackup(request: FastifyRequest, reply: FastifyReply) {
  const u = request.user!
  const body = validateBody(mfaRegenerateBackupBodySchema, request.body)
  const result = await accountMfaService.regenerateBackupCodes(u.id, body.totpCode)
  return ok(result)
}

export async function registerRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth]

  fastify.get('/v1/account/my-data', { preHandler: guard }, (req, rep) => getMyData(req, rep))
  fastify.delete('/v1/account/my-data', { preHandler: guard }, (req, rep) => deleteMyData(req, rep))
  fastify.post('/v1/account/accept-privacy', { preHandler: guard }, (req, rep) => acceptPrivacy(req, rep))

  fastify.post('/v1/account/mfa/setup', { preHandler: guard }, (req, rep) => postMfaSetup(req, rep))
  fastify.post('/v1/account/mfa/confirm', { preHandler: guard }, (req, rep) => postMfaConfirm(req, rep))
  fastify.delete('/v1/account/mfa', { preHandler: guard }, (req, rep) => deleteMfa(req, rep))
  fastify.get('/v1/account/mfa/backup-codes', { preHandler: guard }, (req, rep) => getMfaBackupCodes(req, rep))
  fastify.post('/v1/account/mfa/backup-codes/regenerate', { preHandler: guard }, (req, rep) =>
    postMfaRegenerateBackup(req, rep)
  )
}
