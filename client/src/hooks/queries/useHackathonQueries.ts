import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  HackathonEvaluationPayload,
  HackathonMutationPayload
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const invalidateHackathon = (
  queryClient: ReturnType<typeof useQueryClient>,
  hackathonId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

  if (hackathonId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.hackathons.detail(hackathonId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.hackathons.leaderboard(hackathonId),
    });
  }
};

export const useHackathonsQuery = (params?: {
  status?: string;
  isExternal?: boolean;
  q?: string;
}) =>
  useQuery({
    queryKey: queryKeys.hackathons.list(params),
    queryFn: async ({ signal }) => {
      const result = await api.hackathons(params, { signal });
      return result.data || [];
    },
    staleTime: 2 * 60_000,   // hackathons: fresh for 2min
    gcTime: 10 * 60_000,
  });


export const useHackathonQuery = (id?: string) =>
  useQuery({
    queryKey: queryKeys.hackathons.detail(id || ""),
    queryFn: async ({ signal }) => {
      const result = await api.hackathon(id || "", { signal });
      return result.data;
    },
    enabled: Boolean(id),
  });


export const useCreateHackathonMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: HackathonMutationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createHackathon(payload);
    },
    onSuccess: () => showToast("success", "Hackathon created"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient),
  });
};


export const useReviewHackathonRegistrationMutation = (
  hackathonId?: string,
) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      registrationId,
      status,
    }: {
      registrationId: string;
      status: "APPROVED" | "REJECTED";
    }) => api.reviewHackathonRegistration(registrationId, status),
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "APPROVED"
          ? "Registration approved"
          : "Registration rejected",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useAssignHackathonJudgeMutation = (hackathonId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!hackathonId) throw new Error("Hackathon missing");
      return api.assignHackathonJudge(hackathonId, userId);
    },
    onSuccess: () => showToast("success", "Judge assigned"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useEvaluateHackathonSubmissionMutation = (
  hackathonId?: string,
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      submissionId,
      payload,
    }: {
      submissionId: string;
      payload: HackathonEvaluationPayload;
    }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.evaluateHackathonSubmission(submissionId, payload);
    },
    onSuccess: () => showToast("success", "Submission evaluated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useDeclareHackathonWinnersMutation = (hackathonId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!hackathonId) throw new Error("Hackathon missing");
      return api.declareHackathonWinners(hackathonId);
    },
    onSuccess: (result) => {
      showToast(
        "success",
        `${result.data.winnersDeclared || 0} winners declared`,
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useHackathonLifecycleMutation = (hackathonId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (action: "archive" | "delete") => {
      if (!hackathonId) throw new Error("Hackathon missing");
      return action === "archive"
        ? api.archiveHackathon(hackathonId)
        : api.deleteHackathon(hackathonId);
    },
    onSuccess: (_result, action) => {
      showToast(
        "success",
        action === "archive" ? "Hackathon archived" : "Hackathon deleted",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useSuggestedHackathonsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.hackathons(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedHackathons(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useHackathonSearchQuery = (query: string) =>
  useQuery({
    queryKey: queryKeys.search.hackathons(query.trim()),
    queryFn: async ({ signal }) => {
      const result = await api.searchHackathons({ q: query.trim() }, { signal });
      return result.data || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
