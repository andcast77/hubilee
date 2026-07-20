import { describe, it, expect } from 'vitest'
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema } from '../customer'

describe('Customer Validations', () => {
  describe('createCustomerSchema', () => {
    it('should validate a valid customer', () => {
      const validCustomer = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      }

      const result = createCustomerSchema.safeParse(validCustomer)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.email).toBe('john@example.com')
      }
    })

    it('should reject customer without name', () => {
      const invalidCustomer = {
        email: 'john@example.com',
      }

      const result = createCustomerSchema.safeParse(invalidCustomer)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const invalidCustomer = {
        name: 'John Doe',
        email: 'invalid-email',
      }

      const result = createCustomerSchema.safeParse(invalidCustomer)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields as null', () => {
      const customer = {
        name: 'John Doe',
        email: null,
        phone: null,
        address: null,
      }

      const result = createCustomerSchema.safeParse(customer)
      expect(result.success).toBe(true)
    })

    it('should accept customer with only name', () => {
      const customer = {
        name: 'John Doe',
      }

      const result = createCustomerSchema.safeParse(customer)
      expect(result.success).toBe(true)
    })
  })

  describe('updateCustomerSchema', () => {
    it('should validate partial customer data', () => {
      const partialCustomer = {
        name: 'Updated Name',
        email: 'new@email.com',
      }

      const result = updateCustomerSchema.safeParse(partialCustomer)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateCustomerSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('customerQuerySchema', () => {
    it('should validate query parameters', () => {
      const query = {
        search: 'test',
        email: 'test@example.com',
        phone: '1234567890',
      }

      const result = customerQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })

    it('should accept empty query', () => {
      const query = {}

      const result = customerQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
    })
  })
})

