import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  CompanyMutationPayload,
  CompanyType,
  CompanySize,
  PlacementDriveInvite
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useCompaniesQuery = (
  params: {
    page?: number;
    limit?: number;
    q?: string;
    industry?: string;
    location?: string;
    type?: CompanyType;
    size?: CompanySize;
    verified?: boolean;
    hiringEnabled?: boolean;
    hasJobs?: boolean;
    atsSource?: string;
  } = {},
) =>
  useQuery({
    queryKey: queryKeys.companies.list(params),
    queryFn: async ({ signal }) => {
      const result = await api.companies(params, { signal });
      return result.data;
    },
  });


export const useCompanyQuery = (slug?: string) =>
  useQuery({
    queryKey: queryKeys.companies.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.company(slug || "", { signal });
      return result.data;
    },
    enabled: Boolean(slug),
  });


export const useCompanyEmployeesQuery = (
  companyId?: string,
  page = 1,
  limit = 20,
) =>
  useQuery({
    queryKey: queryKeys.companies.employees(companyId || "", page, limit),
    queryFn: async ({ signal }) => {
      const result = await api.companyEmployees(companyId || "", page, limit, {
        signal,
      });
      return result.data;
    },
    enabled: Boolean(companyId),
  });


export const useSuggestedCompaniesQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.companies(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCompanies(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useCreateCompanyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CompanyMutationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createCompany(payload);
    },
    onSuccess: () => showToast("success", "Company saved"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
};


export const useUpdateCompanyMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, payload }: { companyId: string; payload: CompanyMutationPayload }) =>
      api.updateCompany(companyId, payload),
    onSuccess: (res) => {
      showToast("success", "Company profile updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(res.data.slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRequestCompanyRegistrationMutation = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: unknown) => {
      if (!user) throw new Error("Login required");
      return api.requestCompanyRegistration(payload);
    },
    onSuccess: (res) => showToast("success", res.message || "Request submitted successfully"),
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useDiscoveredCompaniesQuery = (page = 1, limit = 30) =>
  useQuery({
    queryKey: ["companies", "discovered", page, limit],
    queryFn: async ({ signal }) => {
      const result = await api.discoveredCompanies({ page, limit }, { signal });
      return result.data;
    },
  });


export const useReviewDiscoveredCompaniesMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { companyIds: string[]; action: "VERIFY" | "REJECT" }) =>
      api.reviewDiscoveredCompanies(payload),
    onSuccess: (res, variables) => {
      const msg =
        variables.action === "VERIFY"
          ? `✅ Verified ${res.data.processed} company/companies`
          : `🗑 Rejected ${res.data.processed} company/companies`;
      showToast("success", msg);
      queryClient.invalidateQueries({ queryKey: ["companies", "discovered"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useFollowCompanyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId }: { companyId: string; slug?: string; companyName?: string }) => {
      if (!user) throw new Error("Login required");
      return api.followCompany(companyId);
    },
    onMutate: async ({ slug }) => {
      if (!slug) return;
      const key = queryKeys.companies.detail(slug);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: any) =>
        old ? { ...old, isFollowing: true } : old
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
      showToast("error", "Failed to follow company");
    },
    onSuccess: (_res, { slug, companyName }) => {
      showToast("success", companyName ? `Now following ${companyName}` : "Company followed");
      // Invalidate company detail to sync follower count
      if (slug) queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(slug) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
};


export const useUnfollowCompanyMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId }: { companyId: string; slug?: string; companyName?: string }) => {
      if (!user) throw new Error("Login required");
      return api.unfollowCompany(companyId);
    },
    onMutate: async ({ slug }) => {
      if (!slug) return;
      const key = queryKeys.companies.detail(slug);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: any) =>
        old ? { ...old, isFollowing: false } : old
      );
      return { previous, key };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
      showToast("error", "Failed to unfollow company");
    },
    onSuccess: (_res, { slug, companyName }) => {
      showToast("success", companyName ? `Unfollowed ${companyName}` : "Unfollowed");
      if (slug) queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(slug) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
};


export const useCompanyJobsQuery = (companyId?: string, page = 1, limit = 10) =>
  useQuery({
    queryKey: [...queryKeys.jobs.company(companyId || ""), { page, limit }],
    queryFn: async ({ signal }) => {
      const result = await api.companyJobs(companyId || "", page, limit, {
        signal,
      });
      return result.data;
    },
    enabled: Boolean(companyId),
  });


export const useDriveInvitesForCompanyQuery = (companyId?: string | null) => {
  return useQuery({
    queryKey: ["driveInvites", "company", companyId],
    queryFn: async ({ signal }) => {
      const result = await api.driveInvitesForCompany(companyId!, { signal });
      return (result.data || []) as PlacementDriveInvite[];
    },
    enabled: Boolean(companyId),
  });
};


export const useInboundDriveInvitesForCompanyQuery = (companyId?: string | null) => {
  return useQuery({
    queryKey: ["driveInvites", "company", companyId, "received"],
    queryFn: async ({ signal }) => {
      const result = await api.inboundDriveInvitesForCompany(companyId!, { signal });
      return (result.data || []) as PlacementDriveInvite[];
    },
    enabled: Boolean(companyId),
  });
};


export const useTpoCompanyClaimsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "company-claims"],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoCompanyClaims({ signal });
      return result.data;
    },
    enabled,
  });
};
