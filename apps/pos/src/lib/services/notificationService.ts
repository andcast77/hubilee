import { posApi } from '@/lib/api/client'
import {
  NotificationType,
  type NotificationPriority,
  type NotificationStatus,
  type Notification,
  type NotificationPreference
} from '@/types'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  data?: Record<string, unknown>
  actionUrl?: string
  expiresAt?: Date
}

export interface NotificationQuery {
  userId?: string
  type?: NotificationType
  status?: NotificationStatus
  priority?: NotificationPriority
  page?: number
  limit?: number
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const response = await posApi.post<{
    success: boolean
    data?: Notification
    error?: string
  }>('/notifications', {
    userId: input.userId,
    type: input.type,
    priority: input.priority || 'MEDIUM',
    title: input.title,
    message: input.message,
    data: input.data,
    actionUrl: input.actionUrl,
    expiresAt: input.expiresAt?.toISOString(),
  })

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al crear notificación')
  }

  return response.data
}

/**
 * Send notification based on user preferences
 */
export async function sendNotification(input: CreateNotificationInput): Promise<Notification | null> {
  // Check user preferences
  const preferences = await getUserNotificationPreferences(input.userId)

  // Check if in-app notifications are enabled for this type
  const shouldSendInApp = checkNotificationPreference(preferences, input.type, 'inApp')

  if (!shouldSendInApp) {
    return null
  }

  // Create in-app notification
  const notification = await createNotification(input)

  return notification
}

/**
 * Get notifications with filters
 */
export async function getNotifications(query: NotificationQuery = {}) {
  const {
    userId,
    type,
    status,
    priority,
    page = 1,
    limit = 20,
  } = query

  const params = new URLSearchParams()
  if (userId) params.append('userId', userId)
  if (type) params.append('type', type)
  if (status) params.append('status', status)
  if (priority) params.append('priority', priority)
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  const response = await posApi.get<{
    success: boolean
    data?: {
      notifications: Notification[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
    error?: string
  }>(`/notifications?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener notificaciones')
  }

  return response.data
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  query: Omit<NotificationQuery, 'userId'> = {}
) {
  return getNotifications({ ...query, userId })
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const response = await posApi.put<{
    success: boolean
    error?: string
  }>(`/notifications/${notificationId}/read`, { userId })

  if (!response.success) {
    throw new ApiError(404, response.error || 'Notification not found', ErrorCodes.NOT_FOUND)
  }
}

/**
 * Mark all notifications as read for the user.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const response = await posApi.put<{
    success: boolean
    data?: { count: number }
    error?: string
  }>('/notifications/read-all', { userId })

  if (!response.success) {
    throw new ApiError(400, response.error || 'No se pudieron marcar las notificaciones', ErrorCodes.NOT_FOUND)
  }
}

/**
 * Archive notification (delete for now, can be extended later)
 */
export async function archiveNotification(notificationId: string, userId: string): Promise<void> {
  const response = await posApi.delete<{
    success: boolean
    error?: string
  }>(`/notifications/${notificationId}`, { userId })

  if (!response.success) {
    throw new ApiError(404, response.error || 'Notification not found', ErrorCodes.NOT_FOUND)
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreference> {
  const response = await posApi.get<{
    success: boolean
    data?: NotificationPreference
    error?: string
  }>(`/notifications/preferences/${userId}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener preferencias de notificaciones')
  }

  return response.data
}

/**
 * Update user notification preferences
 * Note: This endpoint may need to be added to the API later
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: {
    inAppEnabled?: boolean
    pushEnabled?: boolean
    emailEnabled?: boolean
    preferences?: Record<string, { inApp?: boolean; push?: boolean; email?: boolean }>
  }
): Promise<NotificationPreference> {
  const response = await posApi.put<{
    success: boolean
    data?: NotificationPreference
    error?: string
  }>(`/users/${userId}/notification-preferences`, updates)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al actualizar preferencias')
  }

  return response.data
}

/**
 * Check if notification should be sent based on preferences
 */
function preferenceTypeKey(type: NotificationType): string {
  return String(type)
}

function checkNotificationPreference(
  preferences: NotificationPreference,
  type: NotificationType,
  channel: 'email' | 'inApp' | 'push'
): boolean {
  const channelEnabled = preferences[`${channel}Enabled` as keyof NotificationPreference] as boolean
  if (!channelEnabled) {
    return false
  }

  const slug = preferenceTypeKey(type)
  const perType = preferences.preferences?.[slug]
  const ch = channel === 'inApp' ? 'inApp' : channel
  if (perType && perType[ch] === false) return false
  if (perType && perType[ch] === true) return true

  const typeKey = getNotificationTypeKey(type)
  const legacy = preferences[`${channel}${typeKey}` as keyof NotificationPreference] as boolean | undefined
  if (legacy === false) return false
  return true
}

/**
 * Convert notification type to preference key
 */
function getNotificationTypeKey(type: NotificationType): string {
  const typeMap: Partial<Record<NotificationType, string>> = {
    [NotificationType.LOW_STOCK]: 'LowStock',
    [NotificationType.LOW_STOCK_ALERT]: 'LowStock',
    [NotificationType.IMPORTANT_SALE]: 'ImportantSales',
    [NotificationType.PENDING_TASK]: 'PendingTasks',
    [NotificationType.SYSTEM]: 'PendingTasks',
    [NotificationType.SYSTEM_MAINTENANCE]: 'SecurityAlerts',
    [NotificationType.SECURITY_ALERT]: 'SecurityAlerts',
    [NotificationType.SECURITY]: 'SecurityAlerts',
    [NotificationType.COLLAB]: 'SecurityAlerts',
    [NotificationType.CUSTOM]: 'SecurityAlerts',
  }

  return typeMap[type] || 'SecurityAlerts'
}

/**
 * Clean up expired notifications
 * Note: This may need a dedicated endpoint in the API
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  // This functionality may need a dedicated endpoint
  // For now, return 0 as it's typically a background job
  return 0
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const response = await posApi.get<{
    success: boolean
    data?: { count: number }
    error?: string
  }>(`/notifications/unread-count?userId=${userId}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener contador de no leídas')
  }

  return response.data.count
}

// Re-export check functions for convenience
export { checkLowStockAlerts } from './lowStockAlertService'
export { checkImportantSaleAlerts } from './importantSaleAlertService'
export { checkPendingTasks } from './pendingTaskService'
