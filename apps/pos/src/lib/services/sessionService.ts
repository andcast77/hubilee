import { authApi } from '@/lib/api/client'
import { UserRole } from '@/types'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { logUserAction, extractRequestMetadata } from '@/lib/utils/actionLogger'
import { ActionType, EntityType } from '@/types'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Check if a user is allowed to have concurrent sessions based on their role
 */
export function canHaveConcurrentSessions(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

/**
 * Create a new session for a user (delegates to API)
 */
export async function createSession(userId: string, sessionToken: string, request?: Request): Promise<void> {
  const { ipAddress, userAgent } = request ? extractRequestMetadata(request) : {}

  const response = await authApi.post<{ success: boolean; error?: string }>('/sessions', {
    userId,
    sessionToken,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
  })

  if (!response.success) {
    if (response.error?.includes('Concurrent') || response.error?.includes('concurrent')) {
      throw new ApiError(409, response.error, ErrorCodes.CONFLICT)
    }
    throw new ApiError(404, response.error || 'User not found', ErrorCodes.NOT_FOUND)
  }

  await logUserAction(userId, ActionType.LOGIN, EntityType.USER, {
    details: { sessionToken: sessionToken.substring(0, 8) + '...' },
    ipAddress,
    userAgent,
  })
}

/**
 * Validate a session token (via API)
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
  try {
    const response = await authApi.get<{ success: boolean; data?: { valid: boolean } }>(
      `/sessions/validate?token=${encodeURIComponent(sessionToken)}`
    )
    return response.success && response.data?.valid === true
  } catch {
    return false
  }
}

/**
 * Get active sessions for a user (via API)
 */
export async function getUserActiveSessions(userId: string) {
  const response = await authApi.get<{ success: boolean; data?: unknown[] }>(`/sessions?userId=${userId}`)
  if (!response.success || !response.data) return []
  return response.data
}

/**
 * Terminate a specific session (via API)
 */
export async function terminateSession(sessionToken: string, userId: string): Promise<void> {
  const response = await authApi.delete<{ success: boolean; error?: string }>(
    `/sessions/${encodeURIComponent(sessionToken)}?userId=${userId}`
  )

  if (!response.success) {
    if (response.error?.includes('not found')) {
      throw new ApiError(404, 'Session not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('denied') || response.error?.includes('Access')) {
      throw new ApiError(403, 'Access denied', ErrorCodes.FORBIDDEN)
    }
    throw new ApiError(500, response.error || 'Failed to terminate session', ErrorCodes.INTERNAL_ERROR)
  }

  await logUserAction(userId, ActionType.LOGOUT, EntityType.USER, {
    details: { sessionToken: sessionToken.substring(0, 8) + '...' },
  })
}

/**
 * Terminate all sessions for a user except the current one (via API)
 */
export async function terminateOtherSessions(userId: string, currentSessionToken: string): Promise<void> {
  await authApi.post<{ success: boolean }>('/sessions/terminate-others', {
    userId,
    currentSessionToken,
  })

  await logUserAction(userId, ActionType.UPDATE, EntityType.USER, {
    details: { action: 'terminate_other_sessions' },
  })
}

/**
 * Clean up expired sessions (server-side only; no-op in frontend)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const response = await authApi.post<{ success: boolean; data?: { count: number } }>(
      '/sessions/cleanup-expired'
    )
    return response.success && response.data ? response.data.count : 0
  } catch {
    return 0
  }
}

/**
 * Update user's concurrent session policy (via API)
 */
export async function updateConcurrentSessionPolicy(userId: string, allowConcurrent: boolean): Promise<void> {
  await authApi.put<{ success: boolean }>(`/users/${userId}/concurrent-sessions`, {
    allowConcurrentSessions: allowConcurrent,
  })

  await logUserAction(userId, ActionType.CONFIGURE, EntityType.USER, {
    details: { allowConcurrentSessions: allowConcurrent },
  })
}
