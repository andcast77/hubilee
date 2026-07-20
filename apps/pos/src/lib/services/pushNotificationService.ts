import { posApi } from '@/lib/api/client'
import type { NotificationPriority, NotificationType } from '@/types'

export interface PushNotificationPayload {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  actionUrl?: string
  data?: Record<string, unknown>
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Frontend must not send Web Push directly.
 * Push delivery is owned by backend serverless functions.
 */
export async function sendPushNotification(
  _subscription: PushSubscriptionInput,
  payload: PushNotificationPayload
): Promise<void> {
  await queuePushNotification({
    userIds: [],
    payload,
  })
}

/**
 * Send push notification to all user's subscriptions (via API for preferences/subscriptions)
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<number> {
  const sent = await queuePushNotification({ userIds: [userId], payload })
  return sent
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<number> {
  return queuePushNotification({ userIds, payload })
}

interface QueuePushPayload {
  userIds: string[]
  payload: PushNotificationPayload
}

async function queuePushNotification(input: QueuePushPayload): Promise<number> {
  const response = await posApi.post<{ success: boolean; data?: { queued?: number } }>(
    '/notifications/push/dispatch',
    input
  )

  if (!response.success) {
    return 0
  }

  return response.data?.queued ?? input.userIds.length
}
