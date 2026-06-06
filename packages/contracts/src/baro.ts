export type BaroExpedienteStatus = 'DRAFT'

export type BaroProfessionalDto = {
  id: string
  companyId: string
  userId: string | null
  displayName: string
  professionalTitle: string
  dni: string
  active: boolean
}

export type BaroExpedienteDto = {
  id: string
  companyId: string
  status: BaroExpedienteStatus
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  propietario: string
  principalProfessionalId: string
  secondProfessionalId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateBaroExpedienteInput = {
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  propietario: string
  principalProfessionalId: string
  secondProfessionalId?: string
}
