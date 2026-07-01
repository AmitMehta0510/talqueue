import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  HackathonSubmissionPayload,
  Project,
  ProjectInvite,
  ProjectJoinRequest,
  ProjectMutationPayload
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";
import { invalidateHackathon } from "./useHackathonQueries";

const invalidateProject = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

  if (projectId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.requests(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.sentInvites(projectId),
    });
  }
};

export const useProjectsQuery = (limit = 12) =>
  useQuery({
    queryKey: queryKeys.projects.list(limit),
    queryFn: async ({ signal }) => {
      const result = await api.projects(limit, { signal });
      return result.data || [];
    },
    staleTime: 2 * 60_000,   // sidebar projects: fresh for 2min
    gcTime: 10 * 60_000,
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


export const useProjectJoinRequestsQuery = (
  projectId?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.projects.requests(projectId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.projectJoinRequests(projectId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });


export const useSentProjectInvitesQuery = (
  projectId?: string,
  enabled = true,
) =>
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


export const useMyProjectsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.myProjects,
    queryFn: async ({ signal }) => {
      const result = await api.myProjects({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
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
      const project =
        variables && ("project" in variables ? variables.project : variables);

      if (project) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(project.id),
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};



export const useReviewProjectJoinRequestMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
    }: {
      requestId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => api.reviewProjectJoinRequest(requestId, status),
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "ACCEPTED"
          ? "Request accepted"
          : "Request rejected",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      invalidateProject(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};


export const useWithdrawProjectJoinRequestMutation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<ProjectJoinRequest, Error, string>({
    mutationFn: async (requestId) => {
      const result = await api.withdrawProjectJoinRequest(requestId);
      return result.data;
    },
    onSuccess: () => showToast("success", "Join request withdrawn"),
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
    mutationFn: ({
      inviteId,
      status,
    }: {
      inviteId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => api.reviewProjectInvite(inviteId, status),
    onMutate: async ({ inviteId, status }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.receivedInvites(),
      });
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
      queryClient.setQueryData(
        queryKeys.projects.receivedInvites(),
        context?.previous,
      );
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "ACCEPTED" ? "Invite accepted" : "Invite rejected",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.receivedInvites(),
      });
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
    mutationFn: (
      action: "complete" | "archive" | "restore" | "delete" | "sync",
    ) => {
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


export const useSuggestedProjectsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.projects(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedProjects(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};


export const useRecommendedProjectsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.projects(),
    queryFn: async ({ signal }) => {
      const result = await api.recommendedProjects({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};
