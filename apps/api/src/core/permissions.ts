import type { FastifyRequest, FastifyReply } from 'fastify'
import type { TokenPayload } from './auth.js'
import { prisma } from '../db/index.js'
import { ForbiddenError } from '../common/errors/app-error.js'

export type DecodedUser = Pick<TokenPayload, 'id' | 'companyId' | 'isSuperuser' | 'membershipRole'>

/**
 * User can access the given company (is superuser or has companyId matching).
 */
export function canAccessCompany(decoded: DecodedUser, companyId: string): boolean {
  if (decoded.isSuperuser) return true
  return decoded.companyId === companyId
}

/**
 * User is owner of the current company context.
 */
export function isOwner(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER'
}

/**
 * User can manage company settings (owner or admin).
 */
export function canManageCompany(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
}

/**
 * User can manage company members (owner or admin).
 */
export function canManageMembers(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
}

/**
 * Checks whether a user has a specific permission in a company via:
 * 1. Direct UserPermission row
 * 2. UserRoleAssignment → RolePermission lookup
 *
 * Returns false (deny) if neither is found.
 */
export async function userHasPermission(
  userId: string,
  companyId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // 1. Direct permission override
  const direct = await prisma.userPermission.findFirst({
    where: {
      userId,
      companyId,
      permission: { resource, action },
    },
    select: { id: true },
  })
  if (direct) return true

  // 2. Via role assignments in the same company
  const roleAssignments = await prisma.userRoleAssignment.findMany({
    where: { userId, companyId },
    select: {
      role: {
        select: {
          permissions: {
            where: { permission: { resource, action } },
            select: { id: true },
          },
        },
      },
    },
  })

  return roleAssignments.some((ra) => ra.role.permissions.length > 0)
}

/**
 * Fastify preHandler factory that enforces Nivel 3 permission checks.
 * Must run AFTER requireAuth + requireCompanyContext.
 *
 * Bypass rules:
 * - Superusers always pass.
 * - OWNER and ADMIN membership roles always pass (they have full company access by design).
 * - All other roles (USER) are subject to deny-by-default: must have an explicit
 *   UserPermission or UserRoleAssignment→RolePermission for the given resource+action.
 *
 * Usage: `preHandler: [...pre, requirePermission('pos.sales', 'create')]`
 */
/** Minimal shape needed to evaluate a permission outside of a Fastify request (e.g. from a service). */
export type PermissionContext = {
  userId: string
  companyId: string
  isSuperuser: boolean
  membershipRole: string | null
}

/**
 * Service-level equivalent of `requirePermission`'s bypass + deny-by-default logic, for call
 * sites that need to enforce an ADDITIONAL permission mid-service (not just at the route's
 * preHandler) — e.g. a route gated on `resource:create` that must also require `resource:settle`
 * only when a specific condition in the body is met. Throws ForbiddenError when denied.
 */
export async function assertPermission(
  ctx: PermissionContext,
  resource: string,
  action: string,
  message?: string,
): Promise<void> {
  if (ctx.isSuperuser) return

  const membershipRole = (ctx.membershipRole ?? '').toUpperCase()
  if (membershipRole === 'OWNER' || membershipRole === 'ADMIN') return

  const allowed = await userHasPermission(ctx.userId, ctx.companyId, resource, action)
  if (!allowed) {
    throw new ForbiddenError(message ?? `Permission denied: ${resource}:${action}`)
  }
}

export function requirePermission(resource: string, action: string) {
  return async function checkPermission(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const user = (request as any).user
    if (!user) throw new ForbiddenError('Authentication required')

    if (user.isSuperuser) return

    const membershipRole = ((request as any).membershipRole ?? '').toUpperCase()
    if (membershipRole === 'OWNER' || membershipRole === 'ADMIN') return

    const companyId = (request as any).companyId as string | undefined
    if (!companyId) throw new ForbiddenError('Company context is required')

    const allowed = await userHasPermission(user.id, companyId, resource, action)
    if (!allowed) {
      throw new ForbiddenError(`Permission denied: ${resource}:${action}`)
    }
  }
}
