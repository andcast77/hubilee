import { z } from 'zod'

export const createBaroExpedienteSchema = z.object({
  objetoExpedienteId: z.string().trim().min(1),
  nomenclaturaCatastral: z.string().trim().min(1),
  propietario: z.string().trim().min(1),
  principalProfessionalId: z.string().uuid(),
  secondProfessionalId: z.string().uuid().optional(),
})

export type CreateBaroExpedienteBody = z.infer<typeof createBaroExpedienteSchema>

export type BaroProfessionalResponse = {
  id: string
  companyId: string
  userId: string | null
  displayName: string
  professionalTitle: string
  dni: string
  active: boolean
}

export type BaroExpedienteResponse = {
  id: string
  companyId: string
  status: string
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  propietario: string
  principalProfessionalId: string
  secondProfessionalId: string | null
  createdAt: string
  updatedAt: string
}
