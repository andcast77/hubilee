import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db/index.js'
import { cacheThrough, cacheDel } from '../common/cache/index.js'
import { ForbiddenError } from '../common/errors/app-error.js'

/** Keys de módulos conocidos (según seed) */
export const MODULE_KEYS = ['workify', 'shopflow', 'techservices', 'baro'] as const
export type ModuleKeys = (typeof MODULE_KEYS)[number]

/** Shape de módulos habilitados por empresa/miembro */
export type CompanyModulesShape = {
  workify: boolean
  shopflow: boolean
  techservices: boolean
  baro: boolean
}

const DEFAULT_MODULES: CompanyModulesShape = {
  workify: false,
  shopflow: false,
  techservices: false,
  baro: false,
}

const MODULE_CACHE_TTL = 300 // 5 minutes

/**
 * Obtiene los módulos habilitados para una empresa vía CompanyModule.
 * Results are cached in Redis for 5 minutes to avoid hitting the DB on every request.
 */
export async function getCompanyModules(
  companyId: string
): Promise<CompanyModulesShape> {
  return cacheThrough(
    `modules:${companyId}`,
    async () => {
      const companyModules = await prisma.companyModule.findMany({
        where: { companyId, enabled: true },
        include: { module: true },
      })

      const result = { ...DEFAULT_MODULES }
      for (const cm of companyModules) {
        const key = cm.module.key as ModuleKeys
        if (MODULE_KEYS.includes(key)) {
          result[key] = true
        }
      }
      return result
    },
    MODULE_CACHE_TTL,
  )
}

export async function invalidateModuleCache(companyId: string): Promise<void> {
  await cacheDel(`modules:${companyId}`)
}

/**
 * Obtiene módulos para múltiples empresas en una sola consulta (evita N+1).
 */
export async function getCompanyModulesForMany(
  companyIds: string[]
): Promise<Map<string, CompanyModulesShape>> {
  if (companyIds.length === 0) return new Map()

  const companyModules = await prisma.companyModule.findMany({
    where: { companyId: { in: companyIds }, enabled: true },
    include: { module: true },
  })

  const map = new Map<string, CompanyModulesShape>()
  for (const id of companyIds) {
    map.set(id, { ...DEFAULT_MODULES })
  }
  for (const cm of companyModules) {
    const key = cm.module.key as ModuleKeys
    if (MODULE_KEYS.includes(key)) {
      const shape = map.get(cm.companyId) ?? { ...DEFAULT_MODULES }
      shape[key] = true
      map.set(cm.companyId, shape)
    }
  }
  return map
}

/**
 * Obtiene los módulos habilitados para un miembro vía CompanyMemberModule.
 * Si no hay CompanyMemberModule para el miembro, usa los de la empresa.
 */
export async function getMemberModules(
  companyMemberId: string,
  companyId: string
): Promise<CompanyModulesShape> {
  const memberModules = await prisma.companyMemberModule.findMany({
    where: { companyMemberId, enabled: true },
    include: { module: true },
  })

  if (memberModules.length === 0) {
    return getCompanyModules(companyId)
  }

  const result = { ...DEFAULT_MODULES }
  for (const mm of memberModules) {
    const key = mm.module.key as ModuleKeys
    if (MODULE_KEYS.includes(key)) {
      result[key] = true
    }
  }
  return result
}

/**
 * Obtiene los IDs de módulos por keys (workify, shopflow, techservices).
 * Útil para evitar N consultas separadas.
 */
export async function findModulesByKeys(
  keys: string[]
): Promise<Map<string, { id: string }>> {
  if (keys.length === 0) return new Map()
  const modules = await prisma.module.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  })
  const map = new Map<string, { id: string }>()
  for (const m of modules) {
    map.set(m.key, { id: m.id })
  }
  return map
}

/**
 * Fastify preHandler factory that gates access based on module enablement.
 * Must run AFTER requireCompanyContext (which sets request.companyId and request.companyMemberId).
 *
 * When companyMemberId is present, enforces per-member module access (Nivel 2).
 * Falls back to company-level module check when no member context is available (e.g. superuser).
 *
 * Usage: `preHandler: [requireAuth, requireShopflowContext, requireModuleAccess('shopflow')]`
 */
export function requireModuleAccess(moduleKey: ModuleKeys) {
  return async function checkModuleAccess(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const companyId = (request as any).companyId as string | undefined
    if (!companyId) {
      throw new ForbiddenError('Company context is required to check module access')
    }

    if ((request as any).user?.isSuperuser) return

    const companyMemberId = (request as any).companyMemberId as string | undefined
    if (companyMemberId) {
      const allowed = await memberHasModule(companyMemberId, companyId, moduleKey)
      if (!allowed) {
        throw new ForbiddenError(`Module '${moduleKey}' is not enabled for this member`)
      }
      return
    }

    const modules = await getCompanyModules(companyId)
    if (!modules[moduleKey]) {
      throw new ForbiddenError(`Module '${moduleKey}' is not enabled for this company`)
    }
  }
}

/**
 * Comprueba si una empresa tiene habilitado un módulo por key.
 */
export async function companyHasModule(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const module = await prisma.module.findUnique({ where: { key: moduleKey } })
  if (!module) return false

  const cm = await prisma.companyModule.findUnique({
    where: { companyId_moduleId: { companyId, moduleId: module.id } },
  })
  return cm?.enabled ?? false
}

/**
 * Comprueba si un miembro tiene habilitado un módulo.
 * Si no tiene CompanyMemberModule para ese módulo, usa el de la empresa.
 */
export async function memberHasModule(
  companyMemberId: string,
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const module = await prisma.module.findUnique({ where: { key: moduleKey } })
  if (!module) return false

  const cmm = await prisma.companyMemberModule.findUnique({
    where: {
      companyMemberId_moduleId: { companyMemberId, moduleId: module.id },
    },
  })
  if (cmm !== null) return cmm.enabled

  return companyHasModule(companyId, moduleKey)
}
