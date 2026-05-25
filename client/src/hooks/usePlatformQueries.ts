import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  CollegeMutationPayload,
  CompanyMutationPayload,
  CompanyType,
  CompanySize,
  CommunityMutationPayload,
  Education,
  FeedItem,
  FeedPost,
  HackathonEvaluationPayload,
  HackathonMutationPayload,
  HackathonSubmissionPayload,
  Experience,
  NotificationsPage,
  Project,
  ProjectInvite,
  ProjectMutationPayload,
  SearchResults,
  User,
  UserSkill,
} from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../lib/format";

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
  });
};

export const useCollegesQuery = (limit = 50) =>
  useInfiniteQuery({
    queryKey: queryKeys.colleges.list(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.colleges(limit, { cursor: pageParam, signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

export const useDepartmentsQuery = (collegeId?: string) =>
  useQuery({
    queryKey: queryKeys.colleges.departments(collegeId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.departments(collegeId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(collegeId),
  });

export const useCreateCollegeMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CollegeMutationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createCollege(payload);
    },
    onSuccess: () => showToast("success", "College saved"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
};

export const useCreateDepartmentMutation = (collegeId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (name: string) => {
      if (!user) {
        throw new Error("Login required");
      }
      if (!collegeId) {
        throw new Error("College missing");
      }

      return api.createDepartment({ name, collegeId });
    },
    onSuccess: () => showToast("success", "Department saved"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.colleges.all });
      if (collegeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.colleges.departments(collegeId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
};

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

export const useCompanyEmployeesQuery = (companyId?: string, page = 1, limit = 20) =>
  useQuery({
    queryKey: queryKeys.companies.employees(companyId || "", page, limit),
    queryFn: async ({ signal }) => {
      const result = await api.companyEmployees(companyId || "", page, limit, { signal });
      return result.data;
    },
    enabled: Boolean(companyId),
  });

export const useSuggestedCompaniesQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.companies.suggested(),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCompanies({ signal });
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

export const useSuggestedCommunitiesQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.communities.suggested(),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCommunities({ signal });
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

const invalidateCommunity = (
  queryClient: ReturnType<typeof useQueryClient>,
  slug?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

  if (slug) {
    queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(slug) });
  }
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

export const useProjectsQuery = (limit = 12) =>
  useQuery({
    queryKey: queryKeys.projects.list(limit),
    queryFn: async ({ signal }) => {
      const result = await api.projects(limit, { signal });
      return result.data || [];
    },
  });

export const useProjectQuery = (idOrSlug?: string) =>
  useQuery({
    queryKey: queryKeys.projects.detail(idOrSlug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.project(idOrSlug || "", { signal });
      return result.data;
    },
    enabled: Boolean(idOrSlug),
  });

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
    mutationFn: (payload: { name: string; description?: string; members?: string[] }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createTeam(payload);
    },
    onSuccess: () => {
      showToast("success", "Team created");
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

const invalidateTeams = (
  queryClient: ReturnType<typeof useQueryClient>,
  teamId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  if (teamId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
  }
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
    mutationFn: ({ inviteId, status }: { inviteId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewTeamInvite(inviteId, status),
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Team invite accepted" : "Team invite rejected");
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

  return useMutation<unknown, Error, "leave" | "delete">({
    mutationFn: async (action) => {
      if (!teamId) throw new Error("Team missing");
      return action === "leave" ? api.leaveTeam(teamId) : api.deleteTeam(teamId);
    },
    onSuccess: (_result, action) => {
      showToast("success", action === "leave" ? "Left team" : "Team deleted");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};

export const useHackathonsQuery = () =>
  useQuery({
    queryKey: queryKeys.hackathons.list(),
    queryFn: async ({ signal }) => {
      const result = await api.hackathons({ signal });
      return result.data || [];
    },
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

export const useHackathonLeaderboardQuery = (id?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.hackathons.leaderboard(id || ""),
    queryFn: async ({ signal }) => {
      const result = await api.hackathonLeaderboard(id || "", { signal });
      return result.data;
    },
    enabled: Boolean(id) && enabled,
  });

export const useProjectJoinRequestsQuery = (projectId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.projects.requests(projectId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.projectJoinRequests(projectId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });

export const useSentProjectInvitesQuery = (projectId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.projects.sentInvites(projectId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.sentProjectInvites(projectId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });

export const useReceivedProjectInvitesQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.receivedInvites(),
    queryFn: async ({ signal }) => {
      const result = await api.receivedProjectInvites({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};

const invalidateHackathon = (
  queryClient: ReturnType<typeof useQueryClient>,
  hackathonId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

  if (hackathonId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.detail(hackathonId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.leaderboard(hackathonId) });
  }
};

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

export const useSubmitHackathonProjectMutation = (hackathonId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: HackathonSubmissionPayload) => {
      if (!user) {
        throw new Error("Login required");
      }
      if (!hackathonId) {
        throw new Error("Hackathon missing");
      }

      return api.submitHackathonProject(hackathonId, payload);
    },
    onSuccess: () => showToast("success", "Project submitted"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};

export const useReviewHackathonRegistrationMutation = (hackathonId?: string) => {
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
        variables.status === "APPROVED" ? "Registration approved" : "Registration rejected",
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

export const useEvaluateHackathonSubmissionMutation = (hackathonId?: string) => {
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
      showToast("success", `${result.data.winnersDeclared || 0} winners declared`);
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
      showToast("success", action === "archive" ? "Hackathon archived" : "Hackathon deleted");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateHackathon(queryClient, hackathonId),
  });
};

export const useJobsQuery = () =>
  useQuery({
    queryKey: queryKeys.jobs.list(),
    queryFn: async ({ signal }) => {
      const result = await api.jobs({ signal });
      return result.data || [];
    },
  });

export const useMyFullProfileQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.full,
    queryFn: async ({ signal }) => {
      const result = await api.myFullProfile({ signal });
      return result.data;
    },
    enabled: Boolean(user),
  });
};

export const useMySkillsQuery = (limit = 12) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.users.skills,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.mySkills(limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};

export const useMyExperiencesQuery = (limit = 8) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.users.experiences,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myExperiences(limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};

export const useMyEducationsQuery = (limit = 8) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.users.educations,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myEducations(limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};

const invalidateUserProfile = (
  queryClient: ReturnType<typeof useQueryClient>,
  user?: User | null,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
  queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });

  if (user?.id) {
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
  }
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { setUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.updateProfile>[0]) => api.updateProfile(payload),
    onSuccess: (result) => {
      setUser(result.data);
      queryClient.setQueryData(queryKeys.users.full, result.data);
      showToast("success", "Profile updated");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateUserProfile(queryClient, user),
  });
};

export const useAddSkillMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.addSkill>[0]) => api.addSkill(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.skills });
      const previous = queryClient.getQueryData<{
        pages: Array<{ skills: UserSkill[]; nextCursor?: string | null; hasNextPage?: boolean; limit?: number }>;
        pageParams: unknown[];
      }>(queryKeys.users.skills);

      queryClient.setQueryData<typeof previous>(queryKeys.users.skills, (data) => {
        if (!data?.pages?.[0]) return data;

        return {
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  skills: page.skills.map((skill) =>
                    skill.skill?.id === payload.skillId
                      ? { ...skill, level: payload.level }
                      : skill,
                  ),
                }
              : page,
          ),
        };
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.users.skills, context?.previous);
      showToast("error", getErrorMessage(error));
    },
    onSuccess: () => showToast("success", "Skill saved"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.skills });
      invalidateUserProfile(queryClient, user);
    },
  });
};

