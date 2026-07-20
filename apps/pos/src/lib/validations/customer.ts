import { z } from 'zod'

// Schema for creating a customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name is too long'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

// Schema for updating a customer (all fields optional)
export const updateCustomerSchema = createCustomerSchema.partial()

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

// Schema for customer query/filters
export const customerQuerySchema = z.object({
  search: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  sortBy: z.enum(['name', 'email', 'phone', 'city', 'sales']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type CustomerQueryInput = z.infer<typeof customerQuerySchema>

