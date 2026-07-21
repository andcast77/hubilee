import type { PrismaClient } from '@/db'
import type { TransactionClient } from '../common/database/index.js'
import { prisma } from '../db/index.js'
import { ProductRepository } from './product.repository.js'
import { StoreRepository } from './store.repository.js'
import { CustomerRepository } from './customer.repository.js'
import { CategoryRepository } from './category.repository.js'
import { SupplierRepository } from './supplier.repository.js'
import { StoreInventoryRepository } from './store-inventory.repository.js'
import { UsersRepository } from './users.repository.js'
import { CompanyMemberRepository } from './company-member.repository.js'
import { SalesRepository } from './sales.repository.js'
import { LoyaltyRepository } from './loyalty.repository.js'
import { UserPreferencesRepository } from './user-preferences.repository.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'
import { InventoryTransferRepository } from './inventory-transfer.repository.js'
import { CashRepository } from './cash.repository.js'

export { ProductRepository, type ProductRow, type UnitRow, type ProductSearchQuery, type ProductCreateInput, type ProductUpdateInput } from './product.repository.js'
export { StoreRepository, type StoreRow, type StoreCreateInput } from './store.repository.js'
export { CustomerRepository, type CustomerRow } from './customer.repository.js'
export { CategoryRepository, type CategoryRow } from './category.repository.js'
export { SupplierRepository, type SupplierRow } from './supplier.repository.js'
export { StoreInventoryRepository, type StoreInventoryRow } from './store-inventory.repository.js'
export { UsersRepository, USER_SELECT, type UserRow } from './users.repository.js'
export { CompanyMemberRepository } from './company-member.repository.js'
export { SalesRepository } from './sales.repository.js'
export { LoyaltyRepository } from './loyalty.repository.js'
export { UserPreferencesRepository } from './user-preferences.repository.js'
export { PushSubscriptionRepository } from './push-subscription.repository.js'
export { InventoryTransferRepository } from './inventory-transfer.repository.js'
export {
  CashRepository,
  type CashRegisterRow,
  type CashRegisterCreateInput,
  type CashSessionRow,
  type CashSessionStatusValue,
  type OpenSessionInput,
  type UpdateSessionInput,
  type ListSessionsQuery,
} from './cash.repository.js'

export type Repositories = {
  products: ProductRepository
  stores: StoreRepository
  customers: CustomerRepository
  categories: CategoryRepository
  suppliers: SupplierRepository
  inventory: StoreInventoryRepository
  users: UsersRepository
  companyMembers: CompanyMemberRepository
  sales: SalesRepository
  loyalty: LoyaltyRepository
  userPreferences: UserPreferencesRepository
  pushSubscriptions: PushSubscriptionRepository
  inventoryTransfers: InventoryTransferRepository
  cash: CashRepository
}

/**
 * Create a full set of tenant-scoped repositories.
 * Use this in controllers/services after resolving the tenant context.
 * Pass a transaction client to share a single transaction across repos.
 */
export function createRepositories(tenantId: string, db?: PrismaClient | TransactionClient): Repositories {
  const client = db ?? prisma
  return {
    products: new ProductRepository(client, tenantId),
    stores: new StoreRepository(client, tenantId),
    customers: new CustomerRepository(client, tenantId),
    categories: new CategoryRepository(client, tenantId),
    suppliers: new SupplierRepository(client, tenantId),
    inventory: new StoreInventoryRepository(client, tenantId),
    users: new UsersRepository(client, tenantId),
    companyMembers: new CompanyMemberRepository(client, tenantId),
    sales: new SalesRepository(client, tenantId),
    loyalty: new LoyaltyRepository(client, tenantId),
    userPreferences: new UserPreferencesRepository(client, tenantId),
    pushSubscriptions: new PushSubscriptionRepository(client, tenantId),
    inventoryTransfers: new InventoryTransferRepository(client, tenantId),
    cash: new CashRepository(client, tenantId),
  }
}
