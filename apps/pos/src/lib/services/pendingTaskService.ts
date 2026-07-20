import { posApi } from '@/lib/api/client'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@/types'

interface PendingSale {
  id: string
  total: number
  createdAt: string
  user?: { name: string }
}

/**
 * Check for pending tasks and send reminders (via API)
 */
export async function checkPendingTasks(): Promise<number> {
  const notificationsSent = await Promise.all([
    checkPendingSales(),
    checkUnprocessedInventory(),
    checkOverdueTasks(),
  ])

  return notificationsSent.reduce((total, count) => total + count, 0)
}

async function checkPendingSales(): Promise<number> {
  const salesResponse = await posApi.get<{ success: boolean; data?: { sales?: PendingSale[] } }>(
    '/sales?status=PENDING'
  )
  const salesData = salesResponse.success && salesResponse.data?.sales ? salesResponse.data.sales : []
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  const pendingSales = salesData.filter((sale: PendingSale) => new Date(sale.createdAt) < thirtyMinutesAgo)

  if (pendingSales.length === 0) {
    return 0
  }

  let supervisors: Array<{ id: string; notificationPreferences?: { inAppPendingTasks?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppPendingTasks?: boolean } }> }>(
      '/users/notify-recipients?role=SUPERVISOR'
    )
    supervisors = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet
  }

  let notificationsSent = 0

  for (const supervisor of supervisors) {
    const preferences = supervisor.notificationPreferences
    if (preferences && preferences.inAppPendingTasks === false) {
      continue
    }

    await sendNotification({
      userId: supervisor.id,
      type: NotificationType.PENDING_TASK,
      priority: NotificationPriority.MEDIUM,
      title: 'Ventas pendientes requieren atención',
      message: `${pendingSales.length} venta(s) han estado pendientes por más de 30 minutos`,
      data: {
        pendingSales: pendingSales.map((sale: PendingSale) => ({
          id: sale.id,
          user: sale.user?.name,
          total: sale.total,
          createdAt: sale.createdAt,
        })),
      },
      actionUrl: '/sales?status=pending',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    })

    notificationsSent++
  }

  return notificationsSent
}

async function checkUnprocessedInventory(): Promise<number> {
  let inactiveProducts = 0
  try {
    const countResponse = await posApi.get<{ success: boolean; data?: { count?: number } }>(
      '/products/inactive-count'
    )
    inactiveProducts = countResponse.success && countResponse.data?.count != null ? countResponse.data.count : 0
  } catch {
    // API may not have inactive-count endpoint yet
  }

  if (inactiveProducts === 0) {
    return 0
  }

  let admins: Array<{ id: string; notificationPreferences?: { inAppPendingTasks?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppPendingTasks?: boolean } }> }>(
      '/users/notify-recipients?role=ADMIN'
    )
    admins = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet
  }

  let notificationsSent = 0

  for (const admin of admins) {
    const preferences = admin.notificationPreferences
    if (preferences && preferences.inAppPendingTasks === false) {
      continue
    }

    await sendNotification({
      userId: admin.id,
      type: NotificationType.PENDING_TASK,
      priority: NotificationPriority.LOW,
      title: 'Productos inactivos requieren revisión',
      message: `${inactiveProducts} producto(s) han estado inactivos por más de una semana`,
      data: {
        inactiveProductsCount: inactiveProducts,
      },
      actionUrl: '/products?status=inactive',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    notificationsSent++
  }

  return notificationsSent
}

async function checkOverdueTasks(): Promise<number> {
  return 0
}

/**
 * Send reminder for a specific pending task (via API)
 */
export async function sendPendingTaskReminder(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const userResponse = await posApi.get<{ success: boolean; data?: { notificationPreferences?: { inAppPendingTasks?: boolean } } }>(
    `/users/${userId}/notification-preferences`
  )
  const user = userResponse.success ? userResponse.data : null

  if (!user?.notificationPreferences?.inAppPendingTasks) {
    return
  }

  await sendNotification({
    userId,
    type: NotificationType.PENDING_TASK,
    priority: NotificationPriority.MEDIUM,
    title,
    message,
    data,
    actionUrl,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
}
