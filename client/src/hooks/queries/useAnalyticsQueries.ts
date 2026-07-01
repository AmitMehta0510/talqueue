import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  InteractionPayload
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useSuggestedEngineersQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.engineers(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedEngineers(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useSuggestedMentorsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.mentors(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedMentors(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useSuggestedCollaboratorsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.collaborators(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCollaborators(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useTrackRecommendationImpressionMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: {
      entityId: string;
      entityType: string;
      position?: number;
      clicked?: boolean;
      hidden?: boolean;
    }) => api.trackRecommendationImpression(body),
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRecommendedCollaboratorsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.collaborators(),
    queryFn: async ({ signal }) => {
      const result = await api.recommendedCollaborators({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useMyActivityTimelineQuery = (limit = 20) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.activities.timeline(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myActivityTimeline(limit, {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};


export const useTrackInteractionMutation = () =>
  useMutation({
    mutationFn: (payload: InteractionPayload) => api.trackInteraction(payload),
  });


export const useRebuildAffinitiesMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Login required");
      return api.rebuildAffinities();
    },
    onSuccess: () => showToast("success", "Affinities rebuilt"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.affinity.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations.all,
      });
    },
  });
};


export const useTrackTrendingImpressionMutation = () =>
  useMutation({
    mutationFn: (payload: InteractionPayload) =>
      api.trackTrendingImpression(payload),
  });
