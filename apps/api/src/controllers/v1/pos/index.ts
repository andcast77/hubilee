import type { FastifyInstance } from 'fastify'
import { registerRoutes as products } from './products.controller.js'
import { registerRoutes as stores } from './stores.controller.js'
import { registerRoutes as storeConfig } from './store-config.controller.js'
import { registerRoutes as loyalty } from './loyalty.controller.js'
import { registerRoutes as customers } from './customers.controller.js'
import { registerRoutes as categories } from './categories.controller.js'
import { registerRoutes as suppliers } from './suppliers.controller.js'
import { registerRoutes as sales } from './sales.controller.js'
import { registerRoutes as reports } from './reports.controller.js'
import { registerRoutes as notifications } from './notifications.controller.js'
import { registerRoutes as actionHistory } from './action-history.controller.js'
import { registerRoutes as exportRoutes } from './export.controller.js'
import { registerRoutes as userPreferences } from './user-preferences.controller.js'
import { registerRoutes as pushSubscriptions } from './push-subscriptions.controller.js'
import { registerRoutes as inventoryTransfers } from './inventory-transfers.controller.js'
import { registerRoutes as cashRegisters } from './cash-registers.controller.js'
import { registerRoutes as cashSessions } from './cash-sessions.controller.js'

export async function registerRoutes(fastify: FastifyInstance) {
  products(fastify)
  stores(fastify)
  storeConfig(fastify)
  loyalty(fastify)
  customers(fastify)
  categories(fastify)
  suppliers(fastify)
  sales(fastify)
  reports(fastify)
  notifications(fastify)
  actionHistory(fastify)
  exportRoutes(fastify)
  userPreferences(fastify)
  pushSubscriptions(fastify)
  inventoryTransfers(fastify)
  cashRegisters(fastify)
  cashSessions(fastify)
}
