import type {
  HrEmployee,
  HrRole,
  HrPosition,
  HrHoliday,
  HrWorkShift,
  HrTimeEntry,
  HrAttendanceEntry,
  HrSpecialAssignment,
  HrMeUser,
  HrMeCompany,
  HrMeRole,
} from '../dto/hr.dto.js'

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

export function toHrEmployee(r: EmployeeEntity): HrEmployee {
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

export function toHrRole(row: Record<string, unknown>): HrRole {
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

export function toHrPosition(row: Record<string, unknown>): HrPosition {
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

export function toHrHoliday(row: Record<string, unknown>): HrHoliday {
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

export function toHrWorkShift(row: Record<string, unknown>): HrWorkShift {
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

export function toHrTimeEntry(row: Record<string, unknown>): HrTimeEntry {
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

export function toHrAttendanceEntry(row: Record<string, unknown>): HrAttendanceEntry {
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

export function toHrSpecialAssignment(row: Record<string, unknown>): HrSpecialAssignment {
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

export function toHrMeCompany(row: {
  id: string
  name: string
  hrEnabled: boolean
  posEnabled: boolean
  technicalServicesEnabled: boolean
}): HrMeCompany {
  return {
    id: row.id,
    name: row.name,
    hrEnabled: row.hrEnabled,
    posEnabled: row.posEnabled,
    technicalServicesEnabled: row.technicalServicesEnabled,
  }
}

export function toHrMeUser(payload: {
  id: string
  email: string
  name: string
  companyId?: string | null
  membershipRole?: string | null
  isSuperuser?: boolean
  company?: HrMeCompany | null
  roles: HrMeRole[]
}): HrMeUser {
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
