import { prisma } from '../db/index.js'
import { createNotification } from '../services/pos-notifications.service.js'
import { sendPushToUser } from '../services/push-sender.service.js'
import { saveJobRun, createRunId } from './job-state.js'
import type { CompanyContext } from '../core/auth-context.js'

function systemCtx(companyId: string): CompanyContext {
  return { companyId, userId: 'system', isSuperuser: false, membershipRole: null }
}

export async function runTechServicesReminderForCompany(companyId: string): Promise<void> {
  const runId = createRunId()
  const startedAt = Date.now()
  const run: Parameters<typeof saveJobRun>[0] = {
    id: runId,
    companyId,
    jobName: 'techservices-reminder',
    status: 'running',
    startedAt,
  }

  try {
    await saveJobRun(run)

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const stalledThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const [todayVisits, stalledVisits] = await Promise.all([
      prisma.serviceVisit.findMany({
        where: {
          companyId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledStartAt: { gte: startOfToday, lt: endOfToday },
        },
        include: {
          assignedEmployee: { select: { id: true, firstName: true, lastName: true, userId: true } },
          workOrder: { select: { id: true, title: true } },
        },
      }),
      // Visits stuck IN_PROGRESS for more than 48h without an update
      prisma.serviceVisit.findMany({
        where: {
          companyId,
          status: 'IN_PROGRESS',
          updatedAt: { lt: stalledThreshold },
        },
        include: {
          assignedEmployee: { select: { id: true, firstName: true, lastName: true, userId: true } },
          workOrder: { select: { id: true, title: true } },
        },
      }),
    ])

    if (todayVisits.length === 0 && stalledVisits.length === 0) {
      await saveJobRun({
        ...run,
        status: 'success',
        finishedAt: Date.now(),
        meta: { todayCount: 0, stalledCount: 0 },
      })
      return
    }

    type VisitWithEmployee = (typeof todayVisits)[0]
    const userVisitsMap = new Map<
      string,
      { today: VisitWithEmployee[]; stalled: VisitWithEmployee[] }
    >()

    for (const visit of todayVisits) {
      const uid = visit.assignedEmployee?.userId
      if (!uid) continue
      if (!userVisitsMap.has(uid)) userVisitsMap.set(uid, { today: [], stalled: [] })
      userVisitsMap.get(uid)!.today.push(visit)
    }

    for (const visit of stalledVisits) {
      const uid = visit.assignedEmployee?.userId
      if (!uid) continue
      if (!userVisitsMap.has(uid)) userVisitsMap.set(uid, { today: [], stalled: [] })
      userVisitsMap.get(uid)!.stalled.push(visit)
    }

    const ctx = systemCtx(companyId)
    let notifiedCount = 0

    for (const [userId, { today, stalled }] of userVisitsMap) {
      const parts: string[] = []
      if (today.length > 0) parts.push(`${today.length} visita(s) programada(s) hoy`)
      if (stalled.length > 0) parts.push(`${stalled.length} visita(s) pendiente(s) de cerrar`)

      const notifTitle = 'Recordatorio de visitas técnicas'
      const notifMessage = `${parts.join('. ')}.`
      const notifData = {
        todayVisits: today.map((v) => ({
          id: v.id,
          workOrderTitle: v.workOrder.title,
          scheduledStart: v.scheduledStartAt,
          status: v.status,
        })),
        stalledVisits: stalled.map((v) => ({
          id: v.id,
          workOrderTitle: v.workOrder.title,
          status: v.status,
        })),
      }

      await createNotification(ctx, {
        userId,
        type: 'INFO',
        priority: today.length > 0 ? 'HIGH' : 'MEDIUM',
        title: notifTitle,
        message: notifMessage,
        data: notifData,
        actionUrl: '/techservices',
      })

      void sendPushToUser(userId, {
        title: notifTitle,
        body: notifMessage,
        url: '/techservices',
        data: notifData,
      }).catch(() => {})

      notifiedCount++
    }

    await saveJobRun({
      ...run,
      status: 'success',
      finishedAt: Date.now(),
      meta: {
        todayCount: todayVisits.length,
        stalledCount: stalledVisits.length,
        notifiedCount,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await saveJobRun({ ...run, status: 'error', finishedAt: Date.now(), error: message })
    throw err
  }
}

export async function runTechServicesReminderJob(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(companies.map((c) => runTechServicesReminderForCompany(c.id)))
}
