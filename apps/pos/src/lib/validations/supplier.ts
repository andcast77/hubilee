import { z } from 'zod'

// Schema for creating a supplier
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255, 'Supplier name is too long'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

// Schema for updating a supplier (all fields optional)
export const updateSupplierSchema = createSupplierSchema.partial()

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>

// Schema for supplier query/filters
export const supplierQuerySchema = z.object({
  search: z.string().optional(),
  active: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.enum(['name', 'contact', 'location', 'active']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>

