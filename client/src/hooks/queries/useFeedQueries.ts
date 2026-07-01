import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  FeedItem,
  FeedPost
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

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
    staleTime: 30_000,       // feed feels fresh for 30s
    gcTime: 5 * 60_000,      // keep in cache for 5min after unmount
    refetchOnWindowFocus: true,
  });
};


export const useDiscoveryFeedQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.feed(),
    queryFn: async ({ signal }) => {
      const result = await api.discoveryFeed({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useTrendingFeedQuery = (limit = 100) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.trending.feed(limit),
    queryFn: async ({ signal }) => {
      const result = await api.trendingFeed(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useRefreshTrendingMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Login required");
      return api.refreshTrending();
    },
    onSuccess: () => showToast("success", "Trending refreshed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.feed(100) }),
  });
};
