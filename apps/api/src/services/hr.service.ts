import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { getCompanyModules } from '../core/modules.js'
import * as employeesService from './employees.service.js'
import type {
  HrMeUser,
  HrMeCompany,
  HrMeRole,
} from '../dto/hr.dto.js'
import * as hrHelper from '../helpers/hr.helper.js'

// --- Employees (delegate to employees.service) ---

export async function listEmployees(
  ctx: CompanyContext,
  query: { page?: string; limit?: string; search?: string; status?: string; departmentId?: string }
) {
  return employeesService.listEmployees(ctx, query)
}

export async function getEmployeeById(ctx: CompanyContext, id: string) {
  return employeesService.getEmployeeById(ctx, id)
}

export async function createEmployee(
  ctx: CompanyContext,
  input: employeesService.CreateEmployeeInput
) {
  return employeesService.createEmployee(ctx, input)
}

export async function updateEmployee(
  ctx: CompanyContext,
  id: string,
  input: employeesService.UpdateEmployeeInput
) {
  return employeesService.updateEmployee(ctx, id, input)
}

// --- Me ---

export async function getMe(ctx: CompanyContext): Promise<{ user: HrMeUser } | { error: string; code: number }> {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  })
  if (!user || !user.isActive) return { error: 'Usuario no encontrado o inactivo', code: 401 }

  let resolvedCompanyId: string | null = ctx.companyId
  const roles: HrMeRole[] = resolvedCompanyId
    ? [{ role: { name: ctx.membershipRole || 'USER' }, companyId: resolvedCompanyId }]
    : []

  let company: HrMeCompany | null = null
  if (resolvedCompanyId) {
    const companyRow = await prisma.company.findFirst({
      where: { id: resolvedCompanyId, isActive: true },
      select: { id: true, name: true },
    })
    if (companyRow) {
      const modules = await getCompanyModules(companyRow.id)
      company = hrHelper.toHrMeCompany({
        id: companyRow.id,
        name: companyRow.name,
        hrEnabled: modules?.hr ?? false,
        posEnabled: modules?.pos ?? false,
        technicalServicesEnabled: modules?.tech ?? false,
      })
    }
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || ''
  const safeUser = hrHelper.toHrMeUser({
    id: user.id,
    email: user.email,
    name,
    companyId: resolvedCompanyId ?? undefined,
    membershipRole: ctx.membershipRole ?? undefined,
    isSuperuser: ctx.isSuperuser ?? false,
    company: company ?? undefined,
    roles,
  })
  return { user: safeUser }
}

// --- Positions ---

export async function listPositions(ctx: CompanyContext) {
  return prisma.position.findMany({
    where: { department: { companyId: ctx.companyId } },
    orderBy: { name: 'asc' },
  })
}

export async function getPositionById(ctx: CompanyContext, id: string) {
  return prisma.position.findFirst({
    where: { id, department: { companyId: ctx.companyId } },
  })
}

// --- Roles ---

export async function listRoles(ctx: CompanyContext) {
  return prisma.role.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { name: 'asc' },
  })
}

export async function getRoleById(ctx: CompanyContext, id: string) {
  return prisma.role.findFirst({
    where: { id, companyId: ctx.companyId },
  })
}

// --- Holidays ---

export async function listHolidays(ctx: CompanyContext) {
  return prisma.holiday.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { date: 'asc' },
  })
}

export async function getHolidayById(ctx: CompanyContext, id: string) {
  return prisma.holiday.findFirst({
    where: { id, companyId: ctx.companyId },
  })
}

// --- Work shifts ---

export async function listWorkShifts(ctx: CompanyContext) {
  return prisma.workShift.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { name: 'asc' },
  })
}

// --- Dashboard ---

function dayBoundsFromQuery(date?: string): { dayStart: Date; dayEnd: Date; dayOfWeek: number } {
  const target = date ? new Date(date) : new Date()
  const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return { dayStart, dayEnd, dayOfWeek: dayStart.getDay() }
}

