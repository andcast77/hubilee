import { prisma } from '../db/index.js'
import { findModulesByKeys, getCompanyModules } from '../core/modules.js'
import type { TokenPayload } from '../core/auth.js'
import type { UpdateCompanyBody } from '../dto/companies.dto.js'
import { ForbiddenError, NotFoundError } from '../common/errors/app-error.js'
import {
  assertCanManageCompany,
  assertCanManageMembers,
  assertCompanyAccess,
  assertOwner,
} from '../policies/company-authorization.policy.js'

export async function getById(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { owner: true },
  })
  if (!company) throw new NotFoundError('Empresa no encontrada')
  return company
}

/** Owner/admin: company metadata. Staff login uses User.userCode (not companyCode). */
export async function getCredentials(companyId: string, caller: TokenPayload) {
  assertCompanyAccess(caller, companyId)
  assertCanManageMembers(caller, 'Solo el owner o un admin pueden ver las credenciales de piso')
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, companyCode: true },
  })
  if (!company) throw new NotFoundError('Empresa no encontrada')
  return { companyId: company.id, companyCode: company.companyCode }
}

export async function getStats(companyId: string) {
  const [totalMembers, ownerCount, adminCount, userCount, lastMember] = await Promise.all([
    prisma.companyMember.count({ where: { companyId } }),
    prisma.companyMember.count({ where: { companyId, membershipRole: 'OWNER' } }),
    prisma.companyMember.count({ where: { companyId, membershipRole: 'ADMIN' } }),
    prisma.companyMember.count({ where: { companyId, membershipRole: 'USER' } }),
    prisma.companyMember.findFirst({
      where: { companyId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { totalMembers, ownerCount, adminCount, userCount, lastMember }
}

export async function update(companyId: string, caller: TokenPayload, body: UpdateCompanyBody) {
  assertCompanyAccess(caller, companyId)
  if (body.hrEnabled !== undefined || body.posEnabled !== undefined || body.technicalServicesEnabled !== undefined) {
    assertOwner(caller, 'Solo el propietario puede activar/desactivar módulos')
  }
  assertCanManageCompany(caller)

  const companyUpdate: Record<string, unknown> = {}
  if (body.name !== undefined) companyUpdate.name = body.name
  if (body.logo !== undefined) companyUpdate.logo = body.logo
  if (body.taxId !== undefined) companyUpdate.taxId = body.taxId
  if (body.address !== undefined) companyUpdate.address = body.address
  if (body.phone !== undefined) companyUpdate.phone = body.phone
  if (body.businessType !== undefined) companyUpdate.businessType = body.businessType

  if (Object.keys(companyUpdate).length > 0) {
    await prisma.company.update({ where: { id: companyId }, data: companyUpdate })
  }

  if (
    body.hrEnabled !== undefined ||
    body.posEnabled !== undefined ||
    body.technicalServicesEnabled !== undefined
  ) {
    const modulesMap = await findModulesByKeys(['hr', 'pos', 'tech'])
    const hrMod = modulesMap.get('hr')
    const posMod = modulesMap.get('pos')
    const techMod = modulesMap.get('tech')
    const updates: { moduleId: string; enabled: boolean }[] = []
    if (body.hrEnabled !== undefined && hrMod) updates.push({ moduleId: hrMod.id, enabled: body.hrEnabled })
    if (body.posEnabled !== undefined && posMod) updates.push({ moduleId: posMod.id, enabled: body.posEnabled })
    if (body.technicalServicesEnabled !== undefined && techMod) updates.push({ moduleId: techMod.id, enabled: body.technicalServicesEnabled })
    for (const { moduleId, enabled } of updates) {
      await prisma.companyModule.upsert({
        where: { companyId_moduleId: { companyId, moduleId } },
        create: { companyId, moduleId, enabled },
        update: { enabled },
      })
    }
  }

  const updated = await prisma.company.findUnique({ where: { id: companyId } })
  if (!updated) throw new NotFoundError('Empresa no encontrada')
  const modules = await getCompanyModules(updated.id)
  return { id: updated.id, name: updated.name, updatedAt: updated.updatedAt, modules }
}

export async function remove(companyId: string, caller: TokenPayload): Promise<void> {
  assertCompanyAccess(caller, companyId)
  assertOwner(caller, 'Solo el propietario puede eliminar la empresa')
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })
  if (!company) throw new NotFoundError('Empresa no encontrada')
  await prisma.company.delete({ where: { id: companyId } })
}
