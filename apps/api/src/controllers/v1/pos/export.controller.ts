import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { ok } from '../../../common/api-response.js'
import { getCtx, handle, pre } from './_shared.js'
import { createExportJob, downloadExportJobResult, getExportJobStatus } from '../../../services/pos-export-jobs.service.js'
import { z } from 'zod'

async function exportJson(request: FastifyRequest, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const job = await createExportJob(ctx, { format: 'json' })
  return ok(job)
}

async function exportCsv(request: FastifyRequest<{ Querystring: { table?: string } }>, reply: FastifyReply) {
  const ctx = getCtx(request, true)
  const job = await createExportJob(ctx, { format: 'csv', table: request.query.table })
  return ok(job)
}

const createJobBodySchema = z.object({
  format: z.enum(['json', 'csv']),
  table: z.string().optional(),
})

async function createJob(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const body = createJobBodySchema.parse(request.body)
  const job = await createExportJob(ctx, body)
  return ok(job)
}

async function getJob(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const record = await getExportJobStatus(ctx, request.params.jobId)
  return ok({
    id: record.id,
    status: record.status,
    error: record.error ?? null,
    expiresAt: record.expiresAt,
  })
}

async function downloadJob(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const result = await downloadExportJobResult(ctx, request.params.jobId)

  reply.header('Content-Type', result.contentType)
  reply.header('Content-Disposition', `attachment; filename="${result.filename}"`)

  // Keep response JSON so the shared ApiClient can parse it.
  return ok(result)
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/export/json', { preHandler: pre }, handle(exportJson))
  fastify.get('/v1/pos/export/csv', { preHandler: pre }, handle(exportCsv))
  fastify.post('/v1/pos/export/jobs', { preHandler: pre }, handle(createJob))
  fastify.get<{ Params: { jobId: string } }>('/v1/pos/export/jobs/:jobId', { preHandler: pre }, handle(getJob))
  fastify.get<{ Params: { jobId: string } }>('/v1/pos/export/jobs/:jobId/download', { preHandler: pre }, handle(downloadJob))
}
