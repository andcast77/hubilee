import { prisma, Prisma } from '../db/index.js'
import { sseManager } from './sse.service.js'
import type { CompanyContext } from '../core/auth-context.js'
import { parsePagination } from '../common/database/index.js'
import {
  encryptField,
  decryptField,
  hashForSearch,
  getEncryptionKey,
} from '../common/crypto/index.js'

type EmployeeRow = {
  id: string
  companyId: string
  departmentId: string | null
  positionId: string | null
  userId: string | null
  idNumber: string | null
  firstName: string
  lastName: string
  birthDate: Date | null
  gender: string | null
  dateJoined: Date
  status: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Returns the encryption key if configured, or null when FIELD_ENCRYPTION_KEY is absent.
 * Allows the service to operate in read-only degraded mode on environments without the key.
 */
function tryGetKey(): Buffer | null {
  try {
    return getEncryptionKey()
  } catch {
    return null
  }
}

/**
 * Decrypts an encrypted field value. Falls back to the original value when:
 * - No encryption key is configured, or
 * - The value is not in the expected encrypted format (existing plaintext records).
 */
function safeDecrypt(value: string | null, key: Buffer | null): string | null {
  if (value === null) return null
  if (key === null) return value
  try {
    return decryptField(value, key)
  } catch {
    return value
  }
}

function mapEmployee(
  e: {
    id: string
    companyId: string
    departmentId: string | null
    positionId: string | null
    userId: string | null
    idNumber: string | null
    firstName: string
    lastName: string
    birthDate: Date | null
    gender: string | null
    dateJoined: Date
    status: string
    createdAt: Date
    updatedAt: Date
  },
  key: Buffer | null
): EmployeeRow {
  return {
    id: e.id,
    companyId: e.companyId,
    departmentId: e.departmentId,
    positionId: e.positionId,
    userId: e.userId,
    idNumber: safeDecrypt(e.idNumber, key),
    firstName: e.firstName,
    lastName: e.lastName,
    birthDate: e.birthDate,
    gender: e.gender,
    dateJoined: e.dateJoined,
    status: e.status,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

export async function listEmployees(
  ctx: CompanyContext,
  query: { page?: string; limit?: string; search?: string; status?: string; departmentId?: string }
): Promise<{
  employees: EmployeeRow[]
  total: number
  page: number
  limit: number
}> {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 10 })
  const key = tryGetKey()

  const where: Prisma.EmployeeWhereInput = {
    companyId: ctx.companyId,
    isDeleted: false,
  }

  if (query.search) {
    const nameFilter = [
      { firstName: { contains: query.search, mode: 'insensitive' as const } },
      { lastName: { contains: query.search, mode: 'insensitive' as const } },
    ]
    if (key) {
      const hash = hashForSearch(query.search, key)
      where.OR = [...nameFilter, { idNumberHash: hash }]
    } else {
      where.OR = [...nameFilter, { idNumber: { contains: query.search, mode: 'insensitive' } }]
    }
  }

  if (query.status) where.status = query.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  if (query.departmentId) where.departmentId = query.departmentId

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take: limit,
    }),
  ])

  return {
    employees: employees.map((e) => mapEmployee(e, key)),
    total,
    page,
    limit,
  }
}

export async function getEmployeeById(
  ctx: CompanyContext,
  id: string
): Promise<EmployeeRow | null> {
  const key = tryGetKey()
  const e = await prisma.employee.findFirst({
    where: { id, companyId: ctx.companyId, isDeleted: false },
  })
  if (!e) return null
  return mapEmployee(e, key)
}

export type CreateEmployeeInput = {
  companyId: string
  departmentId?: string | null
  positionId?: string | null
  userId?: string | null
  idNumber?: string | null
  firstName: string
  lastName: string
  birthDate?: Date | null
  gender?: string | null
  dateJoined?: Date
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  customSalaryAmount?: number | null
  customSalaryType?: string | null
  customOvertimeEligible?: boolean
}

export async function createEmployee(
  ctx: CompanyContext,
  input: CreateEmployeeInput
): Promise<EmployeeRow> {
  const key = tryGetKey()
  let idNumber: string | null = input.idNumber ?? null
  let idNumberHash: string | null = null

  if (idNumber !== null && key !== null) {
    idNumberHash = hashForSearch(idNumber, key)
    idNumber = encryptField(idNumber, key)
  }

  const e = await prisma.employee.create({
    data: {
      companyId: ctx.companyId,
      departmentId: input.departmentId ?? null,
      positionId: input.positionId ?? null,
      userId: input.userId ?? null,
      idNumber,
      idNumberHash,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate ?? null,
      gender: input.gender as any ?? null,
      dateJoined: input.dateJoined ?? new Date(),
      status: (input.status ?? 'ACTIVE') as any,
      customSalaryAmount: input.customSalaryAmount ?? null,
      customSalaryType: input.customSalaryType as any ?? null,
      customOvertimeEligible: input.customOvertimeEligible ?? false,
    },
  })

  sseManager.emit(ctx.companyId, 'hr:dashboard:invalidate', { reason: 'employee-created' })
  return mapEmployee(e, key)
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'companyId'>>

export async function updateEmployee(
  ctx: CompanyContext,
  id: string,
  input: UpdateEmployeeInput
): Promise<EmployeeRow | null> {
  const existing = await prisma.employee.findFirst({
    where: { id, companyId: ctx.companyId, isDeleted: false },
    select: { id: true },
  })
  if (!existing) return null

  const key = tryGetKey()
  const data: Prisma.EmployeeUpdateInput = {}

  if (input.firstName !== undefined) data.firstName = input.firstName
  if (input.lastName !== undefined) data.lastName = input.lastName
  if (input.departmentId !== undefined) data.department = input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true }
  if (input.positionId !== undefined) data.position = input.positionId ? { connect: { id: input.positionId } } : { disconnect: true }
  if (input.birthDate !== undefined) data.birthDate = input.birthDate
  if (input.gender !== undefined) data.gender = input.gender as any
  if (input.status !== undefined) data.status = input.status as any
  if (input.customSalaryAmount !== undefined) data.customSalaryAmount = input.customSalaryAmount
  if (input.customSalaryType !== undefined) data.customSalaryType = input.customSalaryType as any
  if (input.customOvertimeEligible !== undefined) data.customOvertimeEligible = input.customOvertimeEligible

  if (input.idNumber !== undefined) {
    if (input.idNumber === null) {
      data.idNumber = null
      data.idNumberHash = null
    } else if (key !== null) {
      data.idNumber = encryptField(input.idNumber, key)
      data.idNumberHash = hashForSearch(input.idNumber, key)
    } else {
      data.idNumber = input.idNumber
      data.idNumberHash = null
    }
  }

  const e = await prisma.employee.update({
    where: { id },
    data,
  })

  sseManager.emit(ctx.companyId, 'hr:dashboard:invalidate', { reason: 'employee-updated' })
  return mapEmployee(e, key)
}
