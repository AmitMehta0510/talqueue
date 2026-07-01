import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  NotificationsPage
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";

export const useNotificationsQuery = (page = 1, limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(page, limit),
    queryFn: async ({ signal }) => {
      const result = await api.notifications(page, limit, { signal });
      return result.data;
    },
    enabled: Boolean(user),
    refetchInterval: user ? 30_000 : false,
  });
};


export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          let changedUnread = false;

          return {
            ...page,
            notifications: page.notifications.map((notification) => {
              if (notification.id !== id || notification.isRead) {
                return notification;
              }

              changedUnread = true;
              return {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              };
            }),
            unreadCount: changedUnread
              ? Math.max(page.unreadCount - 1, 0)
              : page.unreadCount,
          };
        },
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) =>
          page
            ? {
                ...page,
                unreadCount: 0,
                notifications: page.notifications.map((notification) => ({
                  ...notification,
                  isRead: true,
                  readAt: notification.readAt || new Date().toISOString(),
                })),
              }
            : page,
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useArchiveNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.archiveNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const archived = page.notifications.find(
            (notification) => notification.id === id,
          );

          return {
            ...page,
            notifications: page.notifications.filter(
              (notification) => notification.id !== id,
            ),
            unreadCount:
              archived && !archived.isRead
                ? Math.max(page.unreadCount - 1, 0)
                : page.unreadCount,
          };
        },
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const deleted = page.notifications.find(
            (notification) => notification.id === id,
          );

          return {
            ...page,
            notifications: page.notifications.filter(
              (notification) => notification.id !== id,
            ),
            unreadCount:
              deleted && !deleted.isRead
                ? Math.max(page.unreadCount - 1, 0)
                : page.unreadCount,
          };
        },
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


// Discovery & Recommendations
