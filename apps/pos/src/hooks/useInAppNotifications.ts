import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getInAppNotificationMeta } from '@hubilee/ui'
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllNotificationsRead,
} from '@/lib/services/notificationService'
import type { Notification } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const SSE_SUPPORTED = typeof EventSource !== 'undefined'

function mapRows(rows: Notification[]) {
  return rows.map((n) => {
    const meta = getInAppNotificationMeta(String(n.type), (n.data ?? null) as Record<string, unknown> | null)
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : (n.createdAt as Date).toISOString(),
      status: n.status === 'UNREAD' ? ('UNREAD' as const) : ('READ' as const),
      type: String(n.type),
      sourceLabel: meta.sourceLabel,
    }
  })
}

export function useInAppNotifications(userId: string | undefined, companyId: string | undefined) {
  const queryClient = useQueryClient()
  const enabled = !!userId && !!companyId

  const listQuery = useQuery({
    queryKey: ['inAppNotifications', userId, companyId],
    queryFn: async () => {
      if (!userId) throw new Error('userId')
      const data = await getUserNotifications(userId, { limit: 50, page: 1 })
      return data
    },
    enabled,
    staleTime: 30_000,
  })

  const unreadQuery = useQuery({
    queryKey: ['inAppNotificationsUnread', userId, companyId],
    queryFn: async () => {
      if (!userId) throw new Error('userId')
      return getUnreadCount(userId)
    },
    enabled,
    staleTime: 15_000,
  })

  useEffect(() => {
    if (!companyId || !userId || !SSE_SUPPORTED) return
    const es = new EventSource(`${API_URL}/v1/events/metrics/${companyId}`, { withCredentials: true })
    const onCreated = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as { userId?: string }
        if (data.userId === userId) {
          void queryClient.invalidateQueries({ queryKey: ['inAppNotifications', userId, companyId] })
          void queryClient.invalidateQueries({ queryKey: ['inAppNotificationsUnread', userId, companyId] })
        }
      } catch {
        /* ignore */
      }
    }
    es.addEventListener('notification:created', onCreated as EventListener)
    return () => {
      es.removeEventListener('notification:created', onCreated as EventListener)
      es.close()
    }
  }, [companyId, userId, queryClient])

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return
      await markAsRead(id, userId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inAppNotifications', userId, companyId] })
      void queryClient.invalidateQueries({ queryKey: ['inAppNotificationsUnread', userId, companyId] })
    },
  })

  const markAllMut = useMutation({
    mutationFn: async () => {
      if (!userId) return
      await markAllNotificationsRead(userId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inAppNotifications', userId, companyId] })
      void queryClient.invalidateQueries({ queryKey: ['inAppNotificationsUnread', userId, companyId] })
    },
  })

  const rows = listQuery.data?.notifications ?? []

  const refetch = useCallback(() => {
    void listQuery.refetch()
    void unreadQuery.refetch()
  }, [listQuery, unreadQuery])

  return {
    items: mapRows(rows),
    unreadCount: unreadQuery.data ?? 0,
    isLoading: listQuery.isLoading || unreadQuery.isLoading,
    refetch,
    markRead: (id: string) => markReadMut.mutate(id),
    markAllRead: () => markAllMut.mutate(),
  }
}
