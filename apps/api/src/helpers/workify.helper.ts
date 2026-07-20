import type {
  WorkifyEmployee,
  WorkifyRole,
  WorkifyPosition,
  WorkifyHoliday,
  WorkifyWorkShift,
  WorkifyTimeEntry,
  WorkifyAttendanceEntry,
  WorkifySpecialAssignment,
  WorkifyMeUser,
  WorkifyMeCompany,
  WorkifyMeRole,
} from '../dto/workify.dto.js'

/** Employee row from employees.service (listEmployees / getEmployeeById) */
export type EmployeeEntity = {
  id: string
  companyId: string
  departmentId: string | null
  positionId: string | null
  userId: string | null
  idNumber: string | null
  firstName: string
  lastName: string
  dateJoined: Date
  status: string
  [key: string]: unknown
}

export function toWorkifyEmployee(r: EmployeeEntity): WorkifyEmployee {
  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    idNumber: r.idNumber ?? '',
    status: r.status,
    dateJoined: r.dateJoined instanceof Date ? r.dateJoined.toISOString().slice(0, 10) : String(r.dateJoined),
    departmentId: r.departmentId,
    positionId: r.positionId,
  }
}

export function toWorkifyRole(row: Record<string, unknown>): WorkifyRole {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    parentId: (row.parentId as string | null) ?? undefined,
    companyId: (row.companyId as string) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyPosition(row: Record<string, unknown>): WorkifyPosition {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    departmentId: (row.departmentId as string | null) ?? undefined,
    salaryType: (row.salaryType as string | null) ?? undefined,
    baseSalary: (row.baseSalary as number | string | null) ?? undefined,
    overtimeType: (row.overtimeType as string | null) ?? undefined,
    overtimeMultiplier: (row.overtimeMultiplier as number | string | null) ?? undefined,
    overtimeFixedAmount: (row.overtimeFixedAmount as number | string | null) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyHoliday(row: Record<string, unknown>): WorkifyHoliday {
  const date = row.date
  return {
    id: row.id as string,
    name: row.name as string,
    date: date instanceof Date ? date.toISOString().slice(0, 10) : String(date),
    isRecurring: (row.isRecurring as boolean) ?? undefined,
    companyId: (row.companyId as string) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyWorkShift(row: Record<string, unknown>): WorkifyWorkShift {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    startTime: (row.startTime as string | null) ?? undefined,
    endTime: (row.endTime as string | null) ?? undefined,
    breakStart: (row.breakStart as string | null) ?? undefined,
    breakEnd: (row.breakEnd as string | null) ?? undefined,
    tolerance: (row.tolerance as number | string | null) ?? undefined,
    isActive: (row.isActive as boolean) ?? undefined,
    isNightShift: (row.isNightShift as boolean) ?? undefined,
    companyId: (row.companyId as string) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyTimeEntry(row: Record<string, unknown>): WorkifyTimeEntry {
  const date = row.date
  return {
    id: row.id as string,
    employeeId: (row.employeeId as string) ?? undefined,
    companyId: (row.companyId as string) ?? undefined,
    date: date instanceof Date ? date.toISOString().slice(0, 10) : String(date),
    clockIn: (row.clockIn as string | null) ?? undefined,
    clockOut: (row.clockOut as string | null) ?? undefined,
    breakStart: (row.breakStart as string | null) ?? undefined,
    breakEnd: (row.breakEnd as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyAttendanceEntry(row: Record<string, unknown>): WorkifyAttendanceEntry {
  const date = row.date
  return {
    id: row.id as string,
    date: date instanceof Date ? date.toISOString().slice(0, 10) : String(date),
    clockIn: (row.clockIn as string | null) ?? undefined,
    clockOut: (row.clockOut as string | null) ?? undefined,
    breakStart: (row.breakStart as string | null) ?? undefined,
    breakEnd: (row.breakEnd as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
  }
}

export function toWorkifySpecialAssignment(row: Record<string, unknown>): WorkifySpecialAssignment {
  const date = row.date
  return {
    id: row.id as string,
    employeeId: row.employeeId as string,
    workShiftId: row.workShiftId as string,
    date: date instanceof Date ? date.toISOString().slice(0, 10) : String(date),
    notes: (row.notes as string | null) ?? undefined,
    createdAt: row.createdAt != null ? (row.createdAt as string | Date) : undefined,
    updatedAt: row.updatedAt != null ? (row.updatedAt as string | Date) : undefined,
  }
}

export function toWorkifyMeCompany(row: {
  id: string
  name: string
  workifyEnabled: boolean
  posEnabled: boolean
  technicalServicesEnabled: boolean
}): WorkifyMeCompany {
  return {
    id: row.id,
    name: row.name,
    workifyEnabled: row.workifyEnabled,
    posEnabled: row.posEnabled,
    technicalServicesEnabled: row.technicalServicesEnabled,
  }
}

export function toWorkifyMeUser(payload: {
  id: string
  email: string
  name: string
  companyId?: string | null
  membershipRole?: string | null
  isSuperuser?: boolean
  company?: WorkifyMeCompany | null
  roles: WorkifyMeRole[]
}): WorkifyMeUser {
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    companyId: payload.companyId ?? undefined,
    membershipRole: payload.membershipRole ?? undefined,
    isSuperuser: payload.isSuperuser ?? false,
    company: payload.company ?? undefined,
    roles: payload.roles,
  }
}
