import { z } from 'zod'

// Schema for creating a product
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Product name is too long'),
  description: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU is too long'),
  barcode: z.string().optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  cost: z.number().nonnegative('Cost cannot be negative').optional().default(0),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional().default(0),
  minStock: z.number().int('Min stock must be an integer').nonnegative('Min stock cannot be negative').optional().default(0),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

// Schema for updating a product (all fields optional except id)
export const updateProductSchema = createProductSchema.partial()

export type UpdateProductInput = z.infer<typeof updateProductSchema>

// Schema for product query/filters
export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  active: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  lowStock: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'price', 'stock', 'active', 'category']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export type ProductQueryInput = z.infer<typeof productQuerySchema>

