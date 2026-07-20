import { z } from 'zod'

const uuid = z.string().uuid()
const dateLike = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? v : v.toISOString().slice(0, 10)))
const timeLike = z.string().optional().nullable()

// ----- Employees -----
export const hrEmployeeSchema = z.object({
  id: uuid,
  firstName: z.string(),
  lastName: z.string(),
  idNumber: z.string(),
  status: z.string(),
  dateJoined: z.union([z.string(), z.date()]),
  departmentId: uuid.nullable(),
  positionId: uuid.nullable(),
})
export type HrEmployee = z.infer<typeof hrEmployeeSchema>

export const hrEmployeesListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  departmentId: uuid.optional(),
})
export type HrEmployeesListQuery = z.infer<typeof hrEmployeesListQuerySchema>

export const hrEmployeesListResponseSchema = z.object({
  success: z.literal(true),
  employees: z.array(hrEmployeeSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})
export type HrEmployeesListResponse = z.infer<typeof hrEmployeesListResponseSchema>

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
export const hrRoleSchema = z.object({
  id: uuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  parentId: uuid.nullable().optional(),
  companyId: uuid.optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type HrRole = z.infer<typeof hrRoleSchema>

// ----- Positions -----
export const hrPositionSchema = z.object({
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
export type HrPosition = z.infer<typeof hrPositionSchema>

// ----- Holidays -----
export const hrHolidaySchema = z.object({
  id: uuid,
  name: z.string(),
  date: dateLike,
  isRecurring: z.boolean().optional(),
  companyId: uuid.optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type HrHoliday = z.infer<typeof hrHolidaySchema>

// ----- Work shifts -----
export const hrWorkShiftSchema = z.object({
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
export type HrWorkShift = z.infer<typeof hrWorkShiftSchema>

// ----- Attendance (single employee time entries) -----
export const hrAttendanceEntrySchema = z.object({
  id: uuid,
  date: dateLike,
  clockIn: timeLike,
  clockOut: timeLike,
  breakStart: timeLike,
  breakEnd: timeLike,
  notes: z.string().nullable().optional(),
})
export type HrAttendanceEntry = z.infer<typeof hrAttendanceEntrySchema>

// ----- Time entries -----
export const hrTimeEntrySchema = z.object({
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
export type HrTimeEntry = z.infer<typeof hrTimeEntrySchema>

export const hrTimeEntriesQuerySchema = z.object({
  employeeId: uuid.optional(),
  start: z.string().optional(),
  end: z.string().optional(),
})
export type HrTimeEntriesQuery = z.infer<typeof hrTimeEntriesQuerySchema>

// ----- Dashboard -----
export const hrDashboardStatsSchema = z.object({
  success: z.literal(true),
  totalEmployees: z.number(),
})
export type HrDashboardStats = z.infer<typeof hrDashboardStatsSchema>

// ----- Attendance -----
export const hrAttendanceStatsSchema = z.object({
  success: z.literal(true),
  present: z.number(),
})
export type HrAttendanceStats = z.infer<typeof hrAttendanceStatsSchema>

export const hrAttendanceQuerySchema = z.object({
  date: z.string().optional(),
})
export type HrAttendanceQuery = z.infer<typeof hrAttendanceQuerySchema>

// ----- Special assignments -----
export const hrSpecialAssignmentSchema = z.object({
  id: uuid,
  employeeId: uuid,
  workShiftId: uuid,
  date: dateLike,
  notes: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
})
export type HrSpecialAssignment = z.infer<typeof hrSpecialAssignmentSchema>

// ----- Me -----
export const hrMeCompanySchema = z.object({
  id: uuid,
  name: z.string(),
  hrEnabled: z.boolean(),
  posEnabled: z.boolean(),
  technicalServicesEnabled: z.boolean(),
})
export type HrMeCompany = z.infer<typeof hrMeCompanySchema>

export const hrMeRoleSchema = z.object({
  role: z.object({ name: z.string() }),
  companyId: z.string(),
})
export type HrMeRole = z.infer<typeof hrMeRoleSchema>

export const hrMeUserSchema = z.object({
  id: uuid,
  email: z.string(),
  name: z.string(),
  companyId: z.string().optional(),
  membershipRole: z.string().optional(),
  isSuperuser: z.boolean().optional(),
  company: hrMeCompanySchema.optional(),
  roles: z.array(hrMeRoleSchema),
})
export type HrMeUser = z.infer<typeof hrMeUserSchema>

export const hrMeResponseSchema = z.object({
  success: z.literal(true),
  user: hrMeUserSchema,
})
export type HrMeResponse = z.infer<typeof hrMeResponseSchema>
