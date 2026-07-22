import { apiClient, companiesApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '@/lib/validations/user'
import type { CreateCompanyMemberPayload } from '@/lib/validations/auth'
import {
  buildAttachFloorEmailPayload,
  buildResetFloorPasswordPayload,
} from '@/lib/floor-staff'

export type CompanyMemberRow = {
  id: string
  email: string | null
  name: string
  role: string
  active: boolean
  storeIds: string[]
  employeeCode?: string | null
}

/** Company members (usuarios de la empresa) - misma lista en Hr y Pos */
export async function getCompanyMembers(companyId: string) {
  const response = await companiesApi.getMembers<{ success: boolean; data: any[]; error?: string }>(companyId)
  if (!response.success) {
    throw new ApiError(500, (response as { error?: string }).error || 'Error al obtener usuarios', ErrorCodes.INTERNAL_ERROR)
  }
  const data = (response as { data: any[] }).data || []
  return {
    users: data.map((m): CompanyMemberRow => ({
      id: m.userId ?? m.id,
      email: m.email ?? null,
      name: m.name ?? m.email ?? 'Sin nombre',
      role: m.membershipRole ?? 'USER',
      active: true,
      storeIds: m.storeIds ?? [],
      employeeCode: m.employeeCode ?? null,
    })),
    pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 },
  }
}

export async function getCompanyCredentials(companyId: string) {
  const response = await companiesApi.getCredentials<{
    success: boolean
    data?: { companyId: string; companyCode: string }
    error?: string
  }>(companyId)
  if (!response.success || !response.data) {
    throw new ApiError(
      400,
      (response as { error?: string }).error || 'Error al obtener credenciales',
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return response.data
}

export async function createCompanyMember(companyId: string, data: CreateCompanyMemberPayload) {
  const response = await companiesApi.createMember<{ success: boolean; data: any; error?: string }>(companyId, data)
  if (!response.success) {
    throw new ApiError(400, (response as { error?: string }).error || 'Error al crear usuario', ErrorCodes.VALIDATION_ERROR)
  }
  return (response as { data: any }).data
}

export async function resetMemberPassword(companyId: string, userId: string, password: string) {
  const body = buildResetFloorPasswordPayload({ password })
  const response = await companiesApi.resetMemberPassword<{
    success: boolean
    data?: unknown
    error?: string
  }>(companyId, userId, body.password)
  if (!response.success) {
    throw new ApiError(
      400,
      (response as { error?: string }).error || 'Error al restablecer contraseña',
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return (response as { data?: unknown }).data
}

export async function attachMemberEmail(companyId: string, userId: string, email: string) {
  const body = buildAttachFloorEmailPayload({ email })
  const response = await companiesApi.attachMemberEmail<{
    success: boolean
    data?: unknown
    error?: string
  }>(companyId, userId, body.email)
  if (!response.success) {
    throw new ApiError(
      400,
      (response as { error?: string }).error || 'Error al asociar email',
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return (response as { data?: unknown }).data
}

export async function updateMemberStores(companyId: string, userId: string, storeIds: string[]) {
  const response = await companiesApi.updateMemberStores<{ success: boolean; data?: any; error?: string }>(
    companyId,
    userId,
    storeIds
  )
  if (!response.success) {
    throw new ApiError(400, (response as { error?: string }).error || 'Error al actualizar locales', ErrorCodes.VALIDATION_ERROR)
  }
  return (response as { data: any }).data
}

export async function getUsers(query: UserQueryInput = { page: 1, limit: 20 }) {
  const { search, role, active, page = 1, limit = 20 } = query

  const response = await apiClient.get<ApiResult<any[]>>('/v1/users')

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener usuarios', ErrorCodes.INTERNAL_ERROR)
  }

  let filtered = response.data
  if (search) {
    filtered = filtered.filter((u) => u.email?.includes(search))
  }
  if (role) {
    filtered = filtered.filter((u) => u.role === role)
  }
  if (active !== undefined) {
    filtered = filtered.filter((u) => u.active === active)
  }

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return {
    users: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUserById(id: string) {
  const response = await apiClient.get<{ success: boolean; data: any; error?: string }>(`/v1/users/${id}`)

  if (!response.success) {
    throw new ApiError(404, response.error || 'User not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

export async function createUser(data: CreateUserInput) {
  const response = await apiClient.post<{ success: boolean; data: any; error?: string }>('/v1/users', {
    email: data.email,
    password: data.password,
    name: data.name,
    role: data.role,
    active: data.active,
  })

  if (!response.success) {
    if (response.error?.includes('ya existe')) {
      throw new ApiError(400, 'User with this email already exists', ErrorCodes.VALIDATION_ERROR)
    }
    throw new ApiError(400, response.error || 'Error al crear usuario', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const updateData: any = {}
  if (data.email !== undefined) updateData.email = data.email
  if (data.password !== undefined) updateData.password = data.password
  if (data.name !== undefined) updateData.name = data.name
  if (data.role !== undefined) updateData.role = data.role
  if (data.active !== undefined) updateData.active = data.active

  const response = await apiClient.put<{ success: boolean; data: any; error?: string }>(
    `/v1/users/${id}`,
    updateData
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('ya existe')) {
      throw new ApiError(400, 'User with this email already exists', ErrorCodes.VALIDATION_ERROR)
    }
    throw new ApiError(400, response.error || 'Error al actualizar usuario', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function deleteUser(id: string) {
  const response = await apiClient.delete<{ success: boolean; data?: any; error?: string }>(`/v1/users/${id}`)

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('tiene ventas')) {
      throw new ApiError(
        400,
        'Cannot delete user with existing sales. Deactivate the user instead.',
        ErrorCodes.VALIDATION_ERROR
      )
    }
    throw new ApiError(400, response.error || 'Error al eliminar usuario', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data || { success: true }
}
