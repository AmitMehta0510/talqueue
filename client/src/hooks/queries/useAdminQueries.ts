import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

export const useAdminCollegesQuery = (limit = 20, cursor?: string) =>
  useQuery({
    queryKey: ["colleges", "admin", limit, cursor],
    queryFn: async ({ signal }) => {
      const result = await api.colleges(limit, { cursor, signal });
      return result.data;
    },
  });


export const useSuggestedRecruitersQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.recruiters(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedRecruiters(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useAdminStatsQuery = () => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");

  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: async ({ signal }) => {
      const result = await api.getAdminStats({ signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminAnalyticsQuery = (range: number) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");

  return useQuery({
    queryKey: queryKeys.admin.analytics(range),
    queryFn: async ({ signal }) => {
      const result = await api.getAdminAnalytics({ range }, { signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminUsersQuery = (search: string, limit = 50) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");

  return useInfiniteQuery({
    queryKey: queryKeys.admin.users(search),
    queryFn: async ({ pageParam, signal }) => {
      if (isPlatformAdmin) {
        const result = await api.listAdminUsers(
          { search, limit, cursor: pageParam },
          { signal }
        );
        return result.data;
      } else {
        const result = await api.searchUsers(
          { q: search, limit },
          { signal }
        );
        const raw = result.data || [];
        const flattened = raw.map((item: any) => {
          if (item?.id) return item;
          return {
            ...item.user,
            affinityScore: item.relevanceScore,
          };
        });
        return {
          users: flattened,
          nextCursor: null,
          hasNextPage: false,
        };
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: Boolean(user && (isPlatformAdmin || search.trim().length >= 1)),
  });
};


export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ACTIVE" | "INACTIVE" | "BANNED" }) =>
      api.updateUserStatus(userId, { status }),
    onSuccess: () => {
      showToast("success", result.message || "User status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useAssignPlatformAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => api.assignPlatformAdmin(userId),
    onSuccess: () => {
      showToast("success", result.message || "Role granted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRemovePlatformAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => api.removePlatformAdmin(userId),
    onSuccess: () => {
      showToast("success", result.message || "Role revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useAssignCollegeAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ collegeId, userId }: { collegeId: string; userId: string }) =>
      api.assignCollegeAdmin(collegeId, { userId }),
    onSuccess: (result, { collegeId }) => {
      showToast("success", result.message || "Admin assigned successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.collegeAdmins(collegeId) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRemoveCollegeAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ collegeId, userId }: { collegeId: string; userId: string }) =>
      api.removeCollegeAdmin(collegeId, userId),
    onSuccess: (result, { collegeId }) => {
      showToast("success", result.message || "Admin removed successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.collegeAdmins(collegeId) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useListCollegeAdminsQuery = (collegeId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.collegeAdmins(collegeId),
    queryFn: async ({ signal }) => {
      const result = await api.listCollegeAdmins(collegeId, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && collegeId),
  });
};


export const useAssignCompanyAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId, officeCity }: { companyId: string; userId: string; officeCity?: string }) =>
      api.assignCompanyAdmin(companyId, { userId, officeCity }),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Admin assigned successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.companyAdmins(companyId) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRemoveCompanyAdminMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId, officeCity }: { companyId: string; userId: string; officeCity?: string }) =>
      api.removeCompanyAdmin(companyId, userId, officeCity),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Admin removed successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.companyAdmins(companyId) });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useListCompanyAdminsQuery = (companyId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.companyAdmins(companyId),
    queryFn: async ({ signal }) => {
      const result = await api.listCompanyAdmins(companyId, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && companyId),
  });
};

// ─── ADMIN CONTENT MODERATION HOOKS ──────────────────────────────────────────


export const useAdminPostsQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useInfiniteQuery({
    queryKey: ["admin", "content", "posts", q],
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.adminListPosts({ q: q || undefined, limit: 20, cursor: pageParam }, { signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminDeletePostMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (postId: string) => api.adminDeletePost(postId),
    onSuccess: () => {
      showToast("success", result.message || "Post removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "posts"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminHackathonsQuery = (q: string, cursor?: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useQuery({
    queryKey: ["admin", "content", "hackathons", q, cursor],
    queryFn: async ({ signal }) => {
      const result = await api.adminListHackathons({ q: q || undefined, limit: 20, cursor }, { signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminUpdateHackathonStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ hackathonId, status }: { hackathonId: string; status: string }) =>
      api.adminUpdateHackathonStatus(hackathonId, { status }),
    onSuccess: () => {
      showToast("success", "Hackathon status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "hackathons"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminUpdateHackathonMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ hackathonId, payload }: { hackathonId: string; payload: any }) =>
      api.adminUpdateHackathon(hackathonId, payload),
    onSuccess: () => {
      showToast("success", "Hackathon updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "hackathons"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminTriggerScraperMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: () => api.adminTriggerScraper({ timeoutMs: 120000 }),
    onSuccess: () => {
      showToast(
        "success",
        "Hackathon scraper run started in the background. Refresh the list in a few minutes to see updates."
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "hackathons"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminTriggerJobScraperMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: () => api.adminTriggerJobScraper({ timeoutMs: 120000 }),
    onSuccess: () => {
      showToast(
        "success",
        "Job scraper run started in the background. Refresh the list in a few minutes to see updates."
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "jobs"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminTriggerCompanyDiscoveryMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: () => api.adminTriggerCompanyDiscovery({ timeoutMs: 120000 }),
    onSuccess: () => {
      showToast(
        "success",
        "Company discovery started in the background. Refresh in a few minutes to see updates."
      );
      queryClient.invalidateQueries({ queryKey: ["companies", "discovered"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};



export const useAdminProjectsQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useInfiniteQuery({
    queryKey: ["admin", "content", "projects", q],
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.adminListProjects({ q: q || undefined, limit: 20, cursor: pageParam }, { signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminUpdateProjectStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: string }) =>
      api.adminUpdateProjectStatus(projectId, { status }),
    onSuccess: () => {
      showToast("success", "Project status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "projects"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminJobsQuery = (q: string, cursor?: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useQuery({
    queryKey: ["admin", "content", "jobs", q, cursor],
    queryFn: async ({ signal }) => {
      const result = await api.adminListJobs({ q: q || undefined, limit: 20, cursor }, { signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminDeleteJobMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (jobId: string) => api.adminDeleteJob(jobId),
    onSuccess: () => {
      showToast("success", result.message || "Job removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "jobs"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminUpdateJobMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => api.adminUpdateJob(jobId, data),
    onSuccess: () => {
      showToast("success", "Job updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "jobs"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminCreateJobMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.adminCreateJob(data),
    onSuccess: () => {
      showToast("success", "Job created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "jobs"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminCommunitiesQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useInfiniteQuery({
    queryKey: ["admin", "content", "communities", q],
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.adminListCommunities({ q: q || undefined, limit: 20, cursor: pageParam }, { signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminUpdateCommunityMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ communityId, archived, verified }: { communityId: string; archived?: boolean; verified?: boolean }) =>
      api.adminUpdateCommunity(communityId, { archived, verified }),
    onSuccess: () => {
      showToast("success", "Community updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "communities"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminReferralsQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useInfiniteQuery({
    queryKey: ["admin", "content", "referrals", q],
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.adminListReferrals({ q: q || undefined, limit: 20, cursor: pageParam }, { signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminEventsQuery = (params?: { collegeId?: string; companyId?: string; communityId?: string; type?: string; page?: number; limit?: number }) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useQuery({
    queryKey: ["admin", "content", "events", params],
    queryFn: async ({ signal }) => {
      const result = await api.adminListEvents(params, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};


export const useAdminDeleteEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (eventId: string) => api.adminDeleteEvent(eventId),
    onSuccess: () => {
      showToast("success", "Event deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "events"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminUpdateEventMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: any }) => api.adminUpdateEvent(eventId, data),
    onSuccess: () => {
      showToast("success", "Event updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "events"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminListEventAttendeesQuery = (eventId: string, params?: { page?: number; limit?: number }) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN");
  return useQuery({
    queryKey: ["admin", "content", "events", eventId, "attendees", params],
    queryFn: async ({ signal }) => {
      const result = await api.adminListEventAttendees(eventId, params, { signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin && eventId),
  });
};

// ─── ADMIN DEPARTMENT MANAGEMENT ──────────────────────────────────────────────


export const useAdminCreateDepartmentMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ collegeId, name, hod }: { collegeId: string; name: string; hod?: string }) =>
      api.adminCreateDepartment(collegeId, { name, hod }),
    onSuccess: (_, { collegeId }) => {
      showToast("success", "Department created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "departments", collegeId] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useAdminDepartmentsQuery = (collegeId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin", "departments", collegeId],
    queryFn: async ({ signal }) => {
      const result = await api.adminListDepartments(collegeId, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && collegeId),
  });
};


export const useCompanyAdminStatsQuery = (companyId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company-admin", "stats", companyId],
    queryFn: async ({ signal }) => {
      const result = await api.getCompanyAdminStats(companyId, { signal });
      return result.data;
    },
    enabled: Boolean(user && companyId),
  });
};


export const useCompanyAdminsForDashboardQuery = (companyId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company-admin", "admins", companyId],
    queryFn: async ({ signal }) => {
      const result = await api.listCompanyAdminsForDashboard(companyId, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && companyId),
  });
};


export const useAssignCompanyAdminFromDashboardMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId, officeCity }: { companyId: string; userId: string; officeCity?: string }) =>
      api.assignCompanyAdminFromDashboard(companyId, { userId, officeCity }),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Admin assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["company-admin", "admins", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-admin", "stats", companyId] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRemoveCompanyAdminFromDashboardMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId, officeCity }: { companyId: string; userId: string; officeCity?: string }) =>
      api.removeCompanyAdminFromDashboard(companyId, userId, officeCity),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Admin removed successfully");
      queryClient.invalidateQueries({ queryKey: ["company-admin", "admins", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-admin", "stats", companyId] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useCompanyRecruitersQuery = (companyId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company-admin", "recruiters", companyId],
    queryFn: async ({ signal }) => {
      const result = await api.listCompanyRecruiters(companyId, { signal });
      return result.data || [];
    },
    enabled: Boolean(user && companyId),
  });
};


export const useAssignCompanyRecruiterMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId, title }: { companyId: string; userId: string; title?: string }) =>
      api.assignCompanyRecruiter(companyId, { userId, title }),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Recruiter assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["company-admin", "recruiters", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-admin", "stats", companyId] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useRemoveCompanyRecruiterMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, userId }: { companyId: string; userId: string }) =>
      api.removeCompanyRecruiter(companyId, userId),
    onSuccess: (result, { companyId }) => {
      showToast("success", result.message || "Recruiter removed successfully");
      queryClient.invalidateQueries({ queryKey: ["company-admin", "recruiters", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-admin", "stats", companyId] });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useImportCollegesMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: any) => api.importColleges(body, { timeoutMs: 600000 }),
    onSuccess: () => {
      showToast("success", result.message || "Colleges imported successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useVerifyCollegeEmailMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ educationId, email, code }: { educationId: string; email: string; code?: string }) =>
      api.verifyCollegeEmail(educationId, email, code),
    onSuccess: () => {
      showToast("success", result.message || "Email verified successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.educations });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};


export const useVerifyWorkEmailMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ experienceId, email, code }: { experienceId: string; email: string; code?: string }) =>
      api.verifyWorkEmail(experienceId, email, code),
    onSuccess: () => {
      showToast("success", "Work email verified successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.experiences });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
    },
  });
};
