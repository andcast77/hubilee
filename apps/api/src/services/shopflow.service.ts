import { prisma } from '../db/index.js'
import type { CompanyContext, ShopflowContext } from '../core/auth-context.js'
import * as productsService from './products.service.js'
import { NotFoundError, BadRequestError, ForbiddenError } from '../common/errors/app-error.js'
import { createRepositories } from '../repositories/index.js'
import { canAccessUserPreferences, hasFullStoreAccess } from '../policies/shopflow-authorization.policy.js'

export async function listProducts(ctx: CompanyContext, query: Record<string, string | undefined>) {
  return productsService.listProducts(ctx, query)
}

export async function listProductUnits(ctx: CompanyContext) {
  return productsService.listProductUnits(ctx)
}

export async function getProductBySku(ctx: CompanyContext, sku: string) {
  return productsService.getProductBySku(ctx, sku)
}

export async function getProductByBarcode(ctx: CompanyContext, barcode: string) {
  return productsService.getProductByBarcode(ctx, barcode)
}

export async function getLowStock(ctx: CompanyContext, minStockThreshold?: number) {
  return productsService.getLowStock(ctx, minStockThreshold)
}

export async function getProductById(ctx: CompanyContext, id: string) {
  return productsService.getProductById(ctx, id)
}

export async function createProduct(ctx: CompanyContext, body: Parameters<typeof productsService.createProduct>[1]) {
  return productsService.createProduct(ctx, body)
}

export async function updateProduct(
  ctx: CompanyContext,
  id: string,
  body: Parameters<typeof productsService.updateProduct>[2]
) {
  return productsService.updateProduct(ctx, id, body)
}

export async function updateProductInventory(
  ctx: ShopflowContext,
  productId: string,
  payload: { stock: number; minStock?: number }
) {
  const repos = createRepositories(ctx.companyId)
  const product = await repos.products.findById(productId)
  if (!product) return null

  const storeId = ctx.storeId
  if (!storeId) throw new BadRequestError('storeId is required to update inventory (send X-Store-Id header)')

  await repos.inventory.upsert(storeId, productId, {
    quantity: payload.stock,
    ...(payload.minStock !== undefined ? { minStock: payload.minStock } : {}),
  })

  return productsService.getProductById(ctx, productId)
}

export async function deleteProduct(ctx: CompanyContext, id: string) {
  return productsService.deleteProduct(ctx, id)
}

// --- Stores ---
export async function listStores(ctx: ShopflowContext, includeInactive?: string) {
  return createRepositories(ctx.companyId).stores.findAll({
    includeInactive: includeInactive === 'true',
    userId: ctx.userId,
    fullAccess: hasFullStoreAccess(ctx),
  })
}

export async function getStoreByCode(ctx: ShopflowContext, code: string) {
  return createRepositories(ctx.companyId).stores.findByCode(code, {
    userId: ctx.userId,
    fullAccess: hasFullStoreAccess(ctx),
  })
}

export async function getStoreById(ctx: ShopflowContext, id: string) {
  return createRepositories(ctx.companyId).stores.findById(id, {
    userId: ctx.userId,
    fullAccess: hasFullStoreAccess(ctx),
  })
}

export async function createStore(
  ctx: CompanyContext,
  body: { name: string; code: string; address?: string | null; phone?: string | null; email?: string | null; taxId?: string | null }
) {
  return createRepositories(ctx.companyId).stores.create({
    name: body.name,
    code: body.code,
    address: body.address ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    taxId: body.taxId ?? null,
  })
}

export async function updateStore(
  ctx: CompanyContext,
  id: string,
  body: Partial<{ name: string; code: string; address: string | null; phone: string | null; email: string | null; taxId: string | null; active: boolean }>
) {
  const existing = await createRepositories(ctx.companyId).stores.findById(id, { fullAccess: true })
  if (!existing) throw new NotFoundError('Local no encontrado')
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.code !== undefined) updateData.code = body.code
  if (body.address !== undefined) updateData.address = body.address
  if (body.phone !== undefined) updateData.phone = body.phone
  if (body.email !== undefined) updateData.email = body.email
  if (body.taxId !== undefined) updateData.taxId = body.taxId
  if (body.active !== undefined) updateData.active = body.active
  if (Object.keys(updateData).length === 0) return existing
  return createRepositories(ctx.companyId).stores.update(id, updateData)
}

export async function deleteStore(ctx: CompanyContext, id: string) {
  const deleted = await createRepositories(ctx.companyId).stores.delete(id)
  if (!deleted) throw new NotFoundError('Local no encontrado')
}

