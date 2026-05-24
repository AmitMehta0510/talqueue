import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  FeedItem,
  FeedPost,
  NotificationsPage,
  Project,
  ProjectInvite,
  ProjectJoinRequest,
  ProjectMutationPayload,
  SearchResults,
} from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../lib/format";

const publicPostsToFeedItems = (posts: FeedPost[]): FeedItem[] =>
  posts.map((post) => ({
    type: "POST",
    score: 0,
    data: post,
  }));

export const useFeedQuery = (limit = 16) => {
  const { user } = useAuth();
  const viewer = user?.id || "public";

  return useQuery({
    queryKey: queryKeys.feed.list(viewer, limit),
    queryFn: async ({ signal }) => {
      if (user) {
        const result = await api.personalizedFeed(limit, { signal });
        return result.data;
      }

      const result = await api.publicPosts(limit, { signal });
      return publicPostsToFeedItems(result.data.posts || []);
    },
  });
};

export const useProjectsQuery = (limit = 12) =>
  useQuery({
    queryKey: queryKeys.projects.list(limit),
    queryFn: async ({ signal }) => {
      const result = await api.projects(limit, { signal });
      return result.data || [];
    },
  });

export const useProjectQuery = (idOrSlug?: string) =>
  useQuery({
    queryKey: queryKeys.projects.detail(idOrSlug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.project(idOrSlug || "", { signal });
      return result.data;
    },
    enabled: Boolean(idOrSlug),
  });

export const useProjectJoinRequestsQuery = (projectId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.projects.requests(projectId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.projectJoinRequests(projectId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });

export const useSentProjectInvitesQuery = (projectId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.projects.sentInvites(projectId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.sentProjectInvites(projectId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });

export const useReceivedProjectInvitesQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.receivedInvites(),
    queryFn: async ({ signal }) => {
      const result = await api.receivedProjectInvites({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};

export const useJobsQuery = () =>
  useQuery({
    queryKey: queryKeys.jobs.list(),
    queryFn: async ({ signal }) => {
      const result = await api.jobs({ signal });
      return result.data || [];
    },
  });

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { content: string; type: string; tags?: string[] }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createPost(payload);
    },
    onSuccess: async () => {
      showToast("success", "Post published");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
        refreshUser(),
      ]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const usePostReactionMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "like" | "save" }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return action === "like" ? api.likePost(id) : api.savePost(id);
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all });
      const snapshots = queryClient.getQueriesData<FeedItem[]>({
        queryKey: queryKeys.feed.all,
      });

      if (action === "like") {
        queryClient.setQueriesData<FeedItem[]>({ queryKey: queryKeys.feed.all }, (items) =>
          items?.map((item) =>
            item.type === "POST" && item.data.id === id
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    likesCount: (item.data.likesCount || 0) + 1,
                  },
                }
              : item,
          ),
        );
      }

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (_data, variables) => {
      showToast("success", variables.action === "like" ? "Post liked" : "Post saved");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      shortDescription?: string;
      githubUrl?: string;
      liveUrl?: string;
      videoDemoUrl?: string;
      techStack?: string[];
      deploymentStatus?: string;
      visibility: "PUBLIC" | "PRIVATE";
      lookingFor?: string;
    }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createProject(payload);
    },
    onSuccess: () => {
      showToast("success", "Project created");
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useJoinProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (input: Project | { project: Project; message?: string }) => {
      if (!user) {
        throw new Error("Login required");
      }

      const project = "project" in input ? input.project : input;
      const message = "project" in input ? input.message : undefined;

      return api.joinProject(
        project.id,
        message || "I would like to collaborate on this project.",
      );
    },
    onSuccess: () => showToast("success", "Join request sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      const project = variables && ("project" in variables ? variables.project : variables);

      if (project) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

const invalidateProject = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

  if (projectId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.requests(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.sentInvites(projectId) });
  }
};

export const useReviewProjectJoinRequestMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewProjectJoinRequest(requestId, status),
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Request accepted" : "Request rejected");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      invalidateProject(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useInviteUserToProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) => {
      if (!projectId) throw new Error("Project missing");
      return api.inviteUserToProject(projectId, userId, message);
    },
    onSuccess: () => showToast("success", "Project invite sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      invalidateProject(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useReviewProjectInviteMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ inviteId, status }: { inviteId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewProjectInvite(inviteId, status),
    onMutate: async ({ inviteId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.receivedInvites() });
      const previous = queryClient.getQueryData<ProjectInvite[]>(
        queryKeys.projects.receivedInvites(),
      );

      queryClient.setQueryData<ProjectInvite[]>(
        queryKeys.projects.receivedInvites(),
        (invites) =>
          invites?.map((invite) =>
            invite.id === inviteId
              ? { ...invite, status, reviewedAt: new Date().toISOString() }
              : invite,
          ),
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.projects.receivedInvites(), context?.previous);
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Invite accepted" : "Invite rejected");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.receivedInvites() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useLeaveProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("Project missing");
      return api.leaveProject(projectId);
    },
    onSuccess: () => showToast("success", "Left project"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useRemoveProjectMemberMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (memberId: string) => {
      if (!projectId) throw new Error("Project missing");
      return api.removeProjectMember(projectId, memberId);
    },
    onSuccess: () => showToast("success", "Member removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useUpdateProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: ProjectMutationPayload) => {
      if (!projectId) throw new Error("Project missing");
      return api.updateProject(projectId, payload);
    },
    onSuccess: () => showToast("success", "Project updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useProjectLifecycleMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (action: "complete" | "archive" | "restore" | "delete" | "sync") => {
      if (!projectId) throw new Error("Project missing");

      if (action === "complete") return api.completeProject(projectId);
      if (action === "archive") return api.archiveProject(projectId);
      if (action === "restore") return api.restoreProject(projectId);
      if (action === "delete") return api.deleteProject(projectId);
      return api.syncGithubProject(projectId);
    },
    onSuccess: (_result, action) => {
      const labels = {
        complete: "Project completed",
        archive: "Project archived",
        restore: "Project restored",
        delete: "Project deleted",
        sync: "GitHub metadata synced",
      };
      showToast("success", labels[action]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const usePlatformSearchMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (query: string): Promise<SearchResults> => {
      const trimmed = query.trim();

      if (!trimmed) {
        return {};
      }

      const [globalResult, userResult, projectResult] = await Promise.all([
        api.searchGlobal(trimmed),
        api.searchUsers(trimmed),
        api.searchProjects(trimmed),
      ]);

      return {
        ...globalResult.data,
        users: userResult.data,
        projects: projectResult.data,
      };
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

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
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
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
            unreadCount: changedUnread ? Math.max(page.unreadCount - 1, 0) : page.unreadCount,
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
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
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
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const archived = page.notifications.find((notification) => notification.id === id);

          return {
            ...page,
            notifications: page.notifications.filter((notification) => notification.id !== id),
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
