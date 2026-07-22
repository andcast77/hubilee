import { prisma } from '../db/index.js'
import { createRepositories } from '../repositories/index.js'
import type { PosContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError, ConflictError } from '../common/errors/index.js'
import { toNumber } from '../common/database/index.js'
import {
  assertStoreBelongsToCompany,
  assertStoreMatchForScopedUser,
  resolveEffectiveStoreIdForScopedUser,
} from '../policies/pos-authorization.policy.js'
import type { CashRegisterRow, CashSessionRow, CashSessionStatusValue } from '../repositories/cash.repository.js'

const num = toNumber

export type CreateCashRegisterInput = {
  storeId: string
  name: string
}

export type ListCashRegistersQuery = {
  storeId?: string
}

export type OpenCashSessionInput = {
  cashRegisterId: string
  openingFloat: number
  notes?: string | null
}

export type CloseCashSessionInput = {
  countedCash: number
  notes?: string | null
}

export type ListCashSessionsQuery = {
  storeId?: string
  cashRegisterId?: string
  status?: CashSessionStatusValue
}

export type PaymentBreakdownRow = {
  paymentMethod: string
  count: number
  total: number
}

export type CashSessionReport = {
  session: CashSessionRow
  salesCount: number
  paymentBreakdown: PaymentBreakdownRow[]
  openingFloat: number
  cashSalesTotal: number
  expectedCash: number
  countedCash: number | null
  difference: number | null
}

/** Only sales that have actually settled money are counted toward the arqueo. */
const SETTLED_SALE_STATUS = 'COMPLETED' as const

export async function createCashRegister(ctx: PosContext, input: CreateCashRegisterInput): Promise<CashRegisterRow> {
  await assertStoreBelongsToCompany(ctx.companyId, input.storeId)
  assertStoreMatchForScopedUser(ctx, input.storeId, 'Solo puedes crear cajas en tu local de venta asignado')

  const cash = createRepositories(ctx.companyId).cash
  return cash.createRegister({ storeId: input.storeId, name: input.name })
}

export async function listCashRegisters(ctx: PosContext, query: ListCashRegistersQuery): Promise<CashRegisterRow[]> {
  const effectiveStoreId = await resolveEffectiveStoreIdForScopedUser(ctx, query.storeId)
  const cash = createRepositories(ctx.companyId).cash
  return cash.listRegisters({ storeId: effectiveStoreId })
}

export async function openCashSession(ctx: PosContext, input: OpenCashSessionInput): Promise<CashSessionRow> {
  const cash = createRepositories(ctx.companyId).cash

  const register = await cash.findRegisterById(input.cashRegisterId)
  if (!register) throw new NotFoundError('Caja no encontrada')

  assertStoreMatchForScopedUser(ctx, register.storeId, 'Solo puedes abrir sesiones de caja en tu local de venta asignado')

  // One cashier ↔ one OPEN caja (DB unique `cash_sessions_one_open_opened_by` backs the race).
  const existingOpen = await cash.findOpenSessionByUser(ctx.userId)
  if (existingOpen) {
    throw new ConflictError(
      'Ya tienes una sesión de caja abierta. Ciérrala antes de abrir otra.',
      'CASH_SESSION_OPEN',
    )
  }

  return cash.openSession({
    storeId: register.storeId,
    cashRegisterId: register.id,
    openedByUserId: ctx.userId,
    openingFloat: input.openingFloat,
    notes: input.notes ?? null,
  })
}

export async function closeCashSession(
  ctx: PosContext,
  id: string,
  input: CloseCashSessionInput,
): Promise<CashSessionRow> {
  const cash = createRepositories(ctx.companyId).cash

  const session = await cash.findSessionById(id)
  if (!session) throw new NotFoundError('Sesión de caja no encontrada')
  if (session.status !== 'OPEN') throw new BadRequestError('La sesión de caja ya está cerrada')

  assertStoreMatchForScopedUser(ctx, session.storeId, 'Solo puedes cerrar sesiones de caja en tu local de venta asignado')

  const cashSalesTotal = await sumCashSales(ctx.companyId, session.id)
  const openingFloat = num(session.openingFloat)
  const expectedCash = openingFloat + cashSalesTotal
  const difference = input.countedCash - expectedCash

  const updated = await cash.updateSession(session.id, {
    status: 'CLOSED',
    closedByUserId: ctx.userId,
    countedCash: input.countedCash,
    expectedCash,
    difference,
    closedAt: new Date(),
    notes: input.notes ?? session.notes,
  })
  if (!updated) throw new NotFoundError('Sesión de caja no encontrada')
  return updated
}

export async function listCashSessions(ctx: PosContext, query: ListCashSessionsQuery): Promise<CashSessionRow[]> {
  const effectiveStoreId = await resolveEffectiveStoreIdForScopedUser(ctx, query.storeId)
  const cash = createRepositories(ctx.companyId).cash
  return cash.listSessions({
    storeId: effectiveStoreId,
    cashRegisterId: query.cashRegisterId,
    status: query.status,
  })
}

export async function getCashSessionReport(ctx: PosContext, id: string): Promise<CashSessionReport> {
  const cash = createRepositories(ctx.companyId).cash

  const session = await cash.findSessionById(id)
  if (!session) throw new NotFoundError('Sesión de caja no encontrada')

  assertStoreMatchForScopedUser(ctx, session.storeId, 'Solo puedes ver el reporte de caja de tu local de venta asignado')

  const breakdown = await prisma.sale.groupBy({
    by: ['paymentMethod'],
    where: { companyId: ctx.companyId, cashSessionId: session.id, status: SETTLED_SALE_STATUS },
    _sum: { total: true },
    _count: { _all: true },
  })

  const paymentBreakdown: PaymentBreakdownRow[] = breakdown
    .filter((row) => row.paymentMethod != null)
    .map((row) => ({
      paymentMethod: row.paymentMethod as string,
      count: row._count._all,
      total: num(row._sum.total ?? 0),
    }))

  const cashSalesTotal = paymentBreakdown.find((row) => row.paymentMethod === 'CASH')?.total ?? 0
  const openingFloat = num(session.openingFloat)
  const expectedCash =
    session.status === 'CLOSED' && session.expectedCash != null ? num(session.expectedCash) : openingFloat + cashSalesTotal

  return {
    session,
    salesCount: paymentBreakdown.reduce((acc, row) => acc + row.count, 0),
    paymentBreakdown,
    openingFloat,
    cashSalesTotal,
    expectedCash,
    countedCash: session.countedCash != null ? num(session.countedCash) : null,
    difference: session.difference != null ? num(session.difference) : null,
  }
}

async function sumCashSales(companyId: string, cashSessionId: string): Promise<number> {
  const result = await prisma.sale.aggregate({
    where: { companyId, cashSessionId, paymentMethod: 'CASH', status: SETTLED_SALE_STATUS },
    _sum: { total: true },
  })
  return num(result._sum.total ?? 0)
}