export const useAddExperienceMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.addExperience>[0]) => api.addExperience(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.experiences });
      const previous = queryClient.getQueryData<{
        pages: Array<{ experiences: Experience[]; nextCursor?: string | null; hasNextPage?: boolean; limit?: number }>;
        pageParams: unknown[];
      }>(queryKeys.users.experiences);

      const optimisticExperience: Experience = {
        id: `pending-${Date.now()}`,
        companyName: payload.companyName,
        title: payload.title,
        employmentType: payload.employmentType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        isCurrent: payload.isCurrent,
        description: payload.description,
        techStack: payload.techStack,
        skillsUsed: payload.skillsUsed,
        teamSize: payload.teamSize,
      };

      queryClient.setQueryData<typeof previous>(queryKeys.users.experiences, (data) => {
        if (!data?.pages?.[0]) return data;

        return {
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0
              ? { ...page, experiences: [optimisticExperience, ...page.experiences] }
              : page,
          ),
        };
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.users.experiences, context?.previous);
      showToast("error", getErrorMessage(error));
    },
    onSuccess: () => showToast("success", "Experience added"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.experiences });
      invalidateUserProfile(queryClient, user);
    },
  });
};

export const useAddEducationMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.addEducation>[0]) => api.addEducation(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.educations });
      const previous = queryClient.getQueryData<{
        pages: Array<{ educations: Education[]; nextCursor?: string | null; hasNextPage?: boolean; limit?: number }>;
        pageParams: unknown[];
      }>(queryKeys.users.educations);

      const optimisticEducation: Education = {
        id: `pending-${Date.now()}`,
        collegeId: payload.collegeId,
        departmentId: payload.departmentId,
        degree: payload.degree,
        fieldOfStudy: payload.fieldOfStudy,
        startYear: payload.startYear,
        endYear: payload.endYear,
        current: payload.current,
      };

      queryClient.setQueryData<typeof previous>(queryKeys.users.educations, (data) => {
        if (!data?.pages?.[0]) return data;

        return {
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0
              ? { ...page, educations: [optimisticEducation, ...page.educations] }
              : page,
          ),
        };
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.users.educations, context?.previous);
      showToast("error", getErrorMessage(error));
    },
    onSuccess: () => showToast("success", "Education added"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.educations });
      invalidateUserProfile(queryClient, user);
    },
  });
};

