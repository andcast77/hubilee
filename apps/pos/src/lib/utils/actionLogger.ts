import { logAction } from '@/lib/services/actionHistoryService'
import type { ActionType, EntityType } from '@/types'

/**
 * Helper function to log actions with automatic context extraction
 */
export async function logUserAction(
  userId: string,
  action: ActionType,
  entityType: EntityType,
  options?: {
    entityId?: string
    details?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  try {
    await logAction({
      userId,
      action,
      entityType,
      entityId: options?.entityId,
      details: options?.details,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })
  } catch (error) {
    // Don't fail the main operation if logging fails
    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error('Failed to log action:', error)
    }
  }
}

/**
 * Extract IP address and user agent from NextRequest
 */
export function extractRequestMetadata(request: Request): {
  ipAddress?: string
  userAgent?: string
} {
  const headers = request.headers
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    undefined
  const userAgent = headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}

