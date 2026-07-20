import { z } from 'zod'

/** Product: create body (re-export / align with core/schemas/product) */
export const productCreateBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: z.number(),
  cost: z.number().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
})
export type ProductCreateBody = z.infer<typeof productCreateBodySchema>

/** Product: update body (partial) */
export const productUpdateBodySchema = productCreateBodySchema.partial()
export type ProductUpdateBody = z.infer<typeof productUpdateBodySchema>

/** Product: update inventory (writes to StoreInventory for the current store) */
export const productInventoryBodySchema = z.object({
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative().optional(),
})
export type ProductInventoryBody = z.infer<typeof productInventoryBodySchema>

// --- Stores ---
export const createStoreSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxId: z.string().nullable().optional(),
})
export type CreateStoreBody = z.infer<typeof createStoreSchema>

export const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxId: z.string().nullable().optional(),
  active: z.boolean().optional(),
})
export type UpdateStoreBody = z.infer<typeof updateStoreSchema>

// --- Customers ---
export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})
export type CreateCustomerBody = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})
export type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>

// --- Categories ---
export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
})
export type CreateCategoryBody = z.infer<typeof createCategorySchema>

export const updateCategorySchema = createCategorySchema.partial()
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>

// --- Suppliers ---
export const createSupplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
})
export type CreateSupplierBody = z.infer<typeof createSupplierSchema>

export const updateSupplierSchema = createSupplierSchema.partial()
export type UpdateSupplierBody = z.infer<typeof updateSupplierSchema>

// --- Sales ---
export const createSaleSchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    discount: z.number().nonnegative().optional(),
  })).min(1),
  // Direct/kiosco flow: present -> settles inline against this OPEN CashSession.
  // Absent -> creates a PENDING sale (moto/vendedor flow); settle later via POST /sales/:id/settle.
  cashSessionId: z.string().uuid().nullable().optional(),
  // Vendedor attribution; defaults to `userId` when omitted.
  sellerId: z.string().uuid().nullable().optional(),
  // Required for the direct flow (validated at the service layer once cashSessionId is known);
  // omit for a PENDING sale, since payment is collected later at settlement.
  paymentMethod: z.string().min(1).optional(),
  paidAmount: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
})
export type CreateSaleBody = z.infer<typeof createSaleSchema>

export const settleSaleSchema = z.object({
  cashSessionId: z.string().uuid(),
  paymentMethod: z.string().min(1),
  paidAmount: z.number().nonnegative(),
})
export type SettleSaleBody = z.infer<typeof settleSaleSchema>

// --- Cash registers / cash sessions (caja) ---
export const createCashRegisterSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1),
})
export type CreateCashRegisterBody = z.infer<typeof createCashRegisterSchema>

export const openCashSessionSchema = z.object({
  cashRegisterId: z.string().uuid(),
  openingFloat: z.number().nonnegative(),
  notes: z.string().nullable().optional(),
})
export type OpenCashSessionBody = z.infer<typeof openCashSessionSchema>

export const closeCashSessionSchema = z.object({
  countedCash: z.number().nonnegative(),
  notes: z.string().nullable().optional(),
})
export type CloseCashSessionBody = z.infer<typeof closeCashSessionSchema>

// --- Store config ---
export const updateStoreConfigSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxId: z.string().nullable().optional(),
  currency: z.string().optional(),
  taxRate: z.number().nonnegative().optional(),
  lowStockAlert: z.number().int().nonnegative().optional(),
  invoicePrefix: z.string().optional(),
  allowSalesWithoutStock: z.boolean().optional(),
})
export type UpdateStoreConfigBody = z.infer<typeof updateStoreConfigSchema>

// --- Ticket config ---
export const updateTicketConfigSchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  ticketType: z.enum(['TICKET', 'INVOICE', 'RECEIPT']).optional(),
  header: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  footer: z.string().nullable().optional(),
  defaultPrinterName: z.string().nullable().optional(),
  thermalWidth: z.number().int().positive().optional(),
  fontSize: z.number().int().positive().optional(),
  copies: z.number().int().positive().optional(),
  autoPrint: z.boolean().optional(),
})
export type UpdateTicketConfigBody = z.infer<typeof updateTicketConfigSchema>

