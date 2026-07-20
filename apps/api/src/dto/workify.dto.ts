import { z } from 'zod'

const uuid = z.string().uuid()
const dateLike = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? v : v.toISOString().slice(0, 10)))
const timeLike = z.string().optional().nullable()

// ----- Employees -----
export const workifyEmployeeSchema = z.object({
  id: uuid,
  firstName: z.string(),
  lastName: z.string(),
  idNumber: z.string(),
  status: z.string(),
  dateJoined: z.union([z.string(), z.date()]),
  departmentId: uuid.nullable(),
  positionId: uuid.nullable(),
})
export type WorkifyEmployee = z.infer<typeof workifyEmployeeSchema>

export const workifyEmployeesListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  departmentId: uuid.optional(),
})
export type WorkifyEmployeesListQuery = z.infer<typeof workifyEmployeesListQuerySchema>

export const workifyEmployeesListResponseSchema = z.object({
  success: z.literal(true),
  employees: z.array(workifyEmployeeSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})
export type WorkifyEmployeesListResponse = z.infer<typeof workifyEmployeesListResponseSchema>

export const createEmployeeBodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  idNumber: z.string().min(1).optional().nullable(),
  birthDate: z.string().datetime({ offset: true }).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  departmentId: uuid.optional().nullable(),
  positionId: uuid.optional().nullable(),
  userId: uuid.optional().nullable(),
  dateJoined: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  customSalaryAmount: z.number().positive().optional().nullable(),
  customSalaryType: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY']).optional().nullable(),
  customOvertimeEligible: z.boolean().optional(),
})
export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>

export const updateEmployeeBodySchema = createEmployeeBodySchema.partial()
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeBodySchema>

// ----- Roles -----
export const workifyRoleSchema = z.object({
  id: uuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  parentId: uuid.nullable().optional(),
  companyId: uuid.optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifyRole = z.infer<typeof workifyRoleSchema>

// ----- Positions -----
export const workifyPositionSchema = z.object({
  id: uuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  departmentId: uuid.nullable().optional(),
  salaryType: z.string().nullable().optional(),
  baseSalary: z.union([z.number(), z.string()]).nullable().optional(),
  overtimeType: z.string().nullable().optional(),
  overtimeMultiplier: z.union([z.number(), z.string()]).nullable().optional(),
  overtimeFixedAmount: z.union([z.number(), z.string()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifyPosition = z.infer<typeof workifyPositionSchema>

// ----- Holidays -----
export const workifyHolidaySchema = z.object({
  id: uuid,
  name: z.string(),
  date: dateLike,
  isRecurring: z.boolean().optional(),
  companyId: uuid.optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifyHoliday = z.infer<typeof workifyHolidaySchema>

// ----- Work shifts -----
export const workifyWorkShiftSchema = z.object({
  id: uuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  startTime: timeLike,
  endTime: timeLike,
  breakStart: timeLike,
  breakEnd: timeLike,
  tolerance: z.union([z.number(), z.string()]).nullable().optional(),
  isActive: z.boolean().optional(),
  isNightShift: z.boolean().optional(),
  companyId: uuid.optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifyWorkShift = z.infer<typeof workifyWorkShiftSchema>

// ----- Attendance (single employee time entries) -----
export const workifyAttendanceEntrySchema = z.object({
  id: uuid,
  date: dateLike,
  clockIn: timeLike,
  clockOut: timeLike,
  breakStart: timeLike,
  breakEnd: timeLike,
  notes: z.string().nullable().optional(),
})
export type WorkifyAttendanceEntry = z.infer<typeof workifyAttendanceEntrySchema>

// ----- Time entries -----
export const workifyTimeEntrySchema = z.object({
  id: uuid,
  employeeId: uuid.optional(),
  companyId: uuid.optional(),
  date: dateLike,
  clockIn: timeLike,
  clockOut: timeLike,
  breakStart: timeLike,
  breakEnd: timeLike,
  notes: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifyTimeEntry = z.infer<typeof workifyTimeEntrySchema>

export const workifyTimeEntriesQuerySchema = z.object({
  employeeId: uuid.optional(),
  start: z.string().optional(),
  end: z.string().optional(),
})
export type WorkifyTimeEntriesQuery = z.infer<typeof workifyTimeEntriesQuerySchema>

// ----- Dashboard -----
export const workifyDashboardStatsSchema = z.object({
  success: z.literal(true),
  totalEmployees: z.number(),
})
export type WorkifyDashboardStats = z.infer<typeof workifyDashboardStatsSchema>

// ----- Attendance -----
export const workifyAttendanceStatsSchema = z.object({
  success: z.literal(true),
  present: z.number(),
})
export type WorkifyAttendanceStats = z.infer<typeof workifyAttendanceStatsSchema>

export const workifyAttendanceQuerySchema = z.object({
  date: z.string().optional(),
})
export type WorkifyAttendanceQuery = z.infer<typeof workifyAttendanceQuerySchema>

// ----- Special assignments -----
export const workifySpecialAssignmentSchema = z.object({
  id: uuid,
  employeeId: uuid,
  workShiftId: uuid,
  date: dateLike,
  notes: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type WorkifySpecialAssignment = z.infer<typeof workifySpecialAssignmentSchema>

// ----- Me -----
export const workifyMeCompanySchema = z.object({
  id: uuid,
  name: z.string(),
  workifyEnabled: z.boolean(),
  posEnabled: z.boolean(),
  technicalServicesEnabled: z.boolean(),
})
export type WorkifyMeCompany = z.infer<typeof workifyMeCompanySchema>

export const workifyMeRoleSchema = z.object({
  role: z.object({ name: z.string() }),
  companyId: z.string(),
})
export type WorkifyMeRole = z.infer<typeof workifyMeRoleSchema>

export const workifyMeUserSchema = z.object({
  id: uuid,
  email: z.string(),
  name: z.string(),
  companyId: z.string().optional(),
  membershipRole: z.string().optional(),
  isSuperuser: z.boolean().optional(),
  company: workifyMeCompanySchema.optional(),
  roles: z.array(workifyMeRoleSchema),
})
export type WorkifyMeUser = z.infer<typeof workifyMeUserSchema>

export const workifyMeResponseSchema = z.object({
  success: z.literal(true),
  user: workifyMeUserSchema,
})
export type WorkifyMeResponse = z.infer<typeof workifyMeResponseSchema>
