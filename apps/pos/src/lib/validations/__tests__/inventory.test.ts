import { describe, it, expect } from 'vitest'
import { adjustInventorySchema } from '../inventory'

describe('Inventory Validations', () => {
  describe('adjustInventorySchema', () => {
    it('should validate a valid inventory adjustment', () => {
      const validAdjustment = {
        quantity: 10,
        type: 'ADD' as const,
        reason: 'Restock',
      }

      const result = adjustInventorySchema.safeParse(validAdjustment)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(10)
        expect(result.data.type).toBe('ADD')
      }
    })

    it('should accept ADJUST type', () => {
      const adjustment = {
        quantity: 50,
        type: 'ADJUST' as const,
      }

      const result = adjustInventorySchema.safeParse(adjustment)
      expect(result.success).toBe(true)
    })

    it('should accept REMOVE type', () => {
      const adjustment = {
        quantity: 5,
        type: 'REMOVE' as const,
      }

      const result = adjustInventorySchema.safeParse(adjustment)
      expect(result.success).toBe(true)
    })

    it('should reject non-integer quantity', () => {
      const invalidAdjustment = {
        quantity: 10.5,
        type: 'ADD' as const,
      }

      const result = adjustInventorySchema.safeParse(invalidAdjustment)
      expect(result.success).toBe(false)
    })

    it('should reject invalid type', () => {
      const invalidAdjustment = {
        quantity: 10,
        type: 'INVALID',
      }

      const result = adjustInventorySchema.safeParse(invalidAdjustment)
      expect(result.success).toBe(false)
    })

    it('should accept optional reason as null', () => {
      const adjustment = {
        quantity: 10,
        type: 'ADD' as const,
        reason: null,
      }

      const result = adjustInventorySchema.safeParse(adjustment)
      expect(result.success).toBe(true)
    })
  })
})