export const useSkillSearchQuery = (query: string) =>
  useQuery({
    queryKey: queryKeys.users.skillSearch(query.trim()),
    queryFn: async ({ signal }) => {
      const result = await api.searchSkills(query.trim(), { signal });
      return result.data || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60_000,
  });

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { content: string; type: string; tags?: string[] }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createPost(payload);
    },
    onSuccess: async () => {
      showToast("success", "Post published");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
        refreshUser(),
      ]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const usePostReactionMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "like" | "save" }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return action === "like" ? api.likePost(id) : api.savePost(id);
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all });
      const snapshots = queryClient.getQueriesData<FeedItem[]>({
        queryKey: queryKeys.feed.all,
      });

      if (action === "like") {
        queryClient.setQueriesData<FeedItem[]>({ queryKey: queryKeys.feed.all }, (items) =>
          items?.map((item) =>
            item.type === "POST" && item.data.id === id
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    likesCount: (item.data.likesCount || 0) + 1,
                  },
                }
              : item,
          ),
        );
      }

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (_data, variables) => {
      showToast("success", variables.action === "like" ? "Post liked" : "Post saved");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      shortDescription?: string;
      githubUrl?: string;
      liveUrl?: string;
      videoDemoUrl?: string;
      techStack?: string[];
      deploymentStatus?: string;
      visibility: "PUBLIC" | "PRIVATE";
      lookingFor?: string;
    }) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createProject(payload);
    },
    onSuccess: () => {
      showToast("success", "Project created");
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useJoinProjectMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (input: Project | { project: Project; message?: string }) => {
      if (!user) {
        throw new Error("Login required");
      }

      const project = "project" in input ? input.project : input;
      const message = "project" in input ? input.message : undefined;

      return api.joinProject(
        project.id,
        message || "I would like to collaborate on this project.",
      );
    },
    onSuccess: () => showToast("success", "Join request sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      const project = variables && ("project" in variables ? variables.project : variables);

      if (project) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

const invalidateProject = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

  if (projectId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.requests(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.sentInvites(projectId) });
  }
};

export const useReviewProjectJoinRequestMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewProjectJoinRequest(requestId, status),
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Request accepted" : "Request rejected");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      invalidateProject(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useInviteUserToProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) => {
      if (!projectId) throw new Error("Project missing");
      return api.inviteUserToProject(projectId, userId, message);
    },
    onSuccess: () => showToast("success", "Project invite sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      invalidateProject(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useReviewProjectInviteMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ inviteId, status }: { inviteId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewProjectInvite(inviteId, status),
    onMutate: async ({ inviteId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.receivedInvites() });
      const previous = queryClient.getQueryData<ProjectInvite[]>(
        queryKeys.projects.receivedInvites(),
      );

      queryClient.setQueryData<ProjectInvite[]>(
        queryKeys.projects.receivedInvites(),
        (invites) =>
          invites?.map((invite) =>
            invite.id === inviteId
              ? { ...invite, status, reviewedAt: new Date().toISOString() }
              : invite,
          ),
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.projects.receivedInvites(), context?.previous);
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Invite accepted" : "Invite rejected");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.receivedInvites() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useLeaveProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("Project missing");
      return api.leaveProject(projectId);
    },
    onSuccess: () => showToast("success", "Left project"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useRemoveProjectMemberMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (memberId: string) => {
      if (!projectId) throw new Error("Project missing");
      return api.removeProjectMember(projectId, memberId);
    },
    onSuccess: () => showToast("success", "Member removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useUpdateProjectMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: ProjectMutationPayload) => {
      if (!projectId) throw new Error("Project missing");
      return api.updateProject(projectId, payload);
    },
    onSuccess: () => showToast("success", "Project updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

export const useProjectLifecycleMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (action: "complete" | "archive" | "restore" | "delete" | "sync") => {
      if (!projectId) throw new Error("Project missing");

      if (action === "complete") return api.completeProject(projectId);
      if (action === "archive") return api.archiveProject(projectId);
      if (action === "restore") return api.restoreProject(projectId);
      if (action === "delete") return api.deleteProject(projectId);
      return api.syncGithubProject(projectId);
    },
    onSuccess: (_result, action) => {
      const labels = {
        complete: "Project completed",
        archive: "Project archived",
        restore: "Project restored",
        delete: "Project deleted",
        sync: "GitHub metadata synced",
      };
      showToast("success", labels[action]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateProject(queryClient, projectId),
  });
};

const invalidateSocial = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });

  if (userId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.social.followers(userId, 20) });
    queryClient.invalidateQueries({ queryKey: queryKeys.social.following(userId, 20) });
    queryClient.invalidateQueries({ queryKey: queryKeys.social.connections(userId, 20) });
  }
};