// --- Store config ---
export async function getStoreConfig(ctx: CompanyContext) {
  const repos = createRepositories(ctx.companyId)
  let config = await repos.stores.findLatestConfig()
  if (!config) {
    config = await repos.stores.createConfig({
      name: 'My Store',
      currency: 'USD',
      taxRate: 0,
      lowStockAlert: 10,
      invoicePrefix: 'INV-',
      invoiceNumber: 1,
      allowSalesWithoutStock: false,
    })
  }
  return config
}

export async function updateStoreConfig(ctx: CompanyContext, body: Record<string, unknown>) {
  const repos = createRepositories(ctx.companyId)
  let config = await repos.stores.findLatestConfig()
  if (!config) {
    config = await repos.stores.createConfig({
      name: (body.name as string) ?? 'My Store',
      address: (body.address as string) ?? null,
      phone: (body.phone as string) ?? null,
      email: (body.email as string) ?? null,
      taxId: (body.taxId as string) ?? null,
      currency: ((body.currency as string) ?? 'USD') as 'USD',
      taxRate: (body.taxRate as number) ?? 0,
      lowStockAlert: (body.lowStockAlert as number) ?? 10,
      invoicePrefix: (body.invoicePrefix as string) ?? 'INV-',
      invoiceNumber: 1,
      allowSalesWithoutStock: (body.allowSalesWithoutStock as boolean) ?? false,
    })
    return config
  }
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name as string
  if (body.address !== undefined) data.address = body.address as string | null
  if (body.phone !== undefined) data.phone = body.phone as string | null
  if (body.email !== undefined) data.email = body.email as string | null
  if (body.taxId !== undefined) data.taxId = body.taxId as string | null
  if (body.currency !== undefined) data.currency = body.currency as string
  if (body.taxRate !== undefined) data.taxRate = body.taxRate as number
  if (body.lowStockAlert !== undefined) data.lowStockAlert = body.lowStockAlert as number
  if (body.invoicePrefix !== undefined) data.invoicePrefix = body.invoicePrefix as string
  if (body.allowSalesWithoutStock !== undefined) data.allowSalesWithoutStock = body.allowSalesWithoutStock as boolean
  if (Object.keys(data).length === 0) throw new BadRequestError('No hay campos para actualizar')
  return repos.stores.updateConfigById(config.id, data)
}

export async function nextInvoiceNumber(ctx: CompanyContext) {
  const repos = createRepositories(ctx.companyId)
  const config = await repos.stores.findLatestConfig()
  if (!config) throw new NotFoundError('Configuración de tienda no encontrada')
  const result = await repos.stores.incrementInvoiceNumberAndGet(config.id)
  return { invoiceNumber: `${result.invoicePrefix}${result.invoiceNumber.toString().padStart(6, '0')}` }
}

// --- Ticket config ---
export async function getTicketConfig(ctx: CompanyContext, storeId: string | undefined) {
  const repos = createRepositories(ctx.companyId)
  let config = await repos.stores.findLatestTicketConfig(storeId)
  if (!config) {
    config = await repos.stores.createTicketConfig({
      storeId: storeId ?? null,
      ticketType: 'TICKET',
      thermalWidth: 80,
      fontSize: 12,
      copies: 1,
      autoPrint: true,
    })
  }
  return config
}

export async function updateTicketConfig(ctx: CompanyContext, storeId: string | undefined, body: Record<string, unknown>) {
  const repos = createRepositories(ctx.companyId)
  let config = await repos.stores.findLatestTicketConfig(storeId)
  if (!config) {
    config = await repos.stores.createTicketConfig({
      storeId: (body.storeId as string) ?? storeId ?? null,
      ticketType: ((body.ticketType as string) ?? 'TICKET') as 'TICKET',
      header: (body.header as string) ?? null,
      description: (body.description as string) ?? null,
      logoUrl: (body.logoUrl as string) ?? null,
      footer: (body.footer as string) ?? null,
      defaultPrinterName: (body.defaultPrinterName as string) ?? null,
      thermalWidth: (body.thermalWidth as number) ?? 80,
      fontSize: (body.fontSize as number) ?? 12,
      copies: (body.copies as number) ?? 1,
      autoPrint: (body.autoPrint as boolean) ?? true,
    })
    return config
  }
  const data: Record<string, unknown> = {}
  if (body.storeId !== undefined) data.storeId = body.storeId as string | null
  if (body.ticketType !== undefined) {
    const v = body.ticketType as string
    if (['TICKET', 'INVOICE', 'RECEIPT'].includes(v)) data.ticketType = v as 'TICKET' | 'INVOICE' | 'RECEIPT'
  }
  if (body.header !== undefined) data.header = body.header as string | null
  if (body.description !== undefined) data.description = body.description as string | null
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl as string | null
  if (body.footer !== undefined) data.footer = body.footer as string | null
  if (body.defaultPrinterName !== undefined) data.defaultPrinterName = body.defaultPrinterName as string | null
  if (body.thermalWidth !== undefined) data.thermalWidth = body.thermalWidth as number
  if (body.fontSize !== undefined) data.fontSize = body.fontSize as number
  if (body.copies !== undefined) data.copies = body.copies as number
  if (body.autoPrint !== undefined) data.autoPrint = body.autoPrint as boolean
  if (Object.keys(data).length === 0) return config
  return repos.stores.updateTicketConfigById(config.id, data)
}

