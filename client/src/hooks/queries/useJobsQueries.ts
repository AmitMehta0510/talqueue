import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  JobApplicationPayload,
  JobApplicationStatusPayload,
  ReferralRequestPayload,
  ReferralRequestStatus
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useJobsQuery = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  workMode?: string[];
  jobType?: string[];
  skills?: string[];
  location?: string[];
  roles?: string[];
  freshness?: string | null;
}) =>
  useQuery({
    queryKey: queryKeys.jobs.list(params as Record<string, unknown> | undefined),
    queryFn: async ({ signal }) => {
      const result = await api.jobs(params, { signal });
      return result.data || { jobs: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    },
    staleTime: 2 * 60_000,   // job listings: fresh for 2min
    gcTime: 10 * 60_000,
  });

/**
 * Debounce-aware autocomplete hook for job skills.
 * Query only fires when `q` has at least 1 character.
 * Results are stale for 5 minutes (warm Redis cache makes this fast).
 */

export const useJobSkillsAutocompleteQuery = (q: string, limit = 15) =>
  useQuery({
    queryKey: queryKeys.jobs.skillsAutocomplete(q),
    queryFn: async ({ signal }) => {
      const result = await api.jobSkillsAutocomplete(q, limit, { signal });
      return result.data || [];
    },
    enabled: true, // Fire even with empty string to pre-warm; backend handles empty q
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: (prev) => prev,
  });

/**
 * Debounce-aware autocomplete hook for job locations.
 * Same caching strategy as skills autocomplete.
 */

export const useJobLocationsAutocompleteQuery = (q: string, limit = 15) =>
  useQuery({
    queryKey: queryKeys.jobs.locationsAutocomplete(q),
    queryFn: async ({ signal }) => {
      const result = await api.jobLocationsAutocomplete(q, limit, { signal });
      return result.data || [];
    },
    enabled: true,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: (prev) => prev,
  });



export const useSuggestedJobsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.jobs(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedJobs(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useJobQuery = (slug?: string) =>
  useQuery({
    queryKey: queryKeys.jobs.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.job(slug || "", { signal });
      return result.data;
    },
    enabled: Boolean(slug),
  });


export const useCreateJobMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.createJob>[0]) => {
      if (!user) throw new Error("Login required");
      return api.createJob(payload);
    },
    onSuccess: () => showToast("success", "Job created"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations.all,
      });
    },
  });
};


export const useApplyToJobMutation = (jobId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: JobApplicationPayload) => {
      if (!user) throw new Error("Login required");
      if (!jobId) throw new Error("Job missing");
      return api.applyToJob(jobId, payload);
    },
    onSuccess: () => showToast("success", "Application submitted"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobApplications.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
};


export const useMyJobApplicationsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.jobApplications.mine(),
    queryFn: async ({ signal }) => {
      const result = await api.myJobApplications({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useJobApplicationsQuery = (jobId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.jobApplications.byJob(jobId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.jobApplications(jobId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(user && jobId && enabled),
  });
};


export const useUpdateJobApplicationStatusMutation = (jobId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: JobApplicationStatusPayload;
    }) => api.updateJobApplicationStatus(applicationId, payload),
    onSuccess: () => showToast("success", "Application updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobApplications.all,
      });
      if (jobId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobApplications.byJob(jobId),
        });
      }
    },
  });
};


export const useMarkJobApplicationViewedMutation = (jobId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markJobApplicationViewed,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobApplications.all,
      });
      if (jobId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobApplications.byJob(jobId),
        });
      }
    },
  });
};


export const useSavedJobsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.savedJobs(),
    queryFn: async ({ signal }) => {
      const result = await api.savedJobs({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useRecommendedJobsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.jobs(),
    queryFn: async ({ signal }) => {
      const result = await api.recommendedJobs({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useInternshipRecommendationsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.internships(),
    queryFn: async ({ signal }) => {
      const result = await api.internshipRecommendations({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useTrendingJobsQuery = () =>
  useQuery({
    queryKey: queryKeys.recommendations.trendingJobs(),
    queryFn: async ({ signal }) => {
      const result = await api.trendingJobs({ signal });
      return result.data || [];
    },
    staleTime: 60_000,
  });


export const useAdvancedRecommendedJobsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.advancedJobs(),
    queryFn: async ({ signal }) => {
      const result = await api.advancedRecommendedJobs({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useSaveJobMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (jobId: string) => {
      if (!user) throw new Error("Login required");
      return api.saveJob(jobId);
    },
    onMutate: async (jobId: string) => {
      // Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recommendations.savedJobs() });
      // Snapshot current data
      const previousSaved = queryClient.getQueryData<any[]>(queryKeys.recommendations.savedJobs());
      // Optimistic toggle
      queryClient.setQueryData<any[]>(queryKeys.recommendations.savedJobs(), (old) => {
        if (!old) return [];
        const alreadySaved = old.some((j) => j.id === jobId);
        return alreadySaved ? old.filter((j) => j.id !== jobId) : [...old, { id: jobId } as any];
      });
      return { previousSaved };
    },
    onError: (_err, _jobId, context: any) => {
      // Roll back on error
      if (context?.previousSaved !== undefined) {
        queryClient.setQueryData(queryKeys.recommendations.savedJobs(), context.previousSaved);
      }
      showToast("error", getErrorMessage(_err));
    },
    onSuccess: (res) => {
      if (res?.data?.saved) {
        showToast("success", "Job Saved");
      } else {
        showToast("success", "Job Unsaved");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations.savedJobs(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
};


export const useReceivedReferralRequestsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.referrals.received(),
    queryFn: async ({ signal }) => {
      const result = await api.receivedReferralRequests({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useSentReferralRequestsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.referrals.sent(),
    queryFn: async ({ signal }) => {
      const result = await api.sentReferralRequests({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useCreateReferralRequestMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: ReferralRequestPayload;
    }) => {
      if (!user) throw new Error("Login required");
      return api.createReferralRequest(userId, payload);
    },
    onSuccess: () => showToast("success", "Referral request sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all }),
  });
};


export const useReviewReferralRequestMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
    }: {
      requestId: string;
      status: Exclude<ReferralRequestStatus, "PENDING">;
    }) => api.reviewReferralRequest(requestId, status),
    onSuccess: () => showToast("success", "Referral request updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all }),
  });
};


export const useRankJobCandidatesQuery = (jobId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.analytics.candidates(jobId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.rankJobCandidates(jobId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(user && jobId && enabled),
  });
};
