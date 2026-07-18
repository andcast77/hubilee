import { prisma } from '../db/index.js'
import type { ShopflowContext } from '../core/auth-context.js'
import { createRepositories } from '../repositories/index.js'
import { ForbiddenError, BadRequestError } from '../common/errors/app-error.js'
import { canManageMembers } from '../core/permissions.js'

const STORE_REQUIRED_MSG = 'Envia el parametro storeId (query/body) o el header X-Store-Id con el id del local de venta (usuario no administrador)'

export function hasFullStoreAccess(ctx: Pick<ShopflowContext, 'membershipRole' | 'isSuperuser'>): boolean {
  return ctx.isSuperuser || ctx.membershipRole === 'OWNER' || ctx.membershipRole === 'ADMIN'
}

export async function assertUserInCompany(companyId: string, userId: string, message: string): Promise<void> {
  const hasMembership = await createRepositories(companyId).companyMembers.existsUserMembership(userId)
  if (!hasMembership) {
    throw new ForbiddenError(message)
  }
}

export async function canAccessUserPreferences(
  callerId: string,
  callerIsSuperuser: boolean,
  companyId: string,
  callerMembershipRole: string | null,
  targetUserId: string
): Promise<boolean> {
  if (callerId === targetUserId || callerIsSuperuser) return true
  if (!canManageMembers({ membershipRole: callerMembershipRole ?? undefined, isSuperuser: callerIsSuperuser })) return false
  return createRepositories(companyId).companyMembers.existsUserMembership(targetUserId)
}

/**
 * Resolves the store a scoped (non-full-access) user is allowed to read, using
 * `ctx.storeId` as the single source of truth — it is already server-derived/validated
 * against `UserStore` membership by `requireShopflowContext`. Deny-by-default: a null
 * `ctx.storeId` (ambiguous or no membership) always denies, and a client-supplied
 * `candidateStoreId` (e.g. `?storeId=`) is only honored when it matches that resolved
 * store — it can never widen or override the server-derived scope.
 */
export async function resolveEffectiveStoreIdForScopedUser(
  ctx: ShopflowContext,
  candidateStoreId?: string | null
): Promise<string | undefined> {
  if (hasFullStoreAccess(ctx)) {
    return candidateStoreId ?? undefined
  }

  if (ctx.storeId == null) {
    throw new ForbiddenError(STORE_REQUIRED_MSG)
  }
  if (candidateStoreId != null && candidateStoreId !== ctx.storeId) {
    throw new ForbiddenError('Solo puedes consultar tu local de venta asignado')
  }
  return ctx.storeId
}

/**
 * Deny-by-default: a store-scoped (non-full-access) user is only allowed to operate on
 * `targetStoreId` when it matches their server-derived `ctx.storeId`. A null `ctx.storeId`
 * (ambiguous membership or none resolved) must ALWAYS deny here — it must never be
 * treated as "no restriction".
 */
export function assertStoreMatchForScopedUser(
  ctx: ShopflowContext,
  targetStoreId: string,
  message = 'Solo puedes operar en tu local de venta asignado'
): void {
  if (hasFullStoreAccess(ctx)) return
  if (ctx.storeId == null || targetStoreId !== ctx.storeId) {
    throw new ForbiddenError(message)
  }
}

export async function assertStoreBelongsToCompany(companyId: string, storeId: string): Promise<void> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, companyId },
    select: { id: true },
  })
  if (!store) {
    throw new BadRequestError('Local de venta no encontrado o no pertenece a la empresa')
  }
}