async function getScheduledEmployeeIdsForDay(
  ctx: CompanyContext,
  dayStart: Date,
  dayEnd: Date,
  dayOfWeek: number,
): Promise<Set<string>> {
  const [recurring, special] = await Promise.all([
    prisma.schedule.findMany({
      where: {
        companyId: ctx.companyId,
        dayOfWeek,
        startDate: { lte: dayEnd },
        OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
      },
      select: { employeeId: true },
    }),
    prisma.specialDayAssignment.findMany({
      where: {
        companyId: ctx.companyId,
        date: { gte: dayStart, lt: dayEnd },
      },
      select: { employeeId: true },
    }),
  ])
  const ids = new Set<string>()
  for (const r of recurring) ids.add(r.employeeId)
  for (const s of special) ids.add(s.employeeId)
  return ids
}

async function getActiveEmployeeIdSet(ctx: CompanyContext): Promise<Set<string>> {
  const rows = await prisma.employee.findMany({
    where: { companyId: ctx.companyId, isDeleted: false, status: 'ACTIVE' },
    select: { id: true },
  })
  return new Set(rows.map((e) => e.id))
}

function filterActiveSet(ids: Set<string>, active: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const id of ids) {
    if (active.has(id)) out.add(id)
  }
  return out
}

async function resolveWorkDay(
  ctx: CompanyContext,
  dayStart: Date,
  dayEnd: Date,
  dayOfWeek: number,
): Promise<{ isWorkDay: boolean; workDayReason?: string }> {
  const holiday = await prisma.holiday.findFirst({
    where: { companyId: ctx.companyId, date: { gte: dayStart, lt: dayEnd } },
  })
  if (holiday) return { isWorkDay: false, workDayReason: `Festivo: ${holiday.name}` }
  if (dayOfWeek === 0 || dayOfWeek === 6) return { isWorkDay: false, workDayReason: 'Fin de semana' }
  return { isWorkDay: true }
}

async function getExpectedStartForEmployee(
  ctx: CompanyContext,
  employeeId: string,
  dayStart: Date,
  dayEnd: Date,
  dayOfWeek: number,
): Promise<{ expected: Date; toleranceMin: number } | null> {
  const special = await prisma.specialDayAssignment.findFirst({
    where: {
      companyId: ctx.companyId,
      employeeId,
      date: { gte: dayStart, lt: dayEnd },
    },
    include: { workShift: true },
  })
  if (special) {
    const [h, m] = special.workShift.startTime.split(':').map(Number)
    const d = new Date(dayStart)
    d.setHours(h, m, 0, 0)
    return { expected: d, toleranceMin: special.workShift.tolerance }
  }
  const sch = await prisma.schedule.findFirst({
    where: {
      companyId: ctx.companyId,
      employeeId,
      dayOfWeek,
      startDate: { lte: dayEnd },
      OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
    },
    include: { workShift: true },
  })
  if (!sch) return null
  const [h, m] = sch.workShift.startTime.split(':').map(Number)
  const d = new Date(dayStart)
  d.setHours(h, m, 0, 0)
  return { expected: d, toleranceMin: sch.workShift.tolerance }
}

async function countLateClockIns(
  ctx: CompanyContext,
  dayStart: Date,
  dayEnd: Date,
  dayOfWeek: number,
): Promise<number> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: dayStart, lt: dayEnd },
      clockIn: { not: null },
    },
    select: { employeeId: true, clockIn: true },
  })
  let late = 0
  for (const e of entries) {
    if (!e.clockIn) continue
    const exp = await getExpectedStartForEmployee(ctx, e.employeeId, dayStart, dayEnd, dayOfWeek)
    if (!exp) continue
    const limitMs = exp.expected.getTime() + exp.toleranceMin * 60_000
    if (e.clockIn.getTime() > limitMs) late++
  }
  return late
}

