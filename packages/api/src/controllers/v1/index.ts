import type { FastifyInstance } from 'fastify'
import * as auth from './auth.controller.js'
import * as users from './users.controller.js'
import * as account from './account.controller.js'
import * as companies from './companies.controller.js'
import * as companyMembers from './company-members.controller.js'
import * as memberRbac from './member-rbac.controller.js'
import * as shopflow from './shopflow/index.js'
import * as workify from './workify.controller.js'
import * as techservices from './techservices.controller.js'
import * as baro from './baro.controller.js'
import * as events from './events.controller.js'
import * as auditLog from './audit-log.controller.js'
import * as jobs from './jobs.controller.js'
import * as internalCron from './internal-cron.controller.js'

/**
 * Registers all v1 HTTP routes except public auth (login/register/verify),
 * which stay under the stricter rate-limit scope in `rate-limit.plugin.ts`.
 */
export async function registerV1(fastify: FastifyInstance) {
  await internalCron.registerRoutes(fastify)
  await auth.registerProtectedAuthRoutes(fastify)
  await users.registerRoutes(fastify)
  await account.registerRoutes(fastify)
  await companies.registerRoutes(fastify)
  await companyMembers.registerRoutes(fastify)
  await memberRbac.registerRoutes(fastify)
  await shopflow.registerRoutes(fastify)
  await workify.registerRoutes(fastify)
  await techservices.registerRoutes(fastify)
  await baro.registerRoutes(fastify)
  await events.registerRoutes(fastify)
  await auditLog.registerRoutes(fastify)
  await jobs.registerRoutes(fastify)
}
