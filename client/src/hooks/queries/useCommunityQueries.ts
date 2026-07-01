import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  CommunityMutationPayload
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

const invalidateCommunity = (
  queryClient: ReturnType<typeof useQueryClient>,
  slug?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

  if (slug) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.communities.detail(slug),
    });
  }
};

export const useSearchCommunitiesQuery = (params: { q?: string; type?: string; category?: string }) =>
  useQuery({
    queryKey: ["communities", "search", params],
    queryFn: async ({ signal }) => {
      const result = await api.searchCommunities(params, { signal });
      return result.data || [];
    },
    enabled: Boolean(params.q?.trim() || params.type || params.category),
  });



export const useSuggestedCommunitiesQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.communities(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCommunities(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useCommunityQuery = (slug?: string) =>
  useQuery({
    queryKey: queryKeys.communities.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.community(slug || "", { signal });
      return result.data;
    },
    enabled: Boolean(slug),
  });


export const useJoinedCommunitiesQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.communities.joined(),
    queryFn: async ({ signal }) => {
      const result = await api.joinedCommunities({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useJoinCommunityMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (communityId: string) => api.joinCommunity(communityId),
    onSuccess: () => {
      invalidateCommunity(queryClient, slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.suggested() });
      showToast("success", "Successfully joined community");
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};


export const useLeaveCommunityMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (communityId: string) => api.leaveCommunity(communityId),
    onSuccess: () => {
      invalidateCommunity(queryClient, slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.suggested() });
      showToast("success", "Left community successfully");
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};


export const useCommunityJoinRequestsQuery = (slug: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.communities.joinRequests(slug),
    queryFn: async () => {
      const res = await api.getCommunityJoinRequests(slug);
      return res.data;
    },
    enabled: !!slug && enabled,
  });
};


export const useReviewCommunityJoinRequestMutation = (slug: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ pendingUserId, action }: { pendingUserId: string; action: "approve" | "reject" }) => {
      const res = await api.reviewCommunityJoinRequest(slug, pendingUserId, action);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joinRequests(slug) });
      invalidateCommunity(queryClient, slug);
      showToast("success", `Request ${res.status === "approved" ? "approved" : "declined"} successfully`);
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};



export const useCreateCommunityMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CommunityMutationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createCommunity(payload);
    },
    onSuccess: () => showToast("success", "Community created"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (result) => invalidateCommunity(queryClient, result?.data.slug),
  });
};


export const useArchiveCommunityMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (communityId: string) => api.archiveCommunity(communityId),
    onSuccess: () => showToast("success", "Community archived"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateCommunity(queryClient, slug),
  });
};


export const useTrendingCommunitiesQuery = () => {
  return useQuery({
    queryKey: queryKeys.discovery.trending.communities(),
    queryFn: async ({ signal }) => {
      const result = await api.trendingCommunities({ signal });
      return result.data || [];
    },
    staleTime: 300_000, // 5 minutes
  });
};


export const useCommunityBySlugQuery = (
  slug?: string,
  page = 1,
  limit = 10,
) => {
  return useQuery({
    queryKey: queryKeys.communities.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.communityBySlug(slug || "", page, limit, {
        signal,
      });
      return result.data;
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
};