export async function getDashboardStats(ctx: CompanyContext, date?: string) {
  const { dayStart, dayEnd, dayOfWeek } = dayBoundsFromQuery(date)
  const activeIds = await getActiveEmployeeIdSet(ctx)
  const totalEmployees = await prisma.employee.count({
    where: { companyId: ctx.companyId, isDeleted: false },
  })
  const todayActive = activeIds.size

  const scheduledRaw = await getScheduledEmployeeIdsForDay(ctx, dayStart, dayEnd, dayOfWeek)
  const todayScheduled = filterActiveSet(scheduledRaw, activeIds).size

  const timeEntriesToday = await prisma.timeEntry.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: dayStart, lt: dayEnd },
      clockIn: { not: null },
    },
    select: { employeeId: true, clockIn: true, clockOut: true },
  })
  const presentIds = new Set(timeEntriesToday.map((t) => t.employeeId))
  const todayPresent = filterActiveSet(presentIds, activeIds).size

  const onLeaveRows = await prisma.license.findMany({
    where: {
      companyId: ctx.companyId,
      status: 'APPROVED',
      startDate: { lt: dayEnd },
      endDate: { gte: dayStart },
    },
    select: { employeeId: true },
  })
  const onLeave = new Set(onLeaveRows.map((l) => l.employeeId))

  const scheduledActive = filterActiveSet(scheduledRaw, activeIds)
  let absentUnexcused = 0
  for (const eid of scheduledActive) {
    if (presentIds.has(eid)) continue
    if (onLeave.has(eid)) continue
    absentUnexcused++
  }

  const todayLate = await countLateClockIns(ctx, dayStart, dayEnd, dayOfWeek)

  const in30 = new Date(dayStart)
  in30.setDate(in30.getDate() + 30)
  const expiringSoon = await prisma.license.count({
    where: {
      companyId: ctx.companyId,
      status: 'APPROVED',
      endDate: { gte: dayStart, lte: in30 },
    },
  })

  const { isWorkDay, workDayReason } = await resolveWorkDay(ctx, dayStart, dayEnd, dayOfWeek)

  const weeklyAttendance: { date: string; scheduled: number; present: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const de = new Date(ds)
    de.setDate(de.getDate() + 1)
    const dow = ds.getDay()
    const sched = filterActiveSet(await getScheduledEmployeeIdsForDay(ctx, ds, de, dow), activeIds)
    const presentDay = await prisma.timeEntry.groupBy({
      by: ['employeeId'],
      where: {
        companyId: ctx.companyId,
        date: { gte: ds, lt: de },
        clockIn: { not: null },
      },
    })
    const pset = new Set(presentDay.map((p) => p.employeeId))
    let presentCount = 0
    for (const id of sched) {
      if (pset.has(id)) presentCount++
    }
    weeklyAttendance.push({
      date: ds.toISOString().split('T')[0],
      scheduled: sched.size,
      present: presentCount,
    })
  }

  let sumSched = 0
  let sumPres = 0
  for (const row of weeklyAttendance) {
    sumSched += row.scheduled
    sumPres += row.present
  }
  const weeklyAttendanceRate = sumSched > 0 ? Math.round((sumPres / sumSched) * 1000) / 10 : 0

  const deptRows = await prisma.employee.findMany({
    where: {
      companyId: ctx.companyId,
      isDeleted: false,
      id: { in: [...presentIds].filter((id) => activeIds.has(id)) },
    },
    select: {
      departmentId: true,
      department: { select: { name: true } },
    },
  })
  const deptMap = new Map<string | null, { name: string; present: number }>()
  for (const r of deptRows) {
    const key = r.departmentId
    const name = r.department?.name ?? 'Sin departamento'
    const cur = deptMap.get(key) ?? { name, present: 0 }
    cur.present += 1
    deptMap.set(key, cur)
  }

  const scheduledByDept = await prisma.employee.findMany({
    where: {
      companyId: ctx.companyId,
      isDeleted: false,
      id: { in: [...scheduledRaw].filter((id) => activeIds.has(id)) },
    },
    select: {
      departmentId: true,
      department: { select: { name: true } },
    },
  })
  const schedDeptMap = new Map<string | null, { name: string; scheduled: number }>()
  for (const r of scheduledByDept) {
    const key = r.departmentId
    const name = r.department?.name ?? 'Sin departamento'
    const cur = schedDeptMap.get(key) ?? { name, scheduled: 0 }
    cur.scheduled += 1
    schedDeptMap.set(key, cur)
  }

  const departmentAttendance: {
    departmentId: string | null
    departmentName: string
    scheduled: number
    present: number
  }[] = []
  const allDeptKeys = new Set([...schedDeptMap.keys(), ...deptMap.keys()])
  for (const key of allDeptKeys) {
    const s = schedDeptMap.get(key)
    const p = deptMap.get(key)
    departmentAttendance.push({
      departmentId: key,
      departmentName: s?.name ?? p?.name ?? 'Sin departamento',
      scheduled: s?.scheduled ?? 0,
      present: p?.present ?? 0,
    })
  }

  let registeredHoursToday = 0
  const withHours = await prisma.timeEntry.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: dayStart, lt: dayEnd },
      clockIn: { not: null },
      clockOut: { not: null },
    },
    select: { clockIn: true, clockOut: true },
  })
  for (const e of withHours) {
    if (e.clockIn && e.clockOut) {
      registeredHoursToday += (e.clockOut.getTime() - e.clockIn.getTime()) / 3_600_000
    }
  }
  registeredHoursToday = Math.round(registeredHoursToday * 10) / 10

  const openAlerts = absentUnexcused + todayLate + expiringSoon

  return {
    totalEmployees,
    todayActive,
    todayScheduled,
    todayPresent,
    todayAbsent: absentUnexcused,
    todayLate,
    openAlerts,
    weeklyAttendanceRate,
    weeklyAttendance,
    departmentAttendance,
    isWorkDay,
    workDayReason,
    registeredHoursToday,
  }
}

