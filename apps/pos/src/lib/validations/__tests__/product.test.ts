import { describe, it, expect } from 'vitest'
import { createProductSchema, updateProductSchema, productQuerySchema } from '../product'

describe('Product Validations', () => {
  describe('createProductSchema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
        barcode: '1234567890123',
        price: 99.99,
        cost: 50.0,
        stock: 100,
        minStock: 10,
        categoryId: 'cat-123',
        active: true,
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Product')
        expect(result.data.price).toBe(99.99)
      }
    })

    it('should reject product without name', () => {
      const invalidProduct = {
        sku: 'TEST-001',
        price: 99.99,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it('should reject product with negative price', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: -10,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('greater than 0')
      }
    })

    it('should reject product with negative stock', () => {
      const invalidProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock: -10,
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields as null', () => {
      const product = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        description: null,
        barcode: null,
        categoryId: null,
      }

      const result = createProductSchema.safeParse(product)
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      const product = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
      }

      const result = createProductSchema.safeParse(product)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cost).toBe(0)
        expect(result.data.stock).toBe(0)
        expect(result.data.minStock).toBe(0)
        expect(result.data.active).toBe(true)
      }
    })
  })

  describe('updateProductSchema', () => {
    it('should validate partial product data', () => {
      const partialProduct = {
        name: 'Updated Name',
        price: 149.99,
      }

      const result = updateProductSchema.safeParse(partialProduct)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateProductSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('productQuerySchema', () => {
    it('should validate query parameters', () => {
      const query = {
        search: 'test',
        categoryId: 'cat-123',
        active: true,
        minPrice: 10,
        maxPrice: 100,
        lowStock: true,
        page: 1,
        limit: 20,
      }

      const result = productQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })

    it('should apply default values for page and limit', () => {
      const query = {}

      const result = productQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should reject invalid page number', () => {
      const query = {
        page: 0,
      }

      const result = productQuerySchema.safeParse(query)
      expect(result.success).toBe(false)
    })
  })
})

