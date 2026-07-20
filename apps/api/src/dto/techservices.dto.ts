import { z } from 'zod'
import { workOrderCreateBodySchema } from '../core/schemas/workOrder.js'

// ----- Work orders -----

/** List work orders query */
export const workOrderListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
})
export type WorkOrderListQuery = z.infer<typeof workOrderListQuerySchema>

/** Create work order body (reuse core schema) */
export { workOrderCreateBodySchema }
export type WorkOrderCreateBody = z.infer<typeof workOrderCreateBodySchema>

/** Update work order body */
export const workOrderUpdateBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assetId: z.string().uuid().nullable().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  requestedAt: z.string().optional(),
  dueAt: z.string().optional(),
  completedAt: z.string().optional(),
})
export type WorkOrderUpdateBody = z.infer<typeof workOrderUpdateBodySchema>

/** Work order response (single/list item) */
export type WorkOrderResponse = {
  id: string
  companyId: string
  assetId: string | null
  createdByUserId: string
  assignedEmployeeId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  requestedAt: string | Date
  dueAt: string | Date | null
  completedAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

// ----- Assets -----

/** List assets query */
export const assetListQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})
export type AssetListQuery = z.infer<typeof assetListQuerySchema>

/** Create asset body */
export const assetCreateBodySchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})
export type AssetCreateBody = z.infer<typeof assetCreateBodySchema>

/** Update asset body */
export const assetUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})
export type AssetUpdateBody = z.infer<typeof assetUpdateBodySchema>

/** Asset response */
export type AssetResponse = {
  id: string
  companyId: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  notes: string | null
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

// ----- Parts -----

/** List parts: workOrderId comes from route params */
/** Create part body (workOrderId from route) */
export const partCreateBodySchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(0).optional(),
  unitCost: z.number(),
  notes: z.string().nullable().optional(),
})
export type PartCreateBody = z.infer<typeof partCreateBodySchema>

/** Update part body */
export const partUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().int().min(0).optional(),
  unitCost: z.number().optional(),
  notes: z.string().nullable().optional(),
})
export type PartUpdateBody = z.infer<typeof partUpdateBodySchema>

/** Part response */
export type PartResponse = {
  id: string
  workOrderId: string
  name: string
  quantity: number
  unitCost: number
  notes: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

// ----- Visits -----

/** Create visit body */
export const visitCreateBodySchema = z.object({
  scheduledStartAt: z.string().min(1),
  scheduledEndAt: z.string().nullable().optional(),
  status: z.string().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})
export type VisitCreateBody = z.infer<typeof visitCreateBodySchema>

/** Update visit body */
export const visitUpdateBodySchema = z.object({
  scheduledStartAt: z.string().optional(),
  scheduledEndAt: z.string().nullable().optional(),
  status: z.string().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})
export type VisitUpdateBody = z.infer<typeof visitUpdateBodySchema>

/** Assigned employee in visit */
export type VisitAssignedEmployee = {
  id: string
  firstName: string | null
  lastName: string | null
}

/** Visit response */
export type VisitResponse = {
  id: string
  workOrderId: string
  assignedEmployeeId: string | null
  scheduledStartAt: string | Date
  scheduledEndAt: string | Date | null
  status: string
  notes: string | null
  createdAt: string | Date
  updatedAt: string | Date
  assignedEmployee: VisitAssignedEmployee | null
}

// ----- Me -----

/** TechServices /me company */
export type TechServicesMeCompany = {
  id: string
  name: string
  workifyEnabled: boolean
  posEnabled: boolean
  technicalServicesEnabled: boolean
}

/** TechServices /me response */
export type TechServicesMeResponse = {
  user: {
    id: string
    email: string
    name: string
    companyId: string
    membershipRole: string | null
    isSuperuser: boolean
    company: TechServicesMeCompany | undefined
  }
}