// --- Time entries ---

export async function listTimeEntries(
  ctx: CompanyContext,
  query: { employeeId?: string; start?: string; end?: string }
) {
  const where: Prisma.TimeEntryWhereInput = { companyId: ctx.companyId }
  if (query.employeeId) where.employeeId = query.employeeId
  if (query.start && query.end) where.date = { gte: new Date(query.start), lte: new Date(query.end) }
  else if (query.start) where.date = { gte: new Date(query.start) }
  else if (query.end) where.date = { lte: new Date(query.end) }
  return prisma.timeEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { clockIn: 'desc' }],
  })
}

// --- Employee attendance (time entries for one employee) ---

export async function getEmployeeAttendance(
  ctx: CompanyContext,
  employeeId: string,
  month?: string
) {
  const where: Prisma.TimeEntryWhereInput = {
    employeeId,
    employee: { companyId: ctx.companyId },
  }
  if (month) {
    const start = new Date(month)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    where.date = { gte: start, lte: end }
  }
  return prisma.timeEntry.findMany({
    where,
    orderBy: { date: 'desc' },
    select: { id: true, date: true, clockIn: true, clockOut: true, breakStart: true, breakEnd: true, notes: true },
  })
}

// --- Attendance stats ---

export async function getAttendanceStats(ctx: CompanyContext, date?: string) {
  const { dayStart, dayEnd, dayOfWeek } = dayBoundsFromQuery(date)
  const activeIds = await getActiveEmployeeIdSet(ctx)
  const scheduledRaw = await getScheduledEmployeeIdsForDay(ctx, dayStart, dayEnd, dayOfWeek)
  const scheduled = filterActiveSet(scheduledRaw, activeIds)

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: dayStart, lt: dayEnd },
      clockIn: { not: null },
    },
    select: { employeeId: true, breakStart: true, breakEnd: true },
  })
  const presentIds = new Set(entries.map((e) => e.employeeId))
  const present = [...presentIds].filter((id) => activeIds.has(id)).length

  const onLeaveRows = await prisma.license.findMany({
    where: {
      companyId: ctx.companyId,
      status: 'APPROVED',
      startDate: { lt: dayEnd },
      endDate: { gte: dayStart },
    },
    select: { employeeId: true },
  })
  const onLeave = new Set(onLeaveRows.map((l) => l.employeeId))

  let employeesAbsent = 0
  for (const eid of scheduled) {
    if (presentIds.has(eid)) continue
    if (onLeave.has(eid)) continue
    employeesAbsent++
  }

  const employeesWorking = [...presentIds].filter((id) => activeIds.has(id)).length
  let employeesOnBreak = 0
  for (const e of entries) {
    if (!activeIds.has(e.employeeId)) continue
    if (e.breakStart && !e.breakEnd) employeesOnBreak++
  }

  const employeesLate = await countLateClockIns(ctx, dayStart, dayEnd, dayOfWeek)
  const { isWorkDay, workDayReason } = await resolveWorkDay(ctx, dayStart, dayEnd, dayOfWeek)

  return {
    present,
    employeesScheduled: scheduled.size,
    employeesWorking,
    employeesAbsent,
    employeesLate,
    employeesOnBreak,
    isWorkDay,
    workDayReason,
  }
}

