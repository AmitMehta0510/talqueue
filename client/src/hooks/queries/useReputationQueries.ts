import {
  useQuery
} from "@tanstack/react-query";
import {
  api
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";

export const useHackathonLeaderboardQuery = (id?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.hackathons.leaderboard(id || ""),
    queryFn: async ({ signal }) => {
      const result = await api.hackathonLeaderboard(id || "", { signal });
      return result.data;
    },
    enabled: Boolean(id) && enabled,
  });


export const useMyReputationQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.reputation.me(),
    queryFn: async ({ signal }) => {
      const result = await api.myReputation({ signal });
      return result.data;
    },
    enabled: Boolean(user),
    staleTime: 60_000,       // reputation: fresh for 1min
    gcTime: 5 * 60_000,
  });
};


export const useUserReputationQuery = (username?: string) =>
  useQuery({
    queryKey: queryKeys.reputation.user(username || ""),
    queryFn: async ({ signal }) => {
      const result = await api.userReputation(username || "", { signal });
      return result.data;
    },
    enabled: Boolean(username),
  });


export const useReputationLeaderboardQuery = () =>
  useQuery({
    queryKey: queryKeys.reputation.leaderboard(),
    queryFn: async ({ signal }) => {
      const result = await api.reputationLeaderboard({ signal });
      return result.data || [];
    },
    staleTime: 2 * 60_000,   // leaderboard: fresh for 2min
    gcTime: 10 * 60_000,
  });


export const useMyReputationHistoryQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.reputation.history(),
    queryFn: async ({ signal }) => {
      const result = await api.myReputationHistory({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useBadgesQuery = () =>
  useQuery({
    queryKey: queryKeys.reputation.badges(),
    queryFn: async ({ signal }) => {
      const result = await api.badges({ signal });
      return result.data || [];
    },
    staleTime: 5 * 60_000,
  });


export const useTopBadgesQuery = () =>
  useQuery({
    queryKey: queryKeys.reputation.topBadges(),
    queryFn: async ({ signal }) => {
      const result = await api.topBadges({ signal });
      return result.data || [];
    },
    staleTime: 5 * 60_000,
  });


export const useTopEngineersQuery = () =>
  useQuery({
    queryKey: queryKeys.leaderboards.engineers(),
    queryFn: async ({ signal }) => {
      const result = await api.topEngineers({ signal });
      return result.data;
    },
    staleTime: 60_000,
  });


export const useTopProjectsQuery = () =>
  useQuery({
    queryKey: queryKeys.leaderboards.projects(),
    queryFn: async ({ signal }) => {
      const result = await api.topProjects({ signal });
      return result.data;
    },
    staleTime: 60_000,
  });


export const useTopHackathonEngineersQuery = () =>
  useQuery({
    queryKey: queryKeys.leaderboards.hackathonEngineers(),
    queryFn: async ({ signal }) => {
      const result = await api.topHackathonEngineers({ signal });
      return result.data;
    },
    staleTime: 60_000,
  });


export const useTopTeamsQuery = () =>
  useQuery({
    queryKey: queryKeys.leaderboards.teams(),
    queryFn: async ({ signal }) => {
      const result = await api.topTeams({ signal });
      return result.data;
    },
    staleTime: 60_000,
  });


export const useFastestGrowingEngineersQuery = () =>
  useQuery({
    queryKey: queryKeys.leaderboards.fastestGrowing(),
    queryFn: async ({ signal }) => {
      const result = await api.fastestGrowingEngineers({ signal });
      return result.data;
    },
    staleTime: 60_000,
  });