// --- Loyalty ---
const num = (v: unknown) => (v == null ? 0 : typeof v === 'object' && 'toNumber' in (v as object) ? (v as { toNumber: () => number }).toNumber() : Number(v))

export async function getLoyaltyConfig(ctx: CompanyContext) {
  const config = await createRepositories(ctx.companyId).loyalty.findActiveConfig()
  if (!config) {
    return { pointsPerDollar: 1.0, redemptionRate: 0.01, pointsExpireMonths: undefined as number | undefined, minPurchaseForPoints: 0, maxPointsPerPurchase: undefined as number | undefined }
  }
  return {
    pointsPerDollar: num(config.pointsPerDollar),
    redemptionRate: num(config.redemptionRate),
    pointsExpireMonths: config.pointsExpireMonths ?? undefined,
    minPurchaseForPoints: num(config.minPurchaseForPoints),
    maxPointsPerPurchase: config.maxPointsPerPurchase != null ? num(config.maxPointsPerPurchase) : undefined,
  }
}

export async function updateLoyaltyConfig(ctx: CompanyContext, body: Record<string, unknown>) {
  const repos = createRepositories(ctx.companyId)
  const existing = await repos.loyalty.findCompanyConfig()
  const cur = existing
    ? {
        pointsPerDollar: Number(existing.pointsPerDollar),
        redemptionRate: Number(existing.redemptionRate),
        pointsExpireMonths: existing.pointsExpireMonths,
        minPurchaseForPoints: Number(existing.minPurchaseForPoints),
        maxPointsPerPurchase: existing.maxPointsPerPurchase,
      }
    : { pointsPerDollar: 1.0, redemptionRate: 0.01, pointsExpireMonths: null as number | null, minPurchaseForPoints: 0, maxPointsPerPurchase: null as number | null }
  const next = {
    pointsPerDollar: (body.pointsPerDollar as number) ?? cur.pointsPerDollar,
    redemptionRate: (body.redemptionRate as number) ?? cur.redemptionRate,
    pointsExpireMonths: (body.pointsExpireMonths as number) ?? cur.pointsExpireMonths,
    minPurchaseForPoints: (body.minPurchaseForPoints as number) ?? cur.minPurchaseForPoints,
    maxPointsPerPurchase: (body.maxPointsPerPurchase as number) ?? cur.maxPointsPerPurchase,
  }
  let saved
  if (existing) {
    saved = await repos.loyalty.updateConfig(existing.id, next)
  } else {
    saved = await repos.loyalty.createConfig(next)
    await repos.loyalty.deactivateOtherActiveConfigs(saved.id)
  }
  return {
    pointsPerDollar: num(saved.pointsPerDollar),
    redemptionRate: num(saved.redemptionRate),
    pointsExpireMonths: saved.pointsExpireMonths ?? undefined,
    minPurchaseForPoints: num(saved.minPurchaseForPoints),
    maxPointsPerPurchase: saved.maxPointsPerPurchase != null ? num(saved.maxPointsPerPurchase) : undefined,
  }
}

