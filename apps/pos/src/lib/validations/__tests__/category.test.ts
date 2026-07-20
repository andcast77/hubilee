import { describe, it, expect } from 'vitest'
import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from '../category'

describe('Category Validations', () => {
  describe('createCategorySchema', () => {
    it('should validate a valid category', () => {
      const validCategory = {
        name: 'Electronics',
        description: 'Electronic products',
        parentId: 'parent-123',
      }

      const result = createCategorySchema.safeParse(validCategory)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Electronics')
      }
    })

    it('should reject category without name', () => {
      const invalidCategory = {
        description: 'Some description',
      }

      const result = createCategorySchema.safeParse(invalidCategory)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields as null', () => {
      const category = {
        name: 'Test Category',
        description: null,
        parentId: null,
      }

      const result = createCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
    })
  })

  describe('updateCategorySchema', () => {
    it('should validate partial category data', () => {
      const partialCategory = {
        name: 'Updated Name',
      }

      const result = updateCategorySchema.safeParse(partialCategory)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateCategorySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('categoryQuerySchema', () => {
    it('should validate query parameters', () => {
      const query = {
        search: 'test',
        parentId: 'parent-123',
        includeChildren: true,
      }

      const result = categoryQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })

    it('should apply default value for includeChildren', () => {
      const query = {}

      const result = categoryQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.includeChildren).toBe(false)
      }
    })
  })
})

