import { Prisma } from '../db/index.js'
import { TenantScopedRepository } from '../common/database/index.js'
import { ConflictError } from '../common/errors/index.js'

/**
 * Column covered by the partial unique index enforcing "at most one OPEN
 * CashSession per CashRegister" (see migration 20260717210424_add_cash_register_cash_session,
 * index `cash_sessions_one_open_register`). Not expressible in the Prisma schema —
 * hand-edited into the migration SQL. With the pg driver adapter, Prisma 7 surfaces the
 * violated constraint name/columns nested under `error.meta.driverAdapterError.cause`
 * (not the flat `error.meta.target` used by the non-adapter engine), so we scan the
 * whole serialized `meta` for the index name or the covered column.
 */
const ONE_OPEN_SESSION_PER_REGISTER_INDEX = 'cash_sessions_one_open_register'
const ONE_OPEN_SESSION_PER_REGISTER_COLUMN = 'cashRegisterId'

export type CashRegisterRow = {
  id: string
  companyId: string
  storeId: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type CashRegisterCreateInput = {
  storeId: string
  name: string
}

export type CashSessionStatusValue = 'OPEN' | 'CLOSED'

export type CashSessionRow = {
  id: string
  companyId: string
  storeId: string
  cashRegisterId: string
  openedByUserId: string
  closedByUserId: string | null
  status: CashSessionStatusValue
  openingFloat: Prisma.Decimal
  expectedCash: Prisma.Decimal | null
  countedCash: Prisma.Decimal | null
  difference: Prisma.Decimal | null
  notes: string | null
  openedAt: Date
  closedAt: Date | null
}

export type OpenSessionInput = {
  storeId: string
  cashRegisterId: string
  openedByUserId: string
  openingFloat: number
  notes?: string | null
}

export type UpdateSessionInput = {
  status?: CashSessionStatusValue
  closedByUserId?: string | null
  countedCash?: number | null
  expectedCash?: number | null
  difference?: number | null
  closedAt?: Date | null
  notes?: string | null
}

export type ListSessionsQuery = {
  storeId?: string
  cashRegisterId?: string
  status?: CashSessionStatusValue
}

export class CashRepository extends TenantScopedRepository {
  // ---- CashRegister ----

  async createRegister(input: CashRegisterCreateInput): Promise<CashRegisterRow> {
    return this.db.cashRegister.create({
      data: {
        companyId: this.tenantId,
        storeId: input.storeId,
        name: input.name,
      },
    }) as Promise<CashRegisterRow>
  }

  async findRegisterById(id: string): Promise<CashRegisterRow | null> {
    return this.db.cashRegister.findFirst({
      where: { ...this.tenantWhere, id },
    }) as Promise<CashRegisterRow | null>
  }

  async listRegisters(opts?: { storeId?: string; includeInactive?: boolean }): Promise<CashRegisterRow[]> {
    const activeFilter = opts?.includeInactive ? {} : { active: true }
    return this.db.cashRegister.findMany({
      where: {
        ...this.tenantWhere,
        ...(opts?.storeId ? { storeId: opts.storeId } : {}),
        ...activeFilter,
      },
      orderBy: { name: 'asc' },
    }) as Promise<CashRegisterRow[]>
  }

  async updateRegister(
    id: string,
    input: Partial<CashRegisterCreateInput & { active: boolean }>,
  ): Promise<CashRegisterRow | null> {
    const existing = await this.db.cashRegister.findFirst({
      where: { ...this.tenantWhere, id },
      select: { id: true },
    })
    if (!existing) return null
    const updated = await this.db.cashRegister.updateMany({
      where: { ...this.tenantWhere, id },
      data: input,
    })
    if (updated.count === 0) return null
    return this.db.cashRegister.findFirst({ where: { ...this.tenantWhere, id } }) as Promise<CashRegisterRow | null>
  }

  // ---- CashSession ----

  /**
   * Opens (creates) a CashSession. Rejects with ConflictError if the target
   * register already has an OPEN session (enforced by the DB partial unique index).
   */
  async openSession(input: OpenSessionInput): Promise<CashSessionRow> {
    try {
      return (await this.db.cashSession.create({
        data: {
          companyId: this.tenantId,
          storeId: input.storeId,
          cashRegisterId: input.cashRegisterId,
          openedByUserId: input.openedByUserId,
          openingFloat: input.openingFloat,
          notes: input.notes ?? null,
        },
      })) as CashSessionRow
    } catch (err) {
      if (isOneOpenSessionViolation(err)) {
        throw new ConflictError('El registro de caja ya tiene una sesión abierta')
      }
      throw err
    }
  }

  async findSessionById(id: string): Promise<CashSessionRow | null> {
    return this.db.cashSession.findFirst({
      where: { ...this.tenantWhere, id },
    }) as Promise<CashSessionRow | null>
  }

  async findOpenSessionByRegister(cashRegisterId: string): Promise<CashSessionRow | null> {
    return this.db.cashSession.findFirst({
      where: { ...this.tenantWhere, cashRegisterId, status: 'OPEN' },
    }) as Promise<CashSessionRow | null>
  }

  async findOpenSessionsByStore(storeId: string): Promise<CashSessionRow[]> {
    return this.db.cashSession.findMany({
      where: { ...this.tenantWhere, storeId, status: 'OPEN' },
    }) as Promise<CashSessionRow[]>
  }

  async listSessions(opts?: ListSessionsQuery): Promise<CashSessionRow[]> {
    return this.db.cashSession.findMany({
      where: {
        ...this.tenantWhere,
        ...(opts?.storeId ? { storeId: opts.storeId } : {}),
        ...(opts?.cashRegisterId ? { cashRegisterId: opts.cashRegisterId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
      },
      orderBy: { openedAt: 'desc' },
    }) as Promise<CashSessionRow[]>
  }

  /**
   * The only current caller (`closeCashSession`) transitions OPEN -> CLOSED. Guarding the
   * `updateMany` where-clause on `status: 'OPEN'` closes a race where two concurrent close
   * requests both read the session while it was still OPEN: without this guard, both writes
   * would land and the second would silently overwrite the first's arqueo (expectedCash/
   * countedCash/difference). With the guard, the loser's write matches 0 rows and throws
   * ConflictError instead of corrupting the persisted arqueo.
   */
  async updateSession(id: string, input: UpdateSessionInput): Promise<CashSessionRow | null> {
    const existing = await this.db.cashSession.findFirst({
      where: { ...this.tenantWhere, id },
      select: { id: true },
    })
    if (!existing) return null
    const updated = await this.db.cashSession.updateMany({
      where: { ...this.tenantWhere, id, status: 'OPEN' },
      data: input,
    })
    if (updated.count === 0) {
      throw new ConflictError('La sesión de caja ya fue cerrada')
    }
    return this.db.cashSession.findFirst({ where: { ...this.tenantWhere, id } }) as Promise<CashSessionRow | null>
  }
}

function isOneOpenSessionViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (err.code !== 'P2002') return false
  const metaStr = JSON.stringify(err.meta ?? {})
  return metaStr.includes(ONE_OPEN_SESSION_PER_REGISTER_INDEX) || metaStr.includes(ONE_OPEN_SESSION_PER_REGISTER_COLUMN)
}
