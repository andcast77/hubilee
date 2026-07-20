import { timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ok } from '../../common/api-response.js'
import { UnauthorizedError } from '../../common/errors/app-error.js'
import { getValidatedConfig } from '../../plugins/core/env.plugin.js'
import { runBackupJob } from '../../jobs/backup.job.js'
import { runDataRetentionJob } from '../../jobs/data-retention.job.js'
import { runInventoryAlertJob } from '../../jobs/inventory-alert.job.js'
import { runInvoiceReminderJob } from '../../jobs/invoice-reminder.job.js'
import { runScheduledReportJob } from '../../jobs/scheduled-report.job.js'
import { runTechReminderJob } from '../../jobs/tech-reminder.job.js'

type CronEnv = { CRON_SECRET?: string }

function cronSecret(request: FastifyRequest): string {
  const cfg = getValidatedConfig(request.server) as CronEnv
  return (cfg.CRON_SECRET ?? process.env.CRON_SECRET ?? '').trim()
}

function assertCronAuthorized(request: FastifyRequest): void {
  const secret = cronSecret(request)
  if (!secret) {
    throw new UnauthorizedError('Cron is not configured (set CRON_SECRET)')
  }
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid cron authorization')
  }
  const token = auth.slice(7)
  const a = Buffer.from(token, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Invalid cron authorization')
  }
}

async function runAndOk(
  request: FastifyRequest,
  reply: FastifyReply,
  jobId: string,
  fn: () => Promise<void>,
): Promise<void> {
  assertCronAuthorized(request)
  await fn()
  reply.send(ok({ job: jobId, finishedAt: new Date().toISOString() }))
}

/**
 * HTTP entrypoints for scheduled jobs on Vercel (Cron → GET → serverless function).
 * Local/long-running deployments should keep using `startJobRunner()` in server.ts.
 *
 * @see apps/api/vercel.json — schedules are UTC (Vercel Cron).
 */
export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/internal/cron/inventory-alert', (request, reply) =>
    runAndOk(request, reply, 'inventory-alert', runInventoryAlertJob),
  )

  fastify.get('/v1/internal/cron/scheduled-report-daily', (request, reply) =>
    runAndOk(request, reply, 'scheduled-report-daily', () => runScheduledReportJob('daily')),
  )

  fastify.get('/v1/internal/cron/scheduled-report-weekly', (request, reply) =>
    runAndOk(request, reply, 'scheduled-report-weekly', () => runScheduledReportJob('weekly')),
  )

  fastify.get('/v1/internal/cron/invoice-reminder', (request, reply) =>
    runAndOk(request, reply, 'invoice-reminder', runInvoiceReminderJob),
  )

  fastify.get('/v1/internal/cron/backup', (request, reply) =>
    runAndOk(request, reply, 'backup', runBackupJob),
  )

  fastify.get('/v1/internal/cron/tech-reminder', (request, reply) =>
    runAndOk(request, reply, 'tech-reminder', runTechReminderJob),
  )

  fastify.get('/v1/internal/cron/data-retention', (request, reply) =>
    runAndOk(request, reply, 'data-retention', runDataRetentionJob),
  )
}
