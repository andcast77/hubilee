import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { prisma } from '../db/index.js'
import type { TokenPayload } from '../core/auth.js'
import type {
  AttachMemberEmailBody,
  CreateMemberBody,
  ResetMemberPasswordBody,
  UpdateMemberStoresBody,
} from '../dto/company-members.dto.js'
import { ForbiddenError, NotFoundError, BadRequestError } from '../common/errors/app-error.js'
import { assertCanManageMembers, assertCompanyAccess } from '../policies/company-authorization.policy.js'

const roleOrder = { OWNER: 0, ADMIN: 1, USER: 2 } as const
const EMPLOYEE_CODE_MAX_ATTEMPTS = 20

/** 6-digit floor employee code (company-scoped uniqueness enforced at insert). */
export function generateEmployeeCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

async function allocateUniqueEmployeeCode(companyId: string): Promise<string> {
  for (let i = 0; i < EMPLOYEE_CODE_MAX_ATTEMPTS; i++) {
    const code = generateEmployeeCode()
    const clash = await prisma.companyMember.findFirst({
      where: { companyId, employeeCode: code },
      select: { id: true },
    })
    if (!clash) return code
  }
  throw new BadRequestError('No se pudo generar un código de empleado único. Intenta de nuevo.')
}

/**
 * Floor USER store assignment:
 * - exactly one store
 * - if company has 1 active store and storeIds omitted/empty → auto-assign that store
 * - if 2+ stores and no pick → reject (never default to all stores)
 * - if storeIds provided → must be exactly one valid store for the company
 */
async function resolveFloorStoreIds(companyId: string, storeIds: string[] | undefined): Promise<string[]> {
  const activeStores = await prisma.store.findMany({
    where: { companyId, active: true },
    select: { id: true },
  })

  if (Array.isArray(storeIds) && storeIds.length > 0) {
    if (storeIds.length !== 1) {
      throw new BadRequestError('El personal de piso debe asignarse a exactamente un local')
    }
    const valid = await prisma.store.findMany({
      where: { id: { in: storeIds }, companyId },
      select: { id: true },
    })
    if (valid.length !== 1) {
      throw new BadRequestError('El local seleccionado no pertenece a esta empresa')
    }
    return [valid[0]!.id]
  }

  if (activeStores.length === 1) {
    return [activeStores[0]!.id]
  }
  if (activeStores.length === 0) {
    throw new BadRequestError('La empresa no tiene locales activos para asignar')
  }
  throw new BadRequestError(
    'Debes seleccionar exactamente un local. No se asignan todos los locales por defecto.',
  )
}

export async function list(companyId: string, caller: TokenPayload) {
  assertCompanyAccess(caller, companyId)
  const members = await prisma.companyMember.findMany({
    where: { companyId },
    include: { user: true },
  })
  const nonSuperuser = members
    .filter((m) => !m.user.isSuperuser)
    .sort((a, b) => {
      const oa = roleOrder[a.membershipRole as keyof typeof roleOrder] ?? 3
      const ob = roleOrder[b.membershipRole as keyof typeof roleOrder] ?? 3
      if (oa !== ob) return oa - ob
      return `${a.user.firstName} ${a.user.lastName}`.trim().localeCompare(`${b.user.firstName} ${b.user.lastName}`.trim())
    })
  const userIdsUser = nonSuperuser.filter((m) => m.membershipRole === 'USER').map((m) => m.userId)
  const userStoresMap = new Map<string, string[]>()
  if (userIdsUser.length > 0) {
    const userStores = await prisma.userStore.findMany({
      where: { userId: { in: userIdsUser }, store: { companyId } },
      select: { userId: true, storeId: true },
    })
    for (const us of userStores) {
      const arr = userStoresMap.get(us.userId) ?? []
      arr.push(us.storeId)
      userStoresMap.set(us.userId, arr)
    }
  }
  return { members: nonSuperuser, userStoresMap }
}

