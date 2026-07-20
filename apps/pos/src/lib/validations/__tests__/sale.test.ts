import { describe, it, expect } from 'vitest'
import { createSaleSchema, saleItemSchema, saleQuerySchema } from '../sale'
import { PaymentMethod, SaleStatus } from '@/types'

describe('Sale Validations', () => {
  describe('saleItemSchema', () => {
    it('should validate a valid sale item', () => {
      const validItem = {
        productId: 'product-123',
        quantity: 2,
        price: 10.99,
        discount: 1.0,
      }

      const result = saleItemSchema.safeParse(validItem)
      expect(result.success).toBe(true)
    })

    it('should reject missing productId', () => {
      const invalidItem = {
        quantity: 2,
        price: 10.99,
      }

      const result = saleItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it('should reject negative quantity', () => {
      const invalidItem = {
        productId: 'product-123',
        quantity: -1,
        price: 10.99,
      }

      const result = saleItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it('should reject zero quantity', () => {
      const invalidItem = {
        productId: 'product-123',
        quantity: 0,
        price: 10.99,
      }

      const result = saleItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it('should reject negative price', () => {
      const invalidItem = {
        productId: 'product-123',
        quantity: 2,
        price: -10.99,
      }

      const result = saleItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it('should reject negative discount', () => {
      const invalidItem = {
        productId: 'product-123',
        quantity: 2,
        price: 10.99,
        discount: -1.0,
      }

      const result = saleItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it('should default discount to 0 if not provided', () => {
      const item = {
        productId: 'product-123',
        quantity: 2,
        price: 10.99,
      }

      const result = saleItemSchema.parse(item)
      expect(result.discount).toBe(0)
    })
  })

  describe('createSaleSchema', () => {
    it('should validate a valid sale', () => {
      const validSale = {
        customerId: 'customer-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            price: 10.99,
            discount: 0,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 25.0,
        discount: 2.0,
        taxRate: 0.1, // 10% as decimal
        notes: 'Test sale',
      }

      const result = createSaleSchema.safeParse(validSale)
      expect(result.success).toBe(true)
    })

    it('should validate a sale without customer', () => {
      const validSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CARD,
        paidAmount: 10.99,
      }

      const result = createSaleSchema.safeParse(validSale)
      expect(result.success).toBe(true)
    })

    it('should reject empty items array', () => {
      const invalidSale = {
        items: [],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10.0,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should reject invalid payment method', () => {
      const invalidSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: 'INVALID',
        paidAmount: 10.99,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should reject negative paid amount', () => {
      const invalidSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: -10.0,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should reject negative discount', () => {
      const invalidSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10.99,
        discount: -1.0,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should reject tax rate above 100', () => {
      const invalidSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10.99,
        taxRate: 101,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should reject negative tax rate', () => {
      const invalidSale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10.99,
        taxRate: -1,
      }

      const result = createSaleSchema.safeParse(invalidSale)
      expect(result.success).toBe(false)
    })

    it('should default discount to 0 if not provided', () => {
      const sale = {
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 10.99,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 10.99,
      }

      const result = createSaleSchema.parse(sale)
      expect(result.discount).toBe(0)
    })
  })

  describe('saleQuerySchema', () => {
    it('should validate a valid query', () => {
      const validQuery = {
        customerId: 'customer-123',
        userId: 'user-123',
        status: SaleStatus.COMPLETED,
        paymentMethod: PaymentMethod.CASH,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        page: 1,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(validQuery)
      expect(result.success).toBe(true)
    })

    it('should validate query with defaults', () => {
      const query = {}

      const result = saleQuerySchema.parse(query)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should reject invalid status', () => {
      const invalidQuery = {
        status: 'INVALID',
        page: 1,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid payment method', () => {
      const invalidQuery = {
        paymentMethod: 'INVALID',
        page: 1,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const invalidQuery = {
        page: -1,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject zero page', () => {
      const invalidQuery = {
        page: 0,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject limit above 100', () => {
      const invalidQuery = {
        page: 1,
        limit: 101,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const invalidQuery = {
        startDate: 'invalid-date',
        page: 1,
        limit: 20,
      }

      const result = saleQuerySchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })
  })
})

