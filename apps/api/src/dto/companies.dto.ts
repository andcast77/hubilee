import { z } from 'zod'
import type { CompanyModulesShape } from '../core/modules.js'

/** Response: company detail with owner and modules */
export type CompanyResponse = {
  id: string
  name: string
  parentId: string | null
  ownerUserId: string | null
  owner: {
    id: string
    email: string
    firstName: string
    lastName: string
    name: string
  } | null
  modules: CompanyModulesShape
  isActive: boolean
  logo: string | null
  taxId: string | null
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

/** Response: company stats */
export type CompanyStatsResponse = {
  totalMembers: number
  ownerCount: number
  adminCount: number
  userCount: number
  lastMember: {
    userId: string
    email: string
    firstName: string
    lastName: string
    name: string
    membershipRole: string
    createdAt: Date
  } | null
}

/** Input: update company */
export const updateCompanyBodySchema = z.object({
  name: z.string().optional(),
  workifyEnabled: z.boolean().optional(),
  posEnabled: z.boolean().optional(),
  technicalServicesEnabled: z.boolean().optional(),
  logo: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
})

export type UpdateCompanyBody = z.infer<typeof updateCompanyBodySchema>
