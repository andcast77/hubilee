import { prisma } from '../db/index.js'
import { createNotification } from '../services/pos-notifications.service.js'
import { sendPushToUser } from '../services/push-sender.service.js'
import { getStats } from '../services/pos-reports.service.js'
import { cacheSet } from '../common/cache/cache.js'
import { saveJobRun, createRunId } from './job-state.js'
import type { PosContext } from '../core/auth-context.js'

const REPORT_TTL = 24 * 60 * 60 // 24 hours

function systemCtx(companyId: string): PosContext {
  return { companyId, userId: 'system', isSuperuser: false, membershipRole: null, storeId: null }
}

function reportKey(companyId: string, type: string, date: string): string {
  return `job:report:${type}:${companyId}:${date}`
}

export async function runScheduledReportForCompany(
  companyId: string,
  type: 'daily' | 'weekly',
): Promise<void> {
  const runId = createRunId()
  const startedAt = Date.now()
  const run: Parameters<typeof saveJobRun>[0] = {
    id: runId,
    companyId,
    jobName: `scheduled-report-${type}`,
    status: 'running',
    startedAt,
  }

  try {
    await saveJobRun(run)

    const ctx = systemCtx(companyId)
    const now = new Date()
    const dateLabel = now.toISOString().slice(0, 10)

    const lookbackDays = type === 'daily' ? 1 : 7
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - lookbackDays)

    const stats = await getStats(ctx, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: dateLabel,
    })

    const key = reportKey(companyId, type, dateLabel)
    await cacheSet(key, { stats, generatedAt: now.toISOString(), type }, REPORT_TTL)

    const members = await prisma.companyMember.findMany({
      where: { companyId, membershipRole: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    })

    const label = type === 'daily' ? 'diario' : 'semanal'
    const notifTitle = `Reporte ${label} disponible`
    const notifMessage = `Tu reporte ${label} está listo. Ventas: ${stats.totalSales}, Ingresos: $${stats.totalRevenue.toFixed(2)}`

    for (const member of members) {
      await createNotification(ctx, {
        userId: member.userId,
        type: 'INFO',
        priority: 'MEDIUM',
        title: notifTitle,
        message: notifMessage,
        data: { reportKey: key, stats },
        actionUrl: '/reports',
      })

      void sendPushToUser(member.userId, {
        title: notifTitle,
        body: notifMessage,
        url: '/reports',
        data: { reportKey: key },
      }).catch(() => {})
    }

    await saveJobRun({
      ...run,
      status: 'success',
      finishedAt: Date.now(),
      meta: { type, totalSales: stats.totalSales, notifiedCount: members.length },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await saveJobRun({ ...run, status: 'error', finishedAt: Date.now(), error: message })
    throw err
  }
}

export async function runScheduledReportJob(type: 'daily' | 'weekly' = 'daily'): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(companies.map((c) => runScheduledReportForCompany(c.id, type)))
}
