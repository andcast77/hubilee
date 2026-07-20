import { z } from 'zod'
import { TicketType } from '@/types'

export const updateTicketConfigSchema = z.object({
  storeId: z.string().optional().nullable(),
  ticketType: z.nativeEnum(TicketType).optional(),
  header: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url('Invalid URL').optional().nullable(),
  footer: z.string().optional().nullable(),
  defaultPrinterName: z.string().optional().nullable(),
  thermalWidth: z.number().int().min(40).max(80, 'Thermal width must be between 40 and 80mm').optional().nullable(),
  fontSize: z.number().int().min(8).max(24).optional(),
  copies: z.number().int().min(1).max(10).optional(),
  autoPrint: z.boolean().optional(),
}).refine((data) => {
  // thermalWidth solo es requerido si ticketType es TICKET
  if (data.ticketType === 'TICKET' && !data.thermalWidth) {
    return false
  }
  return true
}, {
  message: 'thermalWidth is required when ticketType is TICKET',
  path: ['thermalWidth'],
})

export type UpdateTicketConfigInput = z.infer<typeof updateTicketConfigSchema>
