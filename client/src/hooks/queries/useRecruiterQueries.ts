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

export const useRecruiterJobsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.jobs.recruiter(),
    queryFn: async ({ signal }) => {
      const result = await api.recruiterJobs({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};


export const useRecruiterDashboardQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recruiter.dashboard(),
    queryFn: async ({ signal }) => {
      const result = await api.recruiterDashboard({ signal });
      return result.data;
    },
    enabled: Boolean(user),
  });
};


export const useRecruiterJobPipelineQuery = (jobId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recruiter.pipeline(jobId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.recruiterJobPipeline(jobId || "", { signal });
      return result.data;
    },
    enabled: Boolean(user && jobId && enabled),
  });
};


export const useRecruiterInsightsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.analytics.recruiterInsights(),
    queryFn: async ({ signal }) => {
      const result = await api.recruiterInsights({ signal });
      return result.data;
    },
    enabled: Boolean(user),
  });
};


export const useTpoRecruiterInteractionsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["tpo", "dashboard", "recruiters"],
    queryFn: async ({ signal }) => {
      const result = await api.getTpoRecruiterInteractions({ signal });
      return result.data;
    },
    enabled,
  });
};

// Recruiter Claim Workspace Hooks

export const useMyClaimStatusQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["recruiter", "claim", "status"],
    queryFn: async ({ signal }) => {
      const result = await api.getMyClaimStatus({ signal });
      return result.data;
    },
    enabled,
  });
};


export const useRecruiterClaimJobsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["recruiter", "claim", "jobs"],
    queryFn: async ({ signal }) => {
      const result = await api.getMyPostedJobs({ signal });
      return result.data;
    },
    enabled,
  });
};


export const useUpdateJobStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { jobId: string; status: "OPEN" | "CLOSED" | "ARCHIVED" }) =>
      api.updateJobStatus(payload.jobId, payload.status),
    onSuccess: (res) => {
      showToast("success", res.message || "Job status updated");
      queryClient.invalidateQueries({ queryKey: ["recruiter", "claim", "jobs"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRecruiterClaimJobApplicationsQuery = (
  jobId: string,
  params?: { page?: number; limit?: number; status?: string },
  enabled = true
) => {
  return useQuery({
    queryKey: ["recruiter", "claim", "jobs", jobId, "applications", params],
    queryFn: async ({ signal }) => {
      const result = await api.getJobApplications(jobId, params, { signal });
      return result.data;
    },
    enabled: enabled && Boolean(jobId),
  });
};


export const useUpdateApplicationStatusMutation = (jobId: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { appId: string; status: string; recruiterNotes?: string }) =>
      api.updateApplicationStatus(jobId, payload.appId, {
        status: payload.status,
        recruiterNotes: payload.recruiterNotes,
      }),
    onSuccess: (res) => {
      showToast("success", res.message || "Application status updated");
      queryClient.invalidateQueries({
        queryKey: ["recruiter", "claim", "jobs", jobId, "applications"],
      });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useBulkInviteRecruitersMutation = (collegeId: string) => {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (payload: { invites: Array<{ email: string; companyName: string }> }) =>
      api.bulkInviteRecruiters(collegeId, payload),
    onSuccess: (res) => {
      showToast(
        "success",
        res.message || `Invited ${res.data?.sentCount || 0} recruiters successfully!`
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useResdexSearchQuery = (
  filters: {
    query?: string;
    skills?: string[];
    minCgpa?: number;
    graduationYear?: number;
    collegeName?: string;
    companyName?: string;
    size?: number;
    from?: number;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ["resdex", "search", filters],
    queryFn: async ({ signal }) => {
      const result = await api.resdexSearch(filters, { signal });
      return result.data;
    },
    enabled,
  });
};