export async function create(companyId: string, caller: TokenPayload, body: CreateMemberBody) {
  assertCompanyAccess(caller, companyId)
  assertCanManageMembers(caller, 'Solo el owner o un admin pueden crear usuarios')

  const email = body.email?.trim().toLowerCase() || null
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } })
    if (existing) throw new BadRequestError('Ya existe un usuario con este email')
  }

  const isFloorUser = body.membershipRole === 'USER'
  let floorStoreIds: string[] = []
  if (isFloorUser) {
    floorStoreIds = await resolveFloorStoreIds(companyId, body.storeIds)
  }

  const hashed = await bcrypt.hash(body.password, 10)
  const employeeCode = isFloorUser ? await allocateUniqueEmployeeCode(companyId) : null

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      role: 'USER',
      isActive: true,
      isSuperuser: false,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  await prisma.companyMember.create({
    data: {
      userId: user.id,
      companyId,
      membershipRole: body.membershipRole,
      employeeCode,
    },
  })

  if (isFloorUser) {
    for (const storeId of floorStoreIds) {
      await prisma.userStore.upsert({
        where: { userId_storeId: { userId: user.id, storeId } },
        create: { userId: user.id, storeId },
        update: {},
      })
    }
  }

  return {
    user,
    membershipRole: body.membershipRole,
    employeeCode,
    storeIds: floorStoreIds,
  }
}

export async function updateStores(companyId: string, userId: string, caller: TokenPayload, body: UpdateMemberStoresBody) {
  assertCompanyAccess(caller, companyId)
  assertCanManageMembers(caller, 'Solo el owner o un admin pueden modificar locales de usuarios')
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { membershipRole: true },
  })
  if (!member) throw new NotFoundError('Usuario no encontrado en esta empresa')
  if (member.membershipRole !== 'USER') {
    throw new BadRequestError('Solo los usuarios con rol USER tienen locales asignados. Los owners y admins tienen acceso a todos.')
  }

  // Floor staff stay single-store; admins updating stores must pick exactly one.
  if (body.storeIds.length !== 1) {
    throw new BadRequestError('El personal de piso debe tener exactamente un local asignado')
  }

  const valid = await prisma.store.findMany({
    where: { id: { in: body.storeIds }, companyId },
    select: { id: true },
  })
  if (valid.length !== 1) {
    throw new BadRequestError('El local seleccionado no pertenece a esta empresa')
  }
  const idsToAssign = [valid[0]!.id]

  const companyStores = await prisma.store.findMany({ where: { companyId }, select: { id: true } })
  const companyStoreIds = companyStores.map((s) => s.id)
  await prisma.userStore.deleteMany({ where: { userId, storeId: { in: companyStoreIds } } })
  for (const storeId of idsToAssign) {
    await prisma.userStore.upsert({
      where: { userId_storeId: { userId, storeId } },
      create: { userId, storeId },
      update: {},
    })
  }
  return { storeIds: idsToAssign }
}

async function resolveManagedMember(companyId: string, userId: string, caller: TokenPayload) {
  assertCompanyAccess(caller, companyId)
  assertCanManageMembers(caller, 'Solo el owner o un admin pueden gestionar este usuario')
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { id: true, userId: true, membershipRole: true, employeeCode: true },
  })
  if (!member) throw new NotFoundError('Usuario no encontrado en esta empresa')
  return member
}

/** Admin/owner sets a new password for a company member (floor day-1 has no self-serve email reset). */
export async function resetMemberPassword(
  companyId: string,
  userId: string,
  caller: TokenPayload,
  body: ResetMemberPasswordBody,
) {
  await resolveManagedMember(companyId, userId, caller)
  const hashed = await bcrypt.hash(body.password, 10)
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashed,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
  return { userId }
}

/**
 * Attach a unique email to a codes-only floor user.
 * Enables email+password login while keeping employeeCode / floor-login.
 */
export async function attachMemberEmail(
  companyId: string,
  userId: string,
  caller: TokenPayload,
  body: AttachMemberEmailBody,
) {
  const member = await resolveManagedMember(companyId, userId, caller)
  const email = body.email.trim().toLowerCase()
  const taken = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  })
  if (taken) throw new BadRequestError('Ya existe un usuario con este email')

  const user = await prisma.user.update({
    where: { id: userId },
    data: { email },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  return {
    userId: user.id,
    email: user.email,
    employeeCode: member.employeeCode,
  }
}
