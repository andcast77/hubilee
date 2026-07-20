import bcrypt from 'bcryptjs'
import type { CreateUserBody, UpdateUserBody } from '../dto/users.dto.js'
import type { TokenPayload } from '../core/auth.js'
import { ForbiddenError, NotFoundError, BadRequestError } from '../common/errors/app-error.js'
import { createRepositories } from '../repositories/index.js'
import { assertCanManageMembers, assertCompanyAccess } from '../policies/company-authorization.policy.js'
import { assertUserInCompany } from '../policies/pos-authorization.policy.js'

function getCallerCompanyId(caller: TokenPayload): string {
  if (!caller.companyId) {
    throw new ForbiddenError('No tienes acceso a ninguna empresa')
  }
  return caller.companyId
}

export async function listUsers(caller: TokenPayload) {
  assertCanManageMembers(caller, 'Solo owners o admins pueden listar usuarios')
  const companyId = getCallerCompanyId(caller)
  assertCompanyAccess(caller, companyId, 'No tienes permiso para gestionar usuarios de otra empresa')

  return createRepositories(companyId).users.listActiveByCompany()
}

export async function getById(id: string, caller: TokenPayload) {
  const companyId = getCallerCompanyId(caller)
  assertCompanyAccess(caller, companyId, 'No tienes permiso para gestionar usuarios de otra empresa')
  await assertUserInCompany(companyId, id, 'No tienes permiso para gestionar usuarios de otra empresa')

  const user = await createRepositories(companyId).users.findById(id)
  if (!user) throw new NotFoundError('Usuario no encontrado')
  return user
}

export async function create(body: CreateUserBody, caller: TokenPayload) {
  const companyId = getCallerCompanyId(caller)
  assertCompanyAccess(caller, companyId, 'No tienes permiso para gestionar usuarios de otra empresa')

  const repos = createRepositories(companyId)
  const existing = await repos.users.findByEmail(body.email)
  if (existing) throw new BadRequestError('Ya existe un usuario con este email')

  const hashedPassword = await bcrypt.hash(body.password, 10)
  return repos.users.createWithCompanyMembership({
    email: body.email,
    password: hashedPassword,
    firstName: body.firstName ?? '',
    lastName: body.lastName ?? '',
    role: (body.role as 'USER' | 'ADMIN' | 'SUPERADMIN') ?? 'USER',
    isActive: body.isActive ?? true,
  })
}

export async function update(id: string, body: UpdateUserBody, caller: TokenPayload) {
  const companyId = getCallerCompanyId(caller)
  assertCompanyAccess(caller, companyId, 'No tienes permiso para gestionar usuarios de otra empresa')
  await assertUserInCompany(companyId, id, 'No tienes permiso para gestionar usuarios de otra empresa')

  const repos = createRepositories(companyId)
  const existing = await repos.users.findIdentityById(id)
  if (!existing) throw new NotFoundError('Usuario no encontrado')

  if (body.email && body.email !== existing.email) {
    const emailCheck = await repos.users.findByEmail(body.email)
    if (emailCheck) throw new BadRequestError('Ya existe un usuario con este email')
  }

  const updateData: Record<string, unknown> = {}
  if (body.email !== undefined) updateData.email = body.email
  if (body.password !== undefined) updateData.password = await bcrypt.hash(body.password, 10)
  if (body.firstName !== undefined) updateData.firstName = body.firstName
  if (body.lastName !== undefined) updateData.lastName = body.lastName
  if (body.role !== undefined) updateData.role = body.role
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  if (Object.keys(updateData).length === 0) {
    throw new BadRequestError('No hay campos para actualizar')
  }

  return repos.users.updateById(id, updateData)
}

export async function remove(id: string, caller: TokenPayload): Promise<void> {
  const companyId = getCallerCompanyId(caller)
  assertCompanyAccess(caller, companyId, 'No tienes permiso para gestionar usuarios de otra empresa')
  await assertUserInCompany(companyId, id, 'No tienes permiso para gestionar usuarios de otra empresa')

  const repos = createRepositories(companyId)
  const existing = await repos.users.findById(id)
  if (!existing) throw new NotFoundError('Usuario no encontrado')

  const salesCount = await repos.sales.countByUserId(id)
  if (salesCount > 0) {
    throw new BadRequestError('No se puede eliminar un usuario que tiene ventas. Desactive el usuario en su lugar.')
  }

  await repos.users.deleteById(id)
}
