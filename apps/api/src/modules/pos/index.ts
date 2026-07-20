/**
 * Pos Module
 *
 * Handles: products, categories, suppliers, customers, stores,
 * sales, loyalty, inventory transfers, notifications, reports, export.
 * Requires pos module access via tenant context.
 */
export { registerRoutes } from '../../controllers/v1/pos/index.js'
export { ProductRepository } from '../../repositories/product.repository.js'
export { StoreRepository } from '../../repositories/store.repository.js'
export { CustomerRepository } from '../../repositories/customer.repository.js'
export { CategoryRepository } from '../../repositories/category.repository.js'
export { SupplierRepository } from '../../repositories/supplier.repository.js'
