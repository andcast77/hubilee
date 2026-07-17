import { z } from 'zod'
import { PaymentMethod, SaleStatus } from '@/types'

// Schema for a sale item
export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0'),
  price: z.number().positive('Price must be greater than 0'),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
})

export type SaleItemInput = z.infer<typeof saleItemSchema>

// Schema for creating a sale
export const createSaleSchema = z.object({
  storeId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  /**
   * Required for the direct/kiosco flow (settles inline); omitted for the
   * order->checkout/vendedor flow (PENDING sale, no payment taken yet — see
   * PR6). Mirrors the backend `createSaleSchema`'s PR4 relaxation.
   */
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAmount: z.number().nonnegative('Paid amount cannot be negative').optional(),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
  taxRate: z.number().min(0).max(1).optional(), // Optional, stored as decimal (e.g., 0.1 = 10%), will use store config if not provided
  notes: z.string().optional().nullable(),
  /**
   * Direct/kiosco flow: an OPEN CashSession id settles the sale inline
   * (status COMPLETED). Omitted -> the sale is created PENDING (moto/vendedor
   * flow, settled later via `POST /sales/:id/settle`). See PR4/PR5 design D6.
   */
  cashSessionId: z.string().optional().nullable(),
  /** Vendedor attribution, distinct from the settling cashier when applicable. */
  sellerId: z.string().optional().nullable(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>

// Schema for sale query/filters
export const saleQuerySchema = z.object({
  storeId: z.string().optional(),
  customerId: z.string().optional(),
  userId: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type SaleQueryInput = z.infer<typeof saleQuerySchema>

