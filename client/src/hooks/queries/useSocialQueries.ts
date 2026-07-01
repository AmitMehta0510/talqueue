import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  FeedItem
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

const invalidateSocial = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });

  if (userId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.followers(userId, 20),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.following(userId, 20),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.connections(userId, 20),
    });
  }
};

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      content: string;
      type: string;
      tags?: string[];
      visibility?: string;
      communityId?: string;
      mediaUrl?: string;
      collegeId?: string;
      departmentId?: string;
    }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createPost(payload);
    },
    onSuccess: async (res) => {
      showToast("success", "Post published");
      const communitySlug = (res as any)?.data?.community?.slug;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.communities.all }),
        ...(communitySlug ? [queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(communitySlug) })] : []),
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
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "like" | "save";
    }) => {
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
        queryClient.setQueriesData<FeedItem[]>(
          { queryKey: queryKeys.feed.all },
          (items) =>
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
      showToast(
        "success",
        variables.action === "like" ? "Post liked" : "Post saved",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: ["posts", "user"] });
    },
  });
};


export const useCommentOnPostMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      content,
      parentCommentId,
    }: {
      id: string;
      content: string;
      parentCommentId?: string;
    }) => {
      if (!user) throw new Error("Login required");
      return api.commentOnPost(id, { content, parentCommentId });
    },
    onSuccess: () => showToast("success", "Comment added"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: ["posts", "user"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.post(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useRepostMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, caption }: { id: string; caption?: string }) => {
      if (!user) throw new Error("Login required");
      return api.repostPost(id, caption ? { caption } : undefined);
    },
    onSuccess: () => showToast("success", "Post reposted"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: ["posts", "user"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.post(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useFollowersQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.followers(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.followers(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });


export const useFollowingQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.following(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.following(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });


export const useConnectionsQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.connections(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.connections(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });


export const useSuggestedConnectionsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.social.suggested(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.suggestedConnections(limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 60_000,
  });
};


export const useMutualConnectionsQuery = (userId?: string, limit = 12) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.social.mutual(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.mutualConnections(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(user && userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};


export const useFollowUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.followUser(userId);
    },
    onSuccess: () => showToast("success", "User followed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};


export const useUnfollowUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.unfollowUser(userId);
    },
    onSuccess: () => showToast("success", "User unfollowed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};


export const useConnectUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.connectUser(userId);
    },
    onSuccess: () => showToast("success", "Connection request sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};


export const useReviewConnectionMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      connectionId,
      status,
    }: {
      connectionId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => api.reviewConnection(connectionId, status),
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "ACCEPTED"
          ? "Connection accepted"
          : "Connection rejected",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateSocial(queryClient, user?.id),
  });
};


export const useSuggestedPostsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.posts(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedPosts(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const usePostQuery = (postId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.feed.post(postId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.post(
        postId || "",
        { commentsLimit: 20, repliesLimit: 5 },
        { signal },
      );
      return result.data;
    },
    enabled: Boolean(postId && enabled),
  });