// --- Loyalty config ---
export const updateLoyaltyConfigSchema = z.object({
  pointsPerDollar: z.number().nonnegative().optional(),
  redemptionRate: z.number().nonnegative().optional(),
  pointsExpireMonths: z.number().int().nonnegative().optional(),
  minPurchaseForPoints: z.number().nonnegative().optional(),
  maxPointsPerPurchase: z.number().int().nonnegative().optional(),
})
export type UpdateLoyaltyConfigBody = z.infer<typeof updateLoyaltyConfigSchema>

export const awardLoyaltyPointsSchema = z.object({
  customerId: z.string().uuid(),
  purchaseAmount: z.number().nonnegative(),
  saleId: z.string().uuid(),
})
export type AwardLoyaltyPointsBody = z.infer<typeof awardLoyaltyPointsSchema>

// --- Notifications ---
export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  priority: z.string().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  actionUrl: z.string().optional(),
  expiresAt: z.string().optional(),
})
export type CreateNotificationBody = z.infer<typeof createNotificationSchema>

export const notificationUserSchema = z.object({
  userId: z.string().uuid(),
})
export type NotificationUserBody = z.infer<typeof notificationUserSchema>

const notificationChannelPrefsSchema = z
  .object({
    inApp: z.boolean().optional(),
    push: z.boolean().optional(),
    email: z.boolean().optional(),
  })
  .strict()

export const updateNotificationPreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    /** Per notification-type channel toggles, merged server-side */
    preferences: z.record(z.string(), notificationChannelPrefsSchema).optional(),
  })
  .refine(
    (data) =>
      data.inAppEnabled !== undefined ||
      data.pushEnabled !== undefined ||
      data.emailEnabled !== undefined ||
      (data.preferences !== undefined && Object.keys(data.preferences).length > 0),
    { message: 'Se requiere al menos un campo para actualizar' }
  )
export type UpdateNotificationPreferencesBody = z.infer<typeof updateNotificationPreferencesSchema>

// --- User preferences ---
export const updateUserPreferencesSchema = z.object({
  language: z.string().optional(),
})
export type UpdateUserPreferencesBody = z.infer<typeof updateUserPreferencesSchema>

// --- Push subscriptions ---
export const createPushSubscriptionSchema = z.object({
  userId: z.string().uuid().optional(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})
export type CreatePushSubscriptionBody = z.infer<typeof createPushSubscriptionSchema>

// --- Inventory transfers ---
export const createInventoryTransferSchema = z.object({
  fromStoreId: z.string().uuid(),
  toStoreId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  createdById: z.string().uuid(),
})
export type CreateInventoryTransferBody = z.infer<typeof createInventoryTransferSchema>

// --- Action history ---
export const createActionHistorySchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'OTHER']),
  entityType: z.enum(['USER', 'PRODUCT', 'SALE', 'CUSTOMER', 'STORE', 'COMPANY', 'OTHER']),
  entityId: z.string().nullable().optional(),
  details: z.unknown().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
})
export type CreateActionHistoryBody = z.infer<typeof createActionHistorySchema>

// --- Common query schemas ---
export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const productListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  active: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  lowStock: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
})

export const salesListQuerySchema = paginationQuerySchema.extend({
  storeId: z.string().optional(),
  customerId: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const notificationsListQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
})

export const storeIdQuerySchema = z.object({
  storeId: z.string().optional(),
})

export const dateRangeQuerySchema = storeIdQuerySchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const inventoryTransferQuerySchema = paginationQuerySchema.extend({
  fromStoreId: z.string().optional(),
  toStoreId: z.string().optional(),
  productId: z.string().optional(),
  status: z.string().optional(),
})

/** Product list response shape (for consistency) */
export type ProductResponse = {
  id: string
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  price: number
  cost: number | null
  categoryId: string | null
  supplierId: string | null
  unitId: string | null
  unit?: {
    id: string
    key: string
    name: string
    symbol: string | null
  } | null
  active: boolean
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}
