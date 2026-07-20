import { prisma } from '../db/index.js'
import { createNotification } from '../services/pos-notifications.service.js'
import { sendPushToUser } from '../services/push-sender.service.js'
import { saveJobRun, createRunId, isIdemSent, markIdemSent } from './job-state.js'
import type { CompanyContext } from '../core/auth-context.js'

function systemCtx(companyId: string): CompanyContext {
  return { companyId, userId: 'system', isSuperuser: false, membershipRole: null }
}

/**
 * Reminds owners/admins of Invoices whose dueDate is within 3 days or already past.
 * Consolidated per tenant (one notification, not one per invoice).
 * Idempotent per calendar day to prevent duplicate alerts.
 */
export async function runInvoiceReminderForCompany(companyId: string): Promise<void> {
  const runId = createRunId()
  const startedAt = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  const run: Parameters<typeof saveJobRun>[0] = {
    id: runId,
    companyId,
    jobName: 'invoice-reminder',
    status: 'running',
    startedAt,
  }

  try {
    await saveJobRun(run)

    if (await isIdemSent('invoice-reminder', companyId, today)) {
      await saveJobRun({
        ...run,
        status: 'success',
        finishedAt: Date.now(),
        meta: { skipped: true, reason: 'already sent today' },
      })
      return
    }

    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const dueInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { notIn: ['PAID', 'CANCELLED'] },
        dueDate: { not: null, lte: in3Days },
      },
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        status: true,
        total: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    if (dueInvoices.length === 0) {
      await markIdemSent('invoice-reminder', companyId, today)
      await saveJobRun({ ...run, status: 'success', finishedAt: Date.now(), meta: { count: 0 } })
      return
    }

    const overdueInvoices = dueInvoices.filter((inv) => inv.dueDate && inv.dueDate < now)
    const upcomingInvoices = dueInvoices.filter((inv) => inv.dueDate && inv.dueDate >= now)

    const members = await prisma.companyMember.findMany({
      where: { companyId, membershipRole: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    })

    const ctx = systemCtx(companyId)
    const parts: string[] = []
    if (overdueInvoices.length > 0) parts.push(`${overdueInvoices.length} vencida(s)`)
    if (upcomingInvoices.length > 0) parts.push(`${upcomingInvoices.length} próxima(s) a vencer`)

    const notifTitle = 'Recordatorio: facturas pendientes de cobro'
    const notifMessage = `Facturas pendientes: ${parts.join(', ')}.`
    const notifData = {
      overdue: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        total: inv.total,
        customerName: inv.customer?.name ?? null,
      })),
      upcoming: upcomingInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        total: inv.total,
        customerName: inv.customer?.name ?? null,
      })),
    }

    for (const member of members) {
      await createNotification(ctx, {
        userId: member.userId,
        type: 'WARNING',
        priority: 'HIGH',
        title: notifTitle,
        message: notifMessage,
        data: notifData,
        actionUrl: '/invoices',
      })

      void sendPushToUser(member.userId, {
        title: notifTitle,
        body: notifMessage,
        url: '/invoices',
        data: notifData,
      }).catch(() => {})
    }

    await markIdemSent('invoice-reminder', companyId, today)
    await saveJobRun({
      ...run,
      status: 'success',
      finishedAt: Date.now(),
      meta: {
        dueCount: dueInvoices.length,
        overdueCount: overdueInvoices.length,
        notifiedCount: members.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await saveJobRun({ ...run, status: 'error', finishedAt: Date.now(), error: message })
    throw err
  }
}

export async function runInvoiceReminderJob(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(companies.map((c) => runInvoiceReminderForCompany(c.id)))
}
