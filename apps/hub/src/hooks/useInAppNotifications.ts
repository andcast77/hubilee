import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInAppNotificationMeta } from "@hubilee/ui";
import { shopflowNotificationsApi, type InAppNotificationDto } from "@/lib/api-client";
import { getHubApiBaseUrl } from "@/lib/api-origin";
const SSE_SUPPORTED = typeof EventSource !== "undefined";

function mapRows(rows: InAppNotificationDto[]) {
  return rows.map((n) => {
    const meta = getInAppNotificationMeta(n.type, n.data ?? null);
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      status: n.status === "UNREAD" ? ("UNREAD" as const) : ("READ" as const),
      type: n.type,
      sourceLabel: meta.sourceLabel,
    };
  });
}

export function useInAppNotifications(
  userId: string | undefined,
  companyId: string | undefined,
  enabled: boolean
) {
  const queryClient = useQueryClient();
  const active = !!userId && !!companyId && enabled;

  const listQuery = useQuery({
    queryKey: ["hubInAppNotifications", userId, companyId],
    queryFn: async () => {
      if (!userId) throw new Error("userId");
      const res = await shopflowNotificationsApi.list(userId);
      if (!res.success || !res.data) throw new Error(res.error || "notifications");
      return res.data;
    },
    enabled: active,
    staleTime: 30_000,
  });

  const unreadQuery = useQuery({
    queryKey: ["hubInAppNotificationsUnread", userId, companyId],
    queryFn: async () => {
      if (!userId) throw new Error("userId");
      const res = await shopflowNotificationsApi.unreadCount(userId);
      if (!res.success || !res.data) throw new Error(res.error || "unread");
      return res.data.count;
    },
    enabled: active,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!companyId || !userId || !active || !SSE_SUPPORTED) return;
    const es = new EventSource(`${getHubApiBaseUrl()}/v1/events/metrics/${companyId}`, { withCredentials: true });
    const onCreated = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as { userId?: string };
        if (data.userId === userId) {
          void queryClient.invalidateQueries({ queryKey: ["hubInAppNotifications", userId, companyId] });
          void queryClient.invalidateQueries({
            queryKey: ["hubInAppNotificationsUnread", userId, companyId],
          });
        }
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("notification:created", onCreated as EventListener);
    return () => {
      es.removeEventListener("notification:created", onCreated as EventListener);
      es.close();
    };
  }, [companyId, userId, active, queryClient]);

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      await shopflowNotificationsApi.markRead(id, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hubInAppNotifications", userId, companyId] });
      void queryClient.invalidateQueries({ queryKey: ["hubInAppNotificationsUnread", userId, companyId] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await shopflowNotificationsApi.markAllRead(userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hubInAppNotifications", userId, companyId] });
      void queryClient.invalidateQueries({ queryKey: ["hubInAppNotificationsUnread", userId, companyId] });
    },
  });

  const rows = listQuery.data?.notifications ?? [];

  const refetch = useCallback(() => {
    void listQuery.refetch();
    void unreadQuery.refetch();
  }, [listQuery, unreadQuery]);

  return {
    items: mapRows(rows),
    unreadCount: unreadQuery.data ?? 0,
    isLoading: listQuery.isLoading || unreadQuery.isLoading,
    refetch,
    markRead: (id: string) => markReadMut.mutate(id),
    markAllRead: () => markAllMut.mutate(),
  };
}
