import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db/index.js'
import { getCompanyModulesForMany, type CompanyModulesShape } from './modules.js'

export type CompanyRow = {
  id: string
  name: string
  modules: CompanyModulesShape
  membershipRole?: string | null
}

type CompanyBasic = { id: string; name: string; isActive: boolean }
type MemberWithCompany = { id: string; company: CompanyBasic; membershipRole: string | null }
type RoleWithCompany = { company: CompanyBasic }

/**
 * Get companies for a user (all active if superuser, else via company_members / user_roles).
 */
export async function getUserCompanies(
  userId: string,
  isSuperuser: boolean
): Promise<CompanyRow[]> {
  if (isSuperuser) {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    const companyIds = companies.map((c: { id: string }) => c.id)
    const modulesMap = await getCompanyModulesForMany(companyIds)
    return companies.map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
      modules: modulesMap.get(c.id) ?? { hr: false, pos: false, techservices: false, baro: false },
      membershipRole: null,
    }))
  }

  const members = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeMembers = members.filter((m: MemberWithCompany) => m.company.isActive)
  if (activeMembers.length > 0) {
    const companyIds = activeMembers.map((m: MemberWithCompany) => m.company.id)
    const modulesMap = await getCompanyModulesForMany(companyIds)
    return activeMembers.map((m: MemberWithCompany) => ({
      id: m.company.id,
      name: m.company.name,
      modules: modulesMap.get(m.company.id) ?? { hr: false, pos: false, techservices: false, baro: false },
      membershipRole: m.membershipRole,
    }))
  }

  const userRoles = await prisma.userRoleAssignment.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeRoles = userRoles.filter((r: RoleWithCompany) => r.company.isActive)
  const companyIds = activeRoles.map((r: RoleWithCompany) => r.company.id)
  const modulesMap = await getCompanyModulesForMany(companyIds)
  return activeRoles.map((r: RoleWithCompany) => ({
    id: r.company.id,
    name: r.company.name,
    modules: modulesMap.get(r.company.id) ?? { hr: false, pos: false, techservices: false, baro: false },
    membershipRole: null,
  }))
}

/**
 * Pick selected company from list (by preferredCompanyId/posPreferredCompanyId or first if single).
 */
export function selectCompanyForUser(
  companies: CompanyRow[],
  preferredCompanyId?: string | null
): { selectedCompany: Omit<CompanyRow, 'membershipRole'>; selectedMembershipRole: string | null } | null {
  if (companies.length === 0) return null
  if (preferredCompanyId && companies.some((c: CompanyRow) => c.id === preferredCompanyId)) {
    const row = companies.find((c: CompanyRow) => c.id === preferredCompanyId)!
    return {
      selectedCompany: { id: row.id, name: row.name, modules: row.modules },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  if (companies.length === 1) {
    const row = companies[0]
    return {
      selectedCompany: { id: row.id, name: row.name, modules: row.modules },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  return null
}

/**
 * Tipos de contexto (para tipado en rutas que usan request.companyId, etc.).
 */
export type CompanyContext = {
  userId: string
  companyId: string
  isSuperuser: boolean
  membershipRole: string | null
}

export type PosContext = CompanyContext & { storeId?: string | null }
export type HrContext = CompanyContext
export type MembershipRoleName = 'OWNER' | 'ADMIN' | 'USER'

declare module 'fastify' {
  interface FastifyRequest {
    companyId?: string
    companyMemberId?: string
    membershipRole?: string | null
    storeId?: string | null
  }
}

const NO_ACCESS_MSG = 'No tienes acceso a ninguna empresa'
const FORBIDDEN_MSG = 'No tienes permisos para realizar esta acción'

function getStoreIdFromHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers['x-store-id']
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

type ResolvedCompany = {
  companyId: string
  companyMemberId: string | undefined
  membershipRole: string | null
}

async function resolveCompanyId(decoded: {
  id: string
  companyId?: string
  isSuperuser?: boolean
}): Promise<ResolvedCompany | null> {
  const userId = decoded.id

  if (decoded.isSuperuser) {
    if (decoded.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: decoded.companyId, isActive: true },
      })
      if (company) return { companyId: decoded.companyId, companyMemberId: undefined, membershipRole: null }
    }
    const first = await prisma.company.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    if (first) return { companyId: first.id, companyMemberId: undefined, membershipRole: null }
    return null
  }

  const members = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeMembers = members.filter((m: MemberWithCompany) => m.company.isActive)
  let companies: { id: string; companyMemberId: string; membershipRole: string | null }[] = activeMembers.map(
    (m: MemberWithCompany) => ({ id: m.company.id, companyMemberId: m.id, membershipRole: m.membershipRole })
  )

  if (companies.length === 0) {
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { company: true },
      orderBy: { company: { name: 'asc' } },
    })
    companies = userRoles
      .filter((r: RoleWithCompany) => r.company.isActive)
      .map((r: RoleWithCompany) => ({ id: r.company.id, companyMemberId: '', membershipRole: null }))
  }

  if (companies.length === 0) return null

  if (decoded.companyId && companies.some((c: { id: string }) => c.id === decoded.companyId)) {
    const row = companies.find((c: { id: string }) => c.id === decoded.companyId)!
    return { companyId: row.id, companyMemberId: row.companyMemberId || undefined, membershipRole: row.membershipRole }
  }

  const first = companies[0]
  return { companyId: first.id, companyMemberId: first.companyMemberId || undefined, membershipRole: first.membershipRole }
}

