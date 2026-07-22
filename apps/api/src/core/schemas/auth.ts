import { z } from 'zod'

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().uuid().optional(),
})

export type LoginBody = z.infer<typeof loginBodySchema>

export const floorLoginBodySchema = z.object({
  companyCode: z.string().min(1),
  employeeCode: z.string().regex(/^\d{6}$/, 'El código de empleado debe tener 6 dígitos'),
  password: z.string().min(1),
  captchaToken: z.string().min(1).optional(),
})

export type FloorLoginBody = z.infer<typeof floorLoginBodySchema>
