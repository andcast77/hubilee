import { describe, it, expect } from 'vitest'
import { createSupplierSchema, updateSupplierSchema, supplierQuerySchema } from '../supplier'

describe('Supplier Validations', () => {
  describe('createSupplierSchema', () => {
    it('should validate a valid supplier', () => {
      const validSupplier = {
        name: 'Test Supplier',
        email: 'supplier@test.com',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        taxId: 'TAX123',
        notes: 'Test notes',
        active: true,
      }

      const result = createSupplierSchema.safeParse(validSupplier)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Supplier')
        expect(result.data.email).toBe('supplier@test.com')
      }
    })

    it('should reject supplier without name', () => {
      const invalidSupplier = {
        email: 'supplier@test.com',
      }

      const result = createSupplierSchema.safeParse(invalidSupplier)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const invalidSupplier = {
        name: 'Test Supplier',
        email: 'invalid-email',
      }

      const result = createSupplierSchema.safeParse(invalidSupplier)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields as null', () => {
      const supplier = {
        name: 'Test Supplier',
        email: null,
        phone: null,
        address: null,
        active: true,
      }

      const result = createSupplierSchema.safeParse(supplier)
      expect(result.success).toBe(true)
    })

    it('should require explicit active boolean', () => {
      const supplier = {
        name: 'Test Supplier',
      }

      const result = createSupplierSchema.safeParse(supplier)
      expect(result.success).toBe(false)
    })
  })

  describe('updateSupplierSchema', () => {
    it('should validate partial supplier data', () => {
      const partialSupplier = {
        name: 'Updated Name',
        email: 'new@email.com',
      }

      const result = updateSupplierSchema.safeParse(partialSupplier)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateSupplierSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('supplierQuerySchema', () => {
    it('should validate query parameters', () => {
      const query = {
        search: 'test',
        active: true,
      }

      const result = supplierQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })

    it('should accept empty query', () => {
      const query = {}

      const result = supplierQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })
  })
})

