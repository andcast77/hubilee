import { authApi } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { LoginInput } from '@/lib/validations/auth'

export async function login(credentials: LoginInput) {
  const response = await authApi.post<{
    success: boolean
    data?: {
      user: {
        id: string
        email: string
        name: string | null
        role: string
      }
      token: string
    }
    error?: string
  }>('/login', credentials)

  if (!response.success || !response.data) {
    throw new ApiError(401, response.error || 'Invalid credentials', ErrorCodes.UNAUTHORIZED)
  }

  return response.data
}

export async function getCurrentUser(token: string) {
  const response = await authApi.get<{
    success: boolean
    data?: {
      id: string
      email: string
      name: string | null
      role: string
      active: boolean
      createdAt: Date
      updatedAt: Date
    }
    error?: string
  }>('/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.success || !response.data) {
    throw new ApiError(404, response.error || 'User not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

