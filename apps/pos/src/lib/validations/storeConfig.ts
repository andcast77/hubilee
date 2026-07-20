import { z } from 'zod'

export const updateStoreConfigSchema = z.object({
  name: z.string().min(1, 'Store name is required').optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  taxId: z.string().optional().nullable(),
  currency: z.string().min(1, 'Currency is required').optional(),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1').optional(),
  lowStockAlert: z.number().int().nonnegative('Low stock alert must be non-negative').optional(),
  invoicePrefix: z.string().optional(),
  allowSalesWithoutStock: z.boolean().optional(),
  // invoiceNumber is managed automatically, not updatable via API
})

export type UpdateStoreConfigInput = z.infer<typeof updateStoreConfigSchema>