/**
 * PreHandler: resuelve empresa y membership (usa request.user de requireAuth).
 */
export async function requireCompanyContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user
  if (!user) {
    reply.code(401).send({ success: false, error: 'Token de autenticación requerido' })
    throw new Error('Unauthorized')
  }
  const resolved = await resolveCompanyId(user)
  if (!resolved) {
    reply.code(401).send({ success: false, error: NO_ACCESS_MSG })
    throw new Error('No company access')
  }
  request.companyId = resolved.companyId
  request.companyMemberId = resolved.companyMemberId
  request.membershipRole = resolved.membershipRole
}

/**
 * PreHandler para rutas Pos: requireAuth + requireCompanyContext + X-Store-Id.
 *
 * Security: store scope is DENY-BY-DEFAULT and SERVER-DERIVED — the optional
 * `X-Store-Id` header is never trusted on its own, and its ABSENCE must never disable
 * store isolation.
 * - OWNER/ADMIN/superuser (full access): X-Store-Id, if present, must belong to the
 *   company; if absent, no store restriction is applied (unchanged).
 * - USER (store-scoped): the effective store is grounded in the user's server-side
 *   `UserStore` memberships, never the client alone.
 *   - Header present -> must be one of the user's memberships (also implies it
 *     belongs to the company, since memberships are looked up within it) or 403.
 *   - Header absent + exactly one membership -> auto-derive that store.
 *   - Header absent + zero or 2+ memberships -> scope stays unresolved
 *     (`request.storeId = undefined`); every downstream store-scope check must then
 *     deny by default instead of treating "unresolved" as "unrestricted".
 */
export async function requirePosContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)

  const userId = request.user!.id
  const companyId = request.companyId!
  const membershipRole = request.membershipRole
  const isFullAccess =
    request.user!.isSuperuser ||
    membershipRole === 'OWNER' ||
    membershipRole === 'ADMIN'

  const rawStoreId = getStoreIdFromHeader(request)

  if (isFullAccess) {
    if (!rawStoreId) {
      request.storeId = undefined
      return
    }
    const store = await prisma.store.findFirst({
      where: { id: rawStoreId, companyId },
    })
    if (!store) {
      reply.code(403).send({
        success: false,
        error: 'No tienes acceso a esta tienda',
      })
      throw new Error('Store access denied')
    }
    request.storeId = rawStoreId
    return
  }

  // Store-scoped (non-full-access) user: resolve membership within THIS company only.
  const memberships = await prisma.userStore.findMany({
    where: { userId, store: { companyId } },
    select: { storeId: true },
  })
  const membershipStoreIds = new Set(memberships.map((m: { storeId: string }) => m.storeId))

  if (rawStoreId) {
    if (!membershipStoreIds.has(rawStoreId)) {
      reply.code(403).send({
        success: false,
        error: 'No tienes acceso a esta tienda',
      })
      throw new Error('Store access denied')
    }
    request.storeId = rawStoreId
    return
  }

  // No header: derive only when unambiguous. Never fail open on ambiguity.
  request.storeId = membershipStoreIds.size === 1 ? [...membershipStoreIds][0] : undefined
}

/**
 * PreHandler para rutas Hr/TechServices: requireAuth + requireCompanyContext.
 */
export async function requireHrContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)
}

function normalizeRequiredRoles(roles: string[]): MembershipRoleName[] {
  return roles.map((role) => role.toUpperCase()).filter((role): role is MembershipRoleName => (
    role === 'OWNER' || role === 'ADMIN' || role === 'USER'
  ))
}

/**
 * PreHandler factory for membership-role checks in resolved company context.
 * Requires requireAuth + requireCompanyContext to run before this guard.
 */
export function requireRole(roles: string[]) {
  const allowedRoles = new Set(normalizeRequiredRoles(roles))

  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user
    if (!user) {
      reply.code(401).send({ success: false, error: 'Token de autenticación requerido' })
      throw new Error('Unauthorized')
    }

    if (user.isSuperuser) return

    if (!request.companyId) {
      reply.code(401).send({ success: false, error: NO_ACCESS_MSG })
      throw new Error('No company access')
    }

    const membershipRole = (request.membershipRole ?? '').toUpperCase()
    if (!allowedRoles.has(membershipRole as MembershipRoleName)) {
      reply.code(403).send({ success: false, error: FORBIDDEN_MSG })
      throw new Error('Forbidden')
    }
  }
}

export function contextFromRequest(request: FastifyRequest, includeStoreId: true): PosContext
export function contextFromRequest(request: FastifyRequest, includeStoreId?: false): CompanyContext
export function contextFromRequest(
  request: FastifyRequest,
  includeStoreId = false
): CompanyContext | PosContext {
  const base: CompanyContext = {
    userId: request.user!.id,
    companyId: request.companyId!,
    isSuperuser: request.user!.isSuperuser ?? false,
    membershipRole: request.membershipRole ?? null,
  }
  return includeStoreId ? { ...base, storeId: request.storeId ?? undefined } : base
}
