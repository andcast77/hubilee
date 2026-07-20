import { prisma } from '../db/index.js'
import { createNotification } from '../services/pos-notifications.service.js'
import { sendPushToUser } from '../services/push-sender.service.js'
import type { CompanyContext } from '../core/auth-context.js'
import { saveJobRun, createRunId } from './job-state.js'

function systemCtx(companyId: string): CompanyContext {
  return { companyId, userId: 'system', isSuperuser: false, membershipRole: null }
}

export async function checkAndAlertLowStock(companyId: string): Promise<void> {
  const runId = createRunId()
  const startedAt = Date.now()
  const run: Parameters<typeof saveJobRun>[0] = {
    id: runId,
    companyId,
    jobName: 'inventory-alert',
    status: 'running',
    startedAt,
  }

  try {
    await saveJobRun(run)

    // Fetch inventories where minStock is configured; filter low stock in memory
    // (Prisma ORM does not support field-to-field comparisons in where clauses)
    const inventories = await prisma.storeInventory.findMany({
      where: { companyId, minStock: { gt: 0 } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        store: { select: { id: true, name: true } },
      },
    })

    const lowStock = inventories.filter((inv) => inv.quantity <= inv.minStock)

    if (lowStock.length === 0) {
      await saveJobRun({ ...run, status: 'success', finishedAt: Date.now(), meta: { count: 0 } })
      return
    }

    const members = await prisma.companyMember.findMany({
      where: { companyId, membershipRole: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    })

    const ctx = systemCtx(companyId)
    const summary = lowStock
      .slice(0, 5)
      .map((inv) => `${inv.product.name} (${inv.store.name}): ${inv.quantity}/${inv.minStock}`)
      .join(', ')
    const tail = lowStock.length > 5 ? ` y ${lowStock.length - 5} más` : ''
    const message = `${lowStock.length} producto(s) con stock bajo: ${summary}${tail}`
    const productsPayload = lowStock.map((inv) => ({
      productId: inv.productId,
      productName: inv.product.name,
      storeId: inv.storeId,
      storeName: inv.store.name,
      quantity: inv.quantity,
      minStock: inv.minStock,
    }))

    for (const member of members) {
      // In-app notification
      await createNotification(ctx, {
        userId: member.userId,
        type: 'WARNING',
        priority: 'HIGH',
        title: 'Alerta de stock bajo',
        message,
        data: { products: productsPayload },
        actionUrl: '/inventory',
      })

      // Web push (fire-and-forget, skipped when VAPID not configured)
      void sendPushToUser(member.userId, {
        title: 'Alerta de stock bajo',
        body: message,
        url: '/inventory',
        data: { products: productsPayload },
      }).catch(() => {})
    }

    // Record in IntegrationLog for auditability
    await prisma.integrationLog.create({
      data: {
        companyId,
        integration: 'inventory-alert',
        request: { type: 'low-stock-check', triggeredAt: new Date().toISOString() } as never,
        response: { lowStockCount: lowStock.length, products: productsPayload } as never,
        status: 'success',
      },
    })

    await saveJobRun({
      ...run,
      status: 'success',
      finishedAt: Date.now(),
      meta: { lowStockCount: lowStock.length, notifiedCount: members.length },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await saveJobRun({ ...run, status: 'error', finishedAt: Date.now(), error: message })
    throw err
  }
}

export async function runInventoryAlertJob(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(companies.map((c) => checkAndAlertLowStock(c.id)))
}
