import { posApi } from '@/lib/api/client'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@/types'

interface SaleWithRelations {
  id: string
  total: number
  invoiceNumber: string | null
  paymentMethod: string | null
  user?: { name: string }
  customer?: { name: string }
  items?: Array<{
    product?: { name: string }
    quantity: number
    price: number
    subtotal: number
  }>
}

/**
 * Check for important sales and send notifications (via API)
 */
export async function checkImportantSaleAlerts(): Promise<number> {
  const importantSaleThreshold = 500
  const startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const salesResponse = await posApi.get<{ success: boolean; data?: { sales?: SaleWithRelations[] } }>(
    `/sales?status=COMPLETED&startDate=${startDate}&minTotal=${importantSaleThreshold}`
  )
  const recentSales = salesResponse.success && salesResponse.data?.sales ? salesResponse.data.sales : []

  if (recentSales.length === 0) {
    return 0
  }

  let users: Array<{ id: string; notificationPreferences?: { inAppImportantSales?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppImportantSales?: boolean } }> }>(
      '/users/notify-recipients?role=ADMIN,SUPERVISOR'
    )
    users = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet
  }

  let notificationsSent = 0

  for (const sale of recentSales) {
    for (const user of users) {
      const preferences = user.notificationPreferences
      if (preferences && preferences.inAppImportantSales === false) {
        continue
      }

      await sendNotification({
        userId: user.id,
        type: NotificationType.IMPORTANT_SALE,
        priority: NotificationPriority.MEDIUM,
        title: 'Venta importante registrada',
        message: `Venta de $${sale.total.toFixed(2)} realizada por ${sale.user?.name ?? 'N/A'}${sale.customer ? ` a ${sale.customer.name}` : ''}`,
        data: {
          sale: {
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            user: sale.user,
            customer: sale.customer,
            items: sale.items?.map((item: { product?: { name: string }; quantity: number; price: number; subtotal: number }) => ({
              productName: item.product?.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        actionUrl: `/sales/${sale.id}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      notificationsSent++
    }
  }

  return notificationsSent
}

/**
 * Send alert for a specific important sale (via API)
 */
export async function sendImportantSaleAlert(saleId: string): Promise<void> {
  const saleResponse = await posApi.get<{ success: boolean; data?: SaleWithRelations }>(
    `/sales/${saleId}`
  )
  const sale = saleResponse.success ? saleResponse.data : null

  if (!sale) {
    return
  }

  const importantSaleThreshold = 500
  if (sale.total < importantSaleThreshold) {
    return
  }

  let users: Array<{ id: string; notificationPreferences?: { inAppImportantSales?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppImportantSales?: boolean } }> }>(
      '/users/notify-recipients?role=ADMIN,SUPERVISOR'
    )
    users = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet
  }

  for (const user of users) {
    const preferences = user.notificationPreferences
    if (preferences && preferences.inAppImportantSales === false) {
      continue
    }

    await sendNotification({
      userId: user.id,
      type: NotificationType.IMPORTANT_SALE,
      priority: NotificationPriority.MEDIUM,
      title: 'Venta importante registrada',
      message: `Venta de $${sale.total.toFixed(2)} realizada por ${sale.user?.name ?? 'N/A'}${sale.customer ? ` a ${sale.customer.name}` : ''}`,
      data: {
        sale: {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          user: sale.user,
          customer: sale.customer,
          items: sale.items?.map((item: { product?: { name: string }; quantity: number; price: number; subtotal: number }) => ({
            productName: item.product?.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      actionUrl: `/sales/${sale.id}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
  }
}
