import type { PrismaClient } from '@/db'

export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Unit of Work wrapping Prisma interactive transactions.
 * Guarantees all operations within a use-case share the same transaction
 * and automatic tenant scoping.
 */
export class UnitOfWork {
  constructor(
    private readonly db: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async execute<T>(fn: (tx: TransactionClient, tenantId: string) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => {
      return fn(tx, this.tenantId)
    })
  }
}
