import { z } from 'zod'

// Schema for creating a category
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Category name is too long'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// Schema for updating a category (all fields optional)
export const updateCategorySchema = createCategorySchema.partial()

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// Schema for category query/filters
export const categoryQuerySchema = z.object({
  search: z.string().optional(),
  parentId: z.string().optional().nullable(),
  includeChildren: z.boolean().default(false),
})

export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>

