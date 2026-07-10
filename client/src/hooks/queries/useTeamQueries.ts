import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";
import { invalidateHackathon } from "./useHackathonQueries";

export const invalidateTeams = (
  queryClient: ReturnType<typeof useQueryClient>,
  teamId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  if (teamId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
  }
};

export const useMyTeamsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teams.mine(),
    queryFn: async ({ signal }) => {
      const result = await api.myTeams({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useTeamQuery = (teamId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teams.detail(teamId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.team(teamId || "", { signal });
      return result.data;
    },
    enabled: Boolean(user && teamId),
  });
};


export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      members?: string[];
    }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createTeam(payload);
    },
    onSuccess: () => {
      showToast("success", "Team created");
      // Invalidate all team-related queries so the registration dropdown refreshes immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.mine() });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useInviteTeamMemberMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) => {
      if (!teamId) throw new Error("Team missing");
      return api.inviteTeamMember(teamId, userId, message);
    },
    onSuccess: () => showToast("success", "Team invite sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


export const useReviewTeamInviteMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      inviteId,
      status,
    }: {
      inviteId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => api.reviewTeamInvite(inviteId, status),
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "ACCEPTED"
          ? "Team invite accepted"
          : "Team invite rejected",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient),
  });
};


export const useWithdrawTeamInviteMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (inviteId: string) => api.withdrawTeamInvite(inviteId),
    onSuccess: () => showToast("success", "Invite withdrawn"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


export const useRemoveTeamMemberMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (memberUserId: string) => {
      if (!teamId) throw new Error("Team missing");
      return api.removeTeamMember(teamId, memberUserId);
    },
    onSuccess: () => showToast("success", "Member removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


export const useTeamLifecycleMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<unknown, Error, "leave" | "delete" | "archive" | "restore">({
    mutationFn: async (action) => {
      if (!teamId) throw new Error("Team missing");
      if (action === "leave") return api.leaveTeam(teamId);
      if (action === "archive") return api.archiveTeam(teamId);
      if (action === "restore") return api.restoreTeam(teamId);
      return api.deleteTeam(teamId);
    },
    onSuccess: (_result, action) => {
      let msg = "Team deleted";
      if (action === "leave") msg = "Left team";
      if (action === "archive") msg = "Team archived";
      if (action === "restore") msg = "Team restored";
      showToast("success", msg);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


export const useUpdateTeamMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) => {
      if (!teamId) throw new Error("Team missing");
      return api.updateTeam(teamId, data);
    },
    onSuccess: () => showToast("success", "Team updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


export const useMyPendingTeamInvitesQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.teams.pendingInvites(),
    queryFn: async ({ signal }) => {
      const result = await api.myPendingTeamInvites({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });
};


export const useRegisterHackathonTeamMutation = (hackathonId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (teamId: string) => {
      if (!user) {
        throw new Error("Login required");
      }
      if (!hackathonId) {
        throw new Error("Hackathon missing");
      }

      return api.registerHackathonTeam(hackathonId, teamId);
    },
    onSuccess: () => showToast("success", "Team registered"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};


export const useSuggestedTeammatesQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.teammates(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedTeammates(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

/**
 * Calls the skill-complementarity matchmaking endpoint.
 * Returns { userCategory, matches } where matches are engineers whose dominant
 * tech category COMPLEMENTS the authenticated user's stack.
 * e.g. a FRONTEND user gets BACKEND + DEVOPS matches.
 */
export const useComplementaryTeammatesQuery = (limit = 8) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.matchmaking.complementaryTeammates(limit),
    queryFn: async ({ signal }) => {
      const result = await api.complementaryTeammates(limit, { signal });
      return result.data ?? null;
    },
    enabled: Boolean(user),
    // Cache for 5 minutes — skill-based matching is expensive but stable
    staleTime: 5 * 60_000,
    // Don't refetch on window focus — not time-sensitive
    refetchOnWindowFocus: false,
  });
};