export async function getCustomerPoints(ctx: CompanyContext, customerId: string) {
  const repos = createRepositories(ctx.companyId)
  const customer = await repos.customers.findById(customerId)
  if (!customer) throw new NotFoundError('Cliente no encontrado')

  const transactions = await repos.loyalty.findTransactionsByCustomerId(customerId)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  let totalPoints = 0
  let availablePoints = 0
  let expiringSoon = 0
  let lastActivity: Date | null = null
  for (const t of transactions) {
    const createdAt = new Date(t.createdAt)
    if (!lastActivity || createdAt > lastActivity) lastActivity = createdAt
    if (t.expiresAt && new Date(t.expiresAt) < now) continue
    const points = num(t.points) || 0
    totalPoints += points
    if (t.type !== 'REDEEMED') availablePoints += points
    if (t.expiresAt && new Date(t.expiresAt) <= thirtyDaysFromNow && new Date(t.expiresAt) > now && t.type !== 'REDEEMED') expiringSoon += points
  }
  return { customerId, customerName: customer.name, totalPoints: Math.max(0, totalPoints), availablePoints: Math.max(0, availablePoints), expiringSoon: Math.max(0, expiringSoon), lastActivity }
}

export async function awardLoyaltyPoints(ctx: CompanyContext, body: { customerId: string; purchaseAmount: number; saleId: string }) {
  const repos = createRepositories(ctx.companyId)
  const customer = await repos.customers.findById(body.customerId)
  if (!customer) throw new NotFoundError('Cliente no encontrado')

  const config = await repos.loyalty.findActiveConfig()
  if (!config) return { pointsAwarded: 0 }
  const minPurchase = num(config.minPurchaseForPoints) || 0
  if (body.purchaseAmount < minPurchase) return { pointsAwarded: 0 }
  let pointsToAward = Math.floor(body.purchaseAmount * num(config.pointsPerDollar))
  if (config.maxPointsPerPurchase != null) {
    const maxPoints = num(config.maxPointsPerPurchase)
    if (pointsToAward > maxPoints) pointsToAward = maxPoints
  }
  if (pointsToAward <= 0) return { pointsAwarded: 0 }
  let expiresAt: Date | null = null
  if (config.pointsExpireMonths != null) {
    expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + num(config.pointsExpireMonths))
  }
  const transaction = await repos.loyalty.createEarnedPoints({
    customerId: body.customerId,
    points: pointsToAward,
    description: `Points earned from purchase #${body.saleId}`,
    saleId: body.saleId,
    expiresAt,
  })
  return { pointsAwarded: Number(transaction.points) }
}

// --- Export ---
export { exportJson, exportCsv } from './shopflow-export.service.js'

// --- Categories ---
export { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from './shopflow-categories.service.js'

// --- Suppliers ---
export { listSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from './shopflow-suppliers.service.js'

// --- Customers ---
export { listCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from './shopflow-customers.service.js'
export { createAction, listActions } from './shopflow-action-history.service.js'

// --- Sales ---
export {
  listSales, getSaleById, createSale, cancelSale, refundSale, settleSale,
  type Sale, type SaleItem, type ListSalesQuery, type CreateSaleBody, type SettleSaleInput,
} from './shopflow-sales.service.js'

// --- Reports ---
export {
  resolveEffectiveStoreIdForReport, getStats, getDaily, getTopProducts,
  getPaymentMethods, getInventory, getToday, getWeek, getMonth, getByUser,
  getDashboardBusinessMetrics,
} from './shopflow-reports.service.js'

// --- Notifications ---
export {
  createNotification, listNotifications, markNotificationAsRead, markNotificationAsUnread,
  markAllNotificationsRead, deleteNotification, getUnreadCount, getNotificationPreferences,
  updateNotificationPreferences,
} from './shopflow-notifications.service.js'

// --- User preferences ---
export async function getUserPreferences(ctx: CompanyContext, userId: string) {
  const allowed = await canAccessUserPreferences(ctx.userId, ctx.isSuperuser, ctx.companyId, ctx.membershipRole, userId)
  if (!allowed) throw new ForbiddenError('No tienes acceso a las preferencias de este usuario')
  const repos = createRepositories(ctx.companyId)
  let preferences = await repos.userPreferences.findByUserId(userId)
  if (!preferences) {
    preferences = await repos.userPreferences.create(userId, 'es')
  }
  return preferences
}

export async function updateUserPreferences(ctx: CompanyContext, userId: string, body: { language?: string }) {
  const allowed = await canAccessUserPreferences(ctx.userId, ctx.isSuperuser, ctx.companyId, ctx.membershipRole, userId)
  if (!allowed) throw new ForbiddenError('No tienes acceso a las preferencias de este usuario')
  const repos = createRepositories(ctx.companyId)
  const preferences = await repos.userPreferences.findIdByUserId(userId)
  if (!preferences) {
    return repos.userPreferences.create(userId, body.language ?? 'es')
  }
  if (body.language === undefined) throw new BadRequestError('No hay campos para actualizar')
  return repos.userPreferences.updateLanguage(userId, body.language)
}

// --- Push subscriptions ---
export async function listPushSubscriptions(ctx: ShopflowContext, userId: string) {
  if (userId !== ctx.userId) throw new ForbiddenError('Solo puedes ver tus propias suscripciones')
  const rows = await createRepositories(ctx.companyId).pushSubscriptions.listByUserId(userId)
  return rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }))
}