export const useFollowersQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.followers(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.followers(userId || "", limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

export const useFollowingQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.following(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.following(userId || "", limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

export const useConnectionsQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.connections(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.connections(userId || "", limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

export const useSuggestedConnectionsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.social.suggested(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.suggestedConnections(limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(user),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 60_000,
  });
};

export const useMutualConnectionsQuery = (userId?: string, limit = 12) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.social.mutual(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.mutualConnections(userId || "", limit, { cursor: pageParam, signal });
      return result.data;
    },
    enabled: Boolean(user && userId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};

export const useFollowUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.followUser(userId);
    },
    onSuccess: () => showToast("success", "User followed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};

export const useUnfollowUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.unfollowUser(userId);
    },
    onSuccess: () => showToast("success", "User unfollowed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};

export const useConnectUserMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) throw new Error("Login required");
      return api.connectUser(userId);
    },
    onSuccess: () => showToast("success", "Connection request sent"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, userId) => {
      invalidateSocial(queryClient, user?.id);
      invalidateSocial(queryClient, userId);
    },
  });
};

export const useReviewConnectionMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ connectionId, status }: { connectionId: string; status: "ACCEPTED" | "REJECTED" }) =>
      api.reviewConnection(connectionId, status),
    onSuccess: (_result, variables) => {
      showToast("success", variables.status === "ACCEPTED" ? "Connection accepted" : "Connection rejected");
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateSocial(queryClient, user?.id),
  });
};

export const usePlatformSearchMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (query: string): Promise<SearchResults> => {
      const trimmed = query.trim();

      if (!trimmed) {
        return {};
      }

      const [globalResult, userResult, projectResult] = await Promise.all([
        api.searchGlobal(trimmed),
        api.searchUsers(trimmed),
        api.searchProjects(trimmed),
      ]);

      return {
        ...globalResult.data,
        users: userResult.data,
        projects: projectResult.data,
      };
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useNotificationsQuery = (page = 1, limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(page, limit),
    queryFn: async ({ signal }) => {
      const result = await api.notifications(page, limit, { signal });
      return result.data;
    },
    enabled: Boolean(user),
    refetchInterval: user ? 30_000 : false,
  });
};

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          let changedUnread = false;

          return {
            ...page,
            notifications: page.notifications.map((notification) => {
              if (notification.id !== id || notification.isRead) {
                return notification;
              }

              changedUnread = true;
              return {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              };
            }),
            unreadCount: changedUnread ? Math.max(page.unreadCount - 1, 0) : page.unreadCount,
          };
        },
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) =>
          page
            ? {
                ...page,
                unreadCount: 0,
                notifications: page.notifications.map((notification) => ({
                  ...notification,
                  isRead: true,
                  readAt: notification.readAt || new Date().toISOString(),
                })),
              }
            : page,
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useArchiveNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.archiveNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const archived = page.notifications.find((notification) => notification.id === id);

          return {
            ...page,
            notifications: page.notifications.filter((notification) => notification.id !== id),
            unreadCount:
              archived && !archived.isRead
                ? Math.max(page.unreadCount - 1, 0)
                : page.unreadCount,
          };
        },
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};
