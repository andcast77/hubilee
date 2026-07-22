import { authApi } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CodeLoginInput, LoginInput } from '@/lib/validations/auth'
import type { FloorLoginResponse, LoginResponse } from '@hubilee/contracts'

type AuthLoginEnvelope = {
  success: boolean
  data?: LoginResponse
  error?: string
}

export async function login(credentials: LoginInput) {
  const response = await authApi.post<AuthLoginEnvelope>('/login', {
    email: credentials.email,
    password: credentials.password,
  })

  if (!response.success || !response.data) {
    throw new ApiError(401, response.error || 'Invalid credentials', ErrorCodes.UNAUTHORIZED)
  }

  return response.data
}

/** POST /v1/auth/login with userCode (Pos must never call /floor-login). */
export async function codeLogin(credentials: CodeLoginInput): Promise<FloorLoginResponse> {
  const body: CodeLoginInput = {
    userCode: credentials.userCode.trim(),
    password: credentials.password,
  }
  if (credentials.captchaToken) {
    body.captchaToken = credentials.captchaToken
  }

  const response = await authApi.post<AuthLoginEnvelope>('/login', body)

  if (!response.success || !response.data) {
    throw new ApiError(401, response.error || 'Invalid credentials', ErrorCodes.UNAUTHORIZED)
  }

  return response.data
}

/** @deprecated Use codeLogin — kept for transitional call sites. */
export async function floorLogin(credentials: CodeLoginInput): Promise<FloorLoginResponse> {
  return codeLogin(credentials)
}

export async function getCurrentUser(token: string) {
  const response = await authApi.get<{
    success: boolean
    data?: {
      id: string
      email: string | null
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
