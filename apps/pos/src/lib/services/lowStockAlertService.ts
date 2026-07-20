import { posApi } from '@/lib/api/client'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@/types'

interface LowStockProduct {
  id: string
  name: string
  sku: string
  stock: number
  minStock: number
  category?: { name: string }
}

/**
 * Check for low stock products and send alerts (via API)
 */
export async function checkLowStockAlerts(): Promise<number> {
  const productsResponse = await posApi.get<{ success: boolean; data?: LowStockProduct[] }>(
    '/products/low-stock'
  )
  const lowStockProducts = productsResponse.success && productsResponse.data ? productsResponse.data : []

  if (lowStockProducts.length === 0) {
    return 0
  }

  let users: Array<{ id: string; notificationPreferences?: { inAppLowStock?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppLowStock?: boolean } }> }>(
      '/users/notify-recipients?role=ADMIN,SUPERVISOR'
    )
    users = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet; skip sending alerts
  }

  let notificationsSent = 0

  for (const user of users) {
    const preferences = user.notificationPreferences
    if (preferences && preferences.inAppLowStock === false) {
      continue
    }

    const productList = lowStockProducts
      .map((p: LowStockProduct) => `${p.name} (${p.stock}/${p.minStock})`)
      .join(', ')

    await sendNotification({
      userId: user.id,
      type: NotificationType.LOW_STOCK_ALERT,
      priority: NotificationPriority.HIGH,
      title: 'Productos con stock bajo',
      message: `${lowStockProducts.length} producto(s) tienen stock por debajo del mínimo: ${productList}`,
      data: {
        products: lowStockProducts.map((p: LowStockProduct) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          minStock: p.minStock,
          category: p.category?.name,
        })),
      },
      actionUrl: '/products?filter=low-stock',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    notificationsSent++
  }

  return notificationsSent
}

/**
 * Send alert for a specific product that went low on stock (via API)
 */
export async function sendLowStockAlertForProduct(productId: string): Promise<void> {
  const productResponse = await posApi.get<{ success: boolean; data?: LowStockProduct }>(
    `/products/${productId}`
  )
  const product = productResponse.success ? productResponse.data : null

  if (!product || product.stock > product.minStock) {
    return
  }

  let users: Array<{ id: string; notificationPreferences?: { inAppLowStock?: boolean } }> = []
  try {
    const usersResponse = await posApi.get<{ success: boolean; data?: Array<{ id: string; notificationPreferences?: { inAppLowStock?: boolean } }> }>(
      '/users/notify-recipients?role=ADMIN,SUPERVISOR'
    )
    users = usersResponse.success && usersResponse.data ? usersResponse.data : []
  } catch {
    // API may not have notify-recipients endpoint yet
  }

  for (const user of users) {
    const preferences = user.notificationPreferences
    if (preferences && preferences.inAppLowStock === false) {
      continue
    }

    await sendNotification({
      userId: user.id,
      type: NotificationType.LOW_STOCK_ALERT,
      priority: NotificationPriority.MEDIUM,
      title: 'Producto con stock bajo',
      message: `El producto "${product.name}" (SKU: ${product.sku}) tiene stock bajo: ${product.stock}/${product.minStock}`,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          minStock: product.minStock,
          category: product.category?.name,
        },
      },
      actionUrl: `/products/${product.id}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  }
}
