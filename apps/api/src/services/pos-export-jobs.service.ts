import { randomUUID } from 'crypto'
import type { CompanyContext } from '../core/auth-context.js'
import { BadRequestError, NotFoundError } from '../common/errors/app-error.js'
import { getRedis } from '../common/cache/redis.js'
import { cacheGet, cacheSet } from '../common/cache/cache.js'
import * as posService from './pos.service.js'

export type ExportJobFormat = 'json' | 'csv'
export type ExportJobStatus = 'queued' | 'processing' | 'ready' | 'error'

export interface ExportJobRecord {
  id: string
  companyId: string
  format: ExportJobFormat
  table?: string
  status: ExportJobStatus
  error?: string | null
  createdAt: number
  updatedAt: number
  expiresAt: number
}

export interface ExportJobResult {
  filename: string
  contentType: string
  body: string
}

const EXPORT_JOB_TTL_SECONDS = 15 * 60 // 15 minutes

function jobKey(jobId: string): string {
  return `export:job:${jobId}`
}

function resultKey(jobId: string): string {
  return `export:job:${jobId}:result`
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const csvRows: string[] = []

  // Header
  csvRows.push(headers.map((h) => String(h)).join(','))

  // Rows
  for (const row of rows) {
    const values = headers.map((header) => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""')
      }
      return String(value).replace(/"/g, '""').replace(/,/g, ';')
    })

    csvRows.push(`"${values.join('","')}"`)
  }

  return csvRows.join('\n')
}

function buildFilename(format: ExportJobFormat, table: string | undefined): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  if (format === 'json') return `export_all_${ts}.json`
  if (table) return `export_${table}_${ts}.csv`
  return `export_${ts}.csv`
}

async function requireRedisOrThrow(): Promise<void> {
  const redis = getRedis()
  if (!redis) throw new BadRequestError('Export jobs require UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
}

async function loadJob(jobId: string): Promise<ExportJobRecord | null> {
  return cacheGet<ExportJobRecord>(jobKey(jobId))
}

async function loadResult(jobId: string): Promise<ExportJobResult | null> {
  return cacheGet<ExportJobResult>(resultKey(jobId))
}

async function saveJob(job: ExportJobRecord): Promise<void> {
  await cacheSet(jobKey(job.id), job, EXPORT_JOB_TTL_SECONDS)
}

async function saveResult(jobId: string, result: ExportJobResult): Promise<void> {
  await cacheSet(resultKey(jobId), result, EXPORT_JOB_TTL_SECONDS)
}

export async function createExportJob(
  ctx: CompanyContext,
  input: { format: ExportJobFormat; table?: string }
): Promise<{ jobId: string }> {
  await requireRedisOrThrow()

  if (input.format === 'csv' && (!input.table || typeof input.table !== 'string')) {
    throw new BadRequestError('CSV export requires a "table" parameter')
  }

  const jobId = randomUUID()
  const now = Date.now()

  const record: ExportJobRecord = {
    id: jobId,
    companyId: ctx.companyId,
    format: input.format,
    table: input.table,
    status: 'queued',
    error: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + EXPORT_JOB_TTL_SECONDS * 1000,
  }

  await saveJob(record)

  // Fire-and-forget job runner (no HTTP request blocking).
  void (async () => {
    try {
      await saveJob({ ...record, status: 'processing', updatedAt: Date.now(), error: null })

      const filename = buildFilename(input.format, input.table)
      let contentType: string
      let body: string

      if (input.format === 'json') {
        contentType = 'application/json'
        const data = await posService.exportJson(ctx)
        body = JSON.stringify(data)
      } else {
        contentType = 'text/csv'
        const csv = await posService.exportCsv(ctx, input.table)
        body = toCsv(csv.headers, csv.rows as Record<string, unknown>[])
      }

      await saveResult(jobId, { filename, contentType, body })
      await saveJob({ ...record, status: 'ready', updatedAt: Date.now(), error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await saveJob({ ...record, status: 'error', updatedAt: Date.now(), error: message })
    }
  })()

  return { jobId }
}

export async function getExportJobStatus(ctx: CompanyContext, jobId: string): Promise<ExportJobRecord> {
  await requireRedisOrThrow()
  const record = await loadJob(jobId)
  if (!record || record.companyId !== ctx.companyId) {
    throw new NotFoundError('Export job not found')
  }
  return record
}

export async function downloadExportJobResult(
  ctx: CompanyContext,
  jobId: string
): Promise<ExportJobResult> {
  await requireRedisOrThrow()
  const record = await loadJob(jobId)
  if (!record || record.companyId !== ctx.companyId) {
    throw new NotFoundError('Export job not found')
  }
  if (record.status !== 'ready') {
    throw new BadRequestError(`Export job is not ready (status: ${record.status})`, 'EXPORT_NOT_READY')
  }

  const result = await loadResult(jobId)
  if (!result) throw new NotFoundError('Export job result not found')
  return result
}