export async function createPushSubscription(ctx: ShopflowContext, body: { userId?: string; endpoint: string; p256dh: string; auth: string }) {
  const { userId: bodyUserId, endpoint, p256dh, auth } = body
  if (!endpoint || !p256dh || !auth) throw new BadRequestError('endpoint, p256dh y auth son requeridos')
  const userId = bodyUserId && bodyUserId === ctx.userId ? bodyUserId : ctx.userId
  return createRepositories(ctx.companyId).pushSubscriptions.upsertByEndpoint({ endpoint, userId, p256dh, auth })
}

export async function deletePushSubscription(ctx: ShopflowContext, endpoint: string) {
  if (!endpoint) throw new BadRequestError('Query "endpoint" es requerido')
  const decoded = decodeURIComponent(endpoint)
  // `endpoint` is globally unique; tenant-scoped lookup hid other companies' rows → false 404.
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: decoded },
    select: { userId: true },
  })
  if (!existing) throw new NotFoundError('Suscripción no encontrada')
  if (existing.userId !== ctx.userId) {
    throw new ForbiddenError('Solo puedes eliminar tus propias suscripciones')
  }
  await prisma.pushSubscription.delete({ where: { endpoint: decoded } })
}

// --- Inventory transfers ---
export async function listInventoryTransfers(
  ctx: CompanyContext,
  query: { fromStoreId?: string; toStoreId?: string; productId?: string; status?: string; page?: string; limit?: string },
) {
  const result = await createRepositories(ctx.companyId).inventoryTransfers.list(query)
  return {
    transfers: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  }
}

export async function createInventoryTransfer(
  ctx: CompanyContext,
  body: { fromStoreId: string; toStoreId: string; productId: string; quantity: number; notes?: string | null; createdById: string },
) {
  const repos = createRepositories(ctx.companyId)
  const { fromStoreId, toStoreId, productId, quantity, notes, createdById } = body
  if (fromStoreId === toStoreId) throw new BadRequestError('Origen y destino no pueden ser la misma tienda')
  const product = await repos.products.findById(productId)
  if (!product) throw new NotFoundError('Producto no encontrado')

  const sourceInventory = await repos.inventory.findByStoreAndProduct(fromStoreId, productId)
  if (!sourceInventory || sourceInventory.quantity < quantity) {
    throw new BadRequestError('Stock insuficiente en el local de origen')
  }

  return repos.inventoryTransfers.createPending({
    fromStoreId,
    toStoreId,
    productId,
    quantity,
    notes: notes ?? null,
    createdById,
  })
}

export async function completeInventoryTransfer(ctx: CompanyContext, id: string) {
  const repos = createRepositories(ctx.companyId)
  const existing = await repos.inventoryTransfers.findByIdForCompletion(id)
  if (!existing) throw new NotFoundError('Transferencia no encontrada')
  if (existing.status !== 'PENDING' && existing.status !== 'IN_TRANSIT') {
    throw new BadRequestError('Solo se pueden completar transferencias pendientes')
  }

  await prisma.$transaction(async (tx) => {
    const txRepos = createRepositories(ctx.companyId, tx)
    const source = await txRepos.inventory.findByStoreAndProduct(existing.fromStoreId, existing.productId)
    if (!source || source.quantity < existing.quantity) {
      throw new BadRequestError('Stock insuficiente en el local de origen para completar la transferencia')
    }

    await txRepos.inventory.decrementById(source.id, existing.quantity)
    await txRepos.inventory.incrementOrCreate(existing.toStoreId, existing.productId, existing.quantity)
    await txRepos.inventoryTransfers.updateStatus(id, 'COMPLETED', new Date())
  })

  return createRepositories(ctx.companyId).inventoryTransfers.findById(id)
}

export async function cancelInventoryTransfer(ctx: CompanyContext, id: string) {
  const repos = createRepositories(ctx.companyId)
  const existing = await repos.inventoryTransfers.findById(id)
  if (!existing) throw new NotFoundError('Transferencia no encontrada')
  if (existing.status === 'COMPLETED') throw new BadRequestError('No se puede cancelar una transferencia completada')
  return repos.inventoryTransfers.updateStatus(id, 'CANCELLED')
}
