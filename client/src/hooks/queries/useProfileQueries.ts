import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  Education,
  Experience,
  User,
  UserSkill
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";
import { invalidateTeams } from "./useTeamQueries";

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

export const usePromoteMemberMutation = (teamId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ memberUserId, role }: { memberUserId: string; role: "MEMBER" | "ADMIN" }) => {
      if (!teamId) throw new Error("Team missing");
      return api.promoteMember(teamId, memberUserId, role);
    },
    onSuccess: () => showToast("success", "Member role updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateTeams(queryClient, teamId),
  });
};


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


export const useUserProfileQuery = (userId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.publicProfile(userId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.userProfile(userId || "", { signal });
      return result.data;
    },
    enabled: Boolean(user && userId),
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
      const result = await api.myExperiences(limit, {
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


export const useMyEducationsQuery = (limit = 8) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.users.educations,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myEducations(limit, {
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


export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { setUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: Parameters<typeof api.updateProfile>[0]) =>
      api.updateProfile(payload),
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
    mutationFn: (payload: Parameters<typeof api.addSkill>[0]) =>
      api.addSkill(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.skills });
      const previous = queryClient.getQueryData<{
        pages: Array<{
          skills: UserSkill[];
          nextCursor?: string | null;
          hasNextPage?: boolean;
          limit?: number;
        }>;
        pageParams: unknown[];
      }>(queryKeys.users.skills);

      queryClient.setQueryData<typeof previous>(
        queryKeys.users.skills,
        (data) => {
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
        },
      );

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
    mutationFn: (payload: Parameters<typeof api.addExperience>[0]) =>
      api.addExperience(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.users.experiences,
      });
      const previous = queryClient.getQueryData<{
        pages: Array<{
          experiences: Experience[];
          nextCursor?: string | null;
          hasNextPage?: boolean;
          limit?: number;
        }>;
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

      queryClient.setQueryData<typeof previous>(
        queryKeys.users.experiences,
        (data) => {
          if (!data?.pages?.[0]) return data;

          return {
            ...data,
            pages: data.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    experiences: [optimisticExperience, ...page.experiences],
                  }
                : page,
            ),
          };
        },
      );

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
    mutationFn: (payload: Parameters<typeof api.addEducation>[0]) =>
      api.addEducation(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.educations });
      const previous = queryClient.getQueryData<{
        pages: Array<{
          educations: Education[];
          nextCursor?: string | null;
          hasNextPage?: boolean;
          limit?: number;
        }>;
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

      queryClient.setQueryData<typeof previous>(
        queryKeys.users.educations,
        (data) => {
          if (!data?.pages?.[0]) return data;

          return {
            ...data,
            pages: data.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    educations: [optimisticEducation, ...page.educations],
                  }
                : page,
            ),
          };
        },
      );

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


export const useRemoveSkillMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (skillId: string) => api.deleteSkill(skillId),
    onSuccess: () => showToast("success", "Skill removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.skills });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useVerifySkillsMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => api.verifySkills(),
    onSuccess: (res) => showToast("success", res.message || "Skills verification complete"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.skills });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useUpgradePremiumMutation = () => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => api.upgradePremium(),
    onSuccess: async (res) => {
      showToast("success", res.message || "Successfully upgraded to Recruiter Premium!");
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};


export const useRemoveExperienceMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (experienceId: string) => api.deleteExperience(experienceId),
    onSuccess: () => showToast("success", "Experience removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.experiences });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useRemoveEducationMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (educationId: string) => api.deleteEducation(educationId),
    onSuccess: () => showToast("success", "Education removed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.educations });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useUpdateExperienceMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Parameters<typeof api.updateExperience>[1]) =>
      api.updateExperience(id, payload),
    onSuccess: () => showToast("success", "Experience updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.experiences });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useUpdateEducationMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Parameters<typeof api.updateEducation>[1]) =>
      api.updateEducation(id, payload),
    onSuccess: () => showToast("success", "Education updated"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.educations });
      invalidateUserProfile(queryClient, user);
    },
  });
};


export const useUserTimelineQuery = (userId: string) => {
  return useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: async ({ signal }) => {
      const result = await api.userTimeline(userId, { signal });
      return result.data || [];
    },
    enabled: Boolean(userId),
  });
};


export const useEngineeringPortfolioQuery = (username?: string) =>
  useQuery({
    queryKey: queryKeys.engineering.portfolio(username || ""),
    queryFn: async ({ signal }) => {
      const result = await api.engineeringPortfolio(username || "", { signal });
      return result.data;
    },
    enabled: Boolean(username),
  });


export const useGetPresignedUrlMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      filename: string;
      contentType: string;
      purpose: "avatar" | "letterhead" | "attachment";
    }) => api.getPresignedUrl(payload),
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useUpdateCampusOutreachPreferenceMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: { openToCampusOutreach: boolean }) =>
      api.updateCampusOutreachPreference(body),
    onSuccess: (result) => {
      showToast(
        "success",
        result.data?.openToCampusOutreach
          ? "You are now visible to premium recruiters!"
          : "Campus outreach preference updated."
      );
      invalidateUserProfile(queryClient, user);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};
