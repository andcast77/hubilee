import { z } from 'zod'

// Schema for inventory adjustment
export const adjustInventorySchema = z.object({
  quantity: z.number().int('Quantity must be an integer'),
  reason: z.string().optional().nullable(),
  type: z.enum(['ADJUST', 'ADD', 'REMOVE']),
})

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>

