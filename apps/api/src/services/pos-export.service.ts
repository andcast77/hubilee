import { prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { BadRequestError } from '../common/errors/app-error.js'

const ALLOWED_TABLES = [
  'users', 'customers', 'products', 'categories', 'suppliers', 'sales', 'saleItems',
  'invoices', 'stores', 'storeConfig', 'ticketConfig', 'userPreferences', 'actionHistory',
  'notifications', 'notificationPreferences', 'loyaltyConfig', 'loyaltyPoints',
  'inventoryTransfers', 'pushSubscriptions',
] as const
type TableKey = (typeof ALLOWED_TABLES)[number]

async function getCompanyMemberUserIds(companyId: string): Promise<string[]> {
  const members = await prisma.companyMember.findMany({
    where: { companyId },
    select: { userId: true },
  })
  return members.map((m) => m.userId)
}

async function fetchTableData(table: TableKey, companyId: string): Promise<unknown[]> {
  const memberIds = await getCompanyMemberUserIds(companyId)
  switch (table) {
    case 'users':
      return memberIds.length ? await prisma.user.findMany({ where: { id: { in: memberIds } } }) : []
    case 'customers':
      return prisma.customer.findMany({ where: { companyId } })
    case 'products':
      return prisma.product.findMany({ where: { companyId } })
    case 'categories':
      return prisma.category.findMany({ where: { companyId } })
    case 'suppliers':
      return prisma.supplier.findMany({ where: { companyId } })
    case 'sales':
      return prisma.sale.findMany({ where: { companyId } })
    case 'saleItems':
      return prisma.saleItem.findMany({ where: { sale: { companyId } } })
    case 'invoices':
      return prisma.invoice.findMany({ where: { companyId } })
    case 'stores':
      return prisma.store.findMany({ where: { companyId } })
    case 'storeConfig':
      return prisma.storeConfig.findMany({ where: { companyId } })
    case 'ticketConfig':
      return prisma.ticketConfig.findMany({ where: { companyId } })
    case 'userPreferences':
      return prisma.userPreferences.findMany({ where: { companyId } })
    case 'actionHistory':
      return prisma.actionHistory.findMany({ where: { companyId } })
    case 'notifications':
      return prisma.notification.findMany({ where: { companyId } })
    case 'notificationPreferences':
      return memberIds.length ? await prisma.notificationPreference.findMany({ where: { userId: { in: memberIds } } }) : []
    case 'loyaltyConfig':
      return prisma.loyaltyConfig.findMany({ where: { companyId } })
    case 'loyaltyPoints':
      return prisma.loyaltyPoint.findMany({ where: { companyId } })
    case 'inventoryTransfers':
      return prisma.inventoryTransfer.findMany({ where: { companyId } })
    case 'pushSubscriptions':
      if (memberIds.length === 0) return []
      return prisma.pushSubscription.findMany({ where: { userId: { in: memberIds } } })
    default:
      return []
  }
}

export async function exportJson(ctx: CompanyContext): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {}
  for (const table of ALLOWED_TABLES) {
    try {
      data[table] = await fetchTableData(table, ctx.companyId)
    } catch {
      data[table] = []
    }
  }
  return data
}

export async function exportCsv(ctx: CompanyContext, tableParam: string | undefined): Promise<{ rows: unknown[]; headers: string[] }> {
  if (!tableParam || typeof tableParam !== 'string') {
    throw new BadRequestError('Query "table" es requerido')
  }
  const safeTable = tableParam.trim() as TableKey
  if (!ALLOWED_TABLES.includes(safeTable)) {
    throw new BadRequestError(`Tabla no permitida. Permitidas: ${ALLOWED_TABLES.join(', ')}`)
  }
  const rows = await fetchTableData(safeTable, ctx.companyId) as Record<string, unknown>[]
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return { rows, headers }
}