export type HrDashboardAlert = {
  type: 'ABSENCE' | 'LATE' | 'LICENSE_EXPIRING' | 'SHIFT_GAP' | 'INFO'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  meta?: Record<string, string>
}

export async function getDashboardAlerts(ctx: CompanyContext, date?: string): Promise<{ alerts: HrDashboardAlert[] }> {
  const { dayStart, dayEnd, dayOfWeek } = dayBoundsFromQuery(date)
  const activeIds = await getActiveEmployeeIdSet(ctx)
  const scheduledRaw = await getScheduledEmployeeIdsForDay(ctx, dayStart, dayEnd, dayOfWeek)
  const scheduled = filterActiveSet(scheduledRaw, activeIds)

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: dayStart, lt: dayEnd },
      clockIn: { not: null },
    },
    select: { employeeId: true },
  })
  const presentIds = new Set(entries.map((e) => e.employeeId))

  const onLeaveRows = await prisma.license.findMany({
    where: {
      companyId: ctx.companyId,
      status: 'APPROVED',
      startDate: { lt: dayEnd },
      endDate: { gte: dayStart },
    },
    select: { employeeId: true },
  })
  const onLeave = new Set(onLeaveRows.map((l) => l.employeeId))

  const absentIds: string[] = []
  for (const eid of scheduled) {
    if (presentIds.has(eid)) continue
    if (onLeave.has(eid)) continue
    absentIds.push(eid)
  }

  const absentEmployees =
    absentIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: absentIds }, companyId: ctx.companyId },
          select: { id: true, firstName: true, lastName: true },
        })
      : []

  const in30 = new Date(dayStart)
  in30.setDate(in30.getDate() + 30)
  const expiringLicenses = await prisma.license.findMany({
    where: {
      companyId: ctx.companyId,
      status: 'APPROVED',
      endDate: { gte: dayStart, lte: in30 },
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { endDate: 'asc' },
    take: 20,
  })

  const alerts: HrDashboardAlert[] = []

  if (absentEmployees.length > 0) {
    const names = absentEmployees.map((e) => `${e.firstName} ${e.lastName}`.trim()).slice(0, 8)
    const extra = absentEmployees.length > 8 ? ` y ${absentEmployees.length - 8} más` : ''
    alerts.push({
      type: 'ABSENCE',
      priority: 'high',
      title: 'Ausencias sin justificar',
      message: `${absentEmployees.length} empleado(s) programado(s) sin registro de entrada: ${names.join(', ')}${extra}.`,
    })
  }

  const lateCount = await countLateClockIns(ctx, dayStart, dayEnd, dayOfWeek)
  if (lateCount > 0) {
    alerts.push({
      type: 'LATE',
      priority: 'medium',
      title: 'Tardanzas',
      message: `${lateCount} registro(s) con entrada fuera de tolerancia respecto al turno.`,
    })
  }

  for (const lic of expiringLicenses.slice(0, 10)) {
    const name = [lic.employee.firstName, lic.employee.lastName].filter(Boolean).join(' ')
    alerts.push({
      type: 'LICENSE_EXPIRING',
      priority: 'low',
      title: 'Permiso próximo a finalizar',
      message: `${name}: permiso ${lic.type} hasta ${lic.endDate.toISOString().split('T')[0]}.`,
      meta: { employeeId: lic.employeeId, licenseId: lic.id },
    })
  }

  return { alerts }
}

// --- Special assignments ---

export async function listSpecialAssignments(ctx: CompanyContext) {
  return prisma.specialDayAssignment.findMany({
    where: { employee: { companyId: ctx.companyId } },
    orderBy: { date: 'desc' },
  })
}
