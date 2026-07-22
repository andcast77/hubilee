import type {
  WorkOrderResponse,
  AssetResponse,
  PartResponse,
  VisitResponse,
  VisitAssignedEmployee,
  TechMeResponse,
  TechMeCompany,
} from '../dto/tech.dto.js'

/** Work order entity (DB row) */
export type WorkOrderEntity = {
  id: string
  companyId: string
  assetId: string | null
  createdByUserId: string
  assignedEmployeeId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  requestedAt: Date
  dueAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toWorkOrderResponse(row: WorkOrderEntity): WorkOrderResponse {
  return {
    id: row.id,
    companyId: row.companyId,
    assetId: row.assetId,
    createdByUserId: row.createdByUserId,
    assignedEmployeeId: row.assignedEmployeeId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    requestedAt: row.requestedAt,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Asset entity (DB row) */
export type AssetEntity = {
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
  createdAt: Date
  updatedAt: Date
}

export function toAssetResponse(row: AssetEntity): AssetResponse {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serialNumber,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Part entity (DB row) */
export type PartEntity = {
  id: string
  workOrderId: string
  name: string
  quantity: number
  unitCost: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export function toPartResponse(row: PartEntity): PartResponse {
  return {
    id: row.id,
    workOrderId: row.workOrderId,
    name: row.name,
    quantity: row.quantity,
    unitCost: row.unitCost,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Visit entity (DB row with optional employee join) */
export type VisitEntity = {
  id: string
  workOrderId: string
  assignedEmployeeId: string | null
  scheduledStartAt: Date
  scheduledEndAt: Date | null
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  employee_first_name?: string | null
  employee_last_name?: string | null
}

export function toVisitResponse(row: VisitEntity): VisitResponse {
  const assignedEmployee: VisitAssignedEmployee | null =
    row.assignedEmployeeId && (row.employee_first_name != null || row.employee_last_name != null)
      ? {
          id: row.assignedEmployeeId,
          firstName: row.employee_first_name ?? null,
          lastName: row.employee_last_name ?? null,
        }
      : row.assignedEmployeeId
        ? { id: row.assignedEmployeeId, firstName: null, lastName: null }
        : null
  return {
    id: row.id,
    workOrderId: row.workOrderId,
    assignedEmployeeId: row.assignedEmployeeId,
    scheduledStartAt: row.scheduledStartAt,
    scheduledEndAt: row.scheduledEndAt,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assignedEmployee,
  }
}

/** Me: build response from user + company */
export type MeUserEntity = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  isActive: boolean
}

export type MeCompanyEntity = {
  id: string
  name: string
  hrEnabled: boolean
  posEnabled: boolean
  technicalServicesEnabled: boolean
}

export function toMeResponse(
  user: MeUserEntity,
  company: TechMeCompany | undefined,
  ctx: { companyId: string; membershipRole: string | null; isSuperuser: boolean }
): TechMeResponse {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || ''
  return {
    user: {
      id: user.id,
      email: user.email,
      name,
      companyId: ctx.companyId,
      membershipRole: ctx.membershipRole,
      isSuperuser: ctx.isSuperuser ?? false,
      company,
    },
  }
}
