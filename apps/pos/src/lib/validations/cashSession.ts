import { z } from 'zod'

// Schema for creating a CashRegister (a store's till/caja).
export const createCashRegisterSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
  name: z.string().min(1, 'Register name is required'),
})

export type CreateCashRegisterInput = z.infer<typeof createCashRegisterSchema>

// Schema for opening a CashSession on a register.
export const openCashSessionSchema = z.object({
  cashRegisterId: z.string().min(1, 'Register ID is required'),
  openingFloat: z.number().nonnegative('Opening float cannot be negative'),
  notes: z.string().optional().nullable(),
})

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>

// Schema for closing a CashSession (the arqueo).
export const closeCashSessionSchema = z.object({
  countedCash: z.number().nonnegative('Counted cash cannot be negative'),
  notes: z.string().optional().nullable(),
})

export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>
