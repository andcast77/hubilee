import { prisma } from '../db/index.js'
import { cacheSet } from '../common/cache/cache.js'
import { exportJson } from '../services/pos-export.service.js'
import { saveJobRun, createRunId } from './job-state.js'
import type { CompanyContext } from '../core/auth-context.js'

const BACKUP_TTL = 48 * 60 * 60 // 48 hours

function backupKey(companyId: string, timestamp: string): string {
  return `job:backup:${companyId}:${timestamp}`
}

function systemCtx(companyId: string): CompanyContext {
  return { companyId, userId: 'system', isSuperuser: false, membershipRole: null }
}

/**
 * Runs a full company data backup using the existing Pos export flow:
 *  1. Exports all company tables to JSON via exportJson().
 *  2. Stores the full snapshot in Redis with a 48h TTL (best-effort; silently skipped on size errors).
 *  3. Writes an IntegrationLog entry with per-table record counts for audit trail.
 */
export async function runBackupForCompany(companyId: string): Promise<void> {
  const runId = createRunId()
  const startedAt = Date.now()
  const run: Parameters<typeof saveJobRun>[0] = {
    id: runId,
    companyId,
    jobName: 'backup',
    status: 'running',
    startedAt,
  }

  try {
    await saveJobRun(run)

    const ctx = systemCtx(companyId)
    const timestamp = new Date().toISOString()

    // Full company data export (reuses the existing Pos manual backup flow)
    const exportData = await exportJson(ctx)

    // Per-table record counts for quick summary
    const tableCounts: Record<string, number> = {}
    for (const [table, rows] of Object.entries(exportData)) {
      tableCounts[table] = Array.isArray(rows) ? rows.length : 0
    }
    const totalRecords = Object.values(tableCounts).reduce((s, n) => s + n, 0)

    // Store full snapshot in Redis with 48h TTL
    // cacheSet swallows errors, so large payloads that exceed Redis limits will
    // not block the job — the IntegrationLog entry is always written regardless.
    await cacheSet(backupKey(companyId, timestamp), { companyId, timestamp, data: exportData }, BACKUP_TTL)

    await prisma.integrationLog.create({
      data: {
        companyId,
        integration: 'backup',
        request: { type: 'scheduled-backup', timestamp } as never,
        response: { tableCounts, totalRecords } as never,
        status: 'success',
      },
    })

    await saveJobRun({
      ...run,
      status: 'success',
      finishedAt: Date.now(),
      meta: { tableCounts, totalRecords },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    try {
      await prisma.integrationLog.create({
        data: {
          companyId,
          integration: 'backup',
          request: { type: 'scheduled-backup' } as never,
          status: 'error',
          error: message,
        },
      })
    } catch {
      // Swallow secondary failure — main error is re-thrown below
    }

    await saveJobRun({ ...run, status: 'error', finishedAt: Date.now(), error: message })
    throw err
  }
}

export async function runBackupJob(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(companies.map((c) => runBackupForCompany(c.id)))
}
