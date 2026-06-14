import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  api,
  ChatMessage,
  ChatMessagesPage,
  CollegeMutationPayload,
  CompanyMutationPayload,
  CompanyType,
  CompanySize,
  Conversation,
  ConversationParticipant,
  CreateGroupConversationPayload,
  CommunityMutationPayload,
  Education,
  FeedItem,
  FeedPost,
  HackathonEvaluationPayload,
  HackathonMutationPayload,
  HackathonSubmissionPayload,
  InteractionPayload,
  JobApplicationPayload,
  JobApplicationStatusPayload,
  Experience,
  NotificationsPage,
  Project,
  ProjectInvite,
  ProjectJoinRequest,
  ProjectMutationPayload,
  ReferralRequestPayload,
  ReferralRequestStatus,
  SearchResults,
  SendMessagePayload,
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

type InfiniteMessagesCache = {
  pages: ChatMessagesPage[];
  pageParams: unknown[];
};

type ChatSettingsInput =
  | { action: "pin" }
  | { action: "mute"; muted?: boolean }
  | { action: "archive" }
  | { action: "add-participant"; userId: string }
  | { action: "remove-participant"; userId: string };

const updateMessageInCache = (
  data: InfiniteMessagesCache | undefined,
  message: ChatMessage,
) => {
  if (!data?.pages?.length) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((item) =>
        item.id === message.id ? message : item,
      ),
    })),
  };
};

const updateConversationParticipant = (
  conversation: Conversation,
  participant?: ConversationParticipant,
) => {
  if (!participant) return conversation;

  return {
    ...conversation,
    unreadCount: participant.unreadCount ?? conversation.unreadCount,
    participants: (conversation.participants || []).map((item) =>
      item.id === participant.id || item.userId === participant.userId
        ? { ...item, ...participant }
        : item,
    ),
  };
};

const addConversationMessagePreview = (
  conversation: Conversation,
  message: ChatMessage,
  currentUserId?: string,
) => ({
  ...conversation,
  messages: [message],
  messageCount: (conversation.messageCount || 0) + 1,
  lastMessageAt: message.createdAt || new Date().toISOString(),
  updatedAt: message.createdAt || new Date().toISOString(),
  unreadCount:
    message.senderId !== currentUserId
      ? (conversation.unreadCount || 0) + 1
      : conversation.unreadCount || 0,
});

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

export const useConversationsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: async ({ signal }) => {
      const result = await api.conversations({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    refetchInterval: user ? 45_000 : false,
  });
};

export const useArchivedConversationsQuery = (enabled = false) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.chat.archived(),
    queryFn: async ({ signal }) => {
      const result = await api.getArchivedConversations({ signal });
      return result.data || [];
    },
    enabled: Boolean(user && enabled),
  });
};

export const useConversationMessagesQuery = (conversationId?: string) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId || ""),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.conversationMessages(conversationId || "", {
        cursor: pageParam,
        signal,
      });
      return result.data;
    },
    enabled: Boolean(user && conversationId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    // No refetchInterval: socket handles real-time updates, periodic refetch causes duplicates
  });
};

export const useSearchMessagesQuery = (conversationId?: string, query = "") => {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.chat.search(conversationId || "", trimmed),
    queryFn: async ({ signal }) => {
      const result = await api.searchMessages(conversationId || "", trimmed, {
        signal,
      });
      return result.data || [];
    },
    enabled: Boolean(conversationId && trimmed.length >= 2),
  });
};

const invalidateChat = (
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  if (conversationId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.chat.messages(conversationId),
    });
  }
};

export const useCreateDirectConversationMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createDirectConversation(userId);
    },
    onSuccess: () => showToast("success", "Conversation ready"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateChat(queryClient),
  });
};

export const useCreateGroupConversationMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateGroupConversationPayload) => {
      if (!user) {
        throw new Error("Login required");
      }

      return api.createGroupConversation(payload);
    },
    onSuccess: () => showToast("success", "Group created"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateChat(queryClient),
  });
};

export const useSendMessageMutation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: SendMessagePayload) => {
      if (!user) {
        throw new Error("Login required");
      }
      if (!conversationId) {
        throw new Error("Conversation missing");
      }

      return api.sendMessage(conversationId, payload);
    },
    onMutate: async (payload) => {
      if (!conversationId || !user) return undefined;

      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(conversationId),
      });
      const previous = queryClient.getQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(conversationId),
      );
      const now = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: `pending-${Date.now()}`,
        conversationId,
        senderId: user.id,
        content: payload.content,
        type: payload.type || "TEXT",
        attachments: payload.attachments,
        replyToMessageId: payload.replyToMessageId,
        readByUsers: [user.id],
        sender: user,
        createdAt: now,
      };

      queryClient.setQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(conversationId),
        (data) => {
          if (!data?.pages?.length) return data;

          return {
            ...data,
            pages: data.pages.map((page, index) =>
              index === data.pages.length - 1
                ? { ...page, messages: [...page.messages, optimisticMessage] }
                : page,
            ),
          };
        },
      );

      queryClient.setQueryData<Conversation[]>(
        queryKeys.chat.conversations(),
        (conversations) =>
          conversations?.map((conversation) =>
            conversation.id === conversationId
              ? addConversationMessagePreview(
                  conversation,
                  optimisticMessage,
                  user.id,
                )
              : conversation,
          ),
      );

      return { previous, optimisticId: optimisticMessage.id };
    },
    onError: (error, _payload, context) => {
      if (conversationId && context?.previous) {
        queryClient.setQueryData(
          queryKeys.chat.messages(conversationId),
          context.previous,
        );
      }
      showToast("error", getErrorMessage(error));
    },
    onSuccess: (result, _payload, context) => {
      if (!conversationId) return;

      queryClient.setQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(conversationId),
        (data) => {
          if (!data?.pages?.length) return data;

          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              messages: page.messages
                .map((message) =>
                  message.id === context?.optimisticId ? result.data : message,
                )
                .filter(
                  (message, index, messages) =>
                    messages.findIndex((item) => item.id === message.id) ===
                    index,
                ),
            })),
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });
};

export const useMarkConversationReadMutation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!conversationId) throw new Error("Conversation missing");
      return api.markConversationRead(conversationId);
    },
    onMutate: async () => {
      if (!conversationId) return;

      const updateConvList = (conversations: Conversation[] | undefined) =>
        conversations?.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                unreadCount: 0,
                participants: conversation.participants?.map((p) =>
                  p.userId === user?.id ? { ...p, unreadCount: 0 } : p,
                ),
              }
            : conversation,
        );

      queryClient.setQueryData<Conversation[]>(
        queryKeys.chat.conversations(),
        updateConvList,
      );

      queryClient.setQueryData<Conversation[]>(
        queryKeys.chat.archived(),
        updateConvList,
      );
    },
    onSuccess: (result) => {
      if (!conversationId || !user) return;

      queryClient.setQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(conversationId),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((message) =>
                    result.data.messageIds.includes(message.id)
                      ? {
                          ...message,
                          readByUsers: Array.from(
                            new Set([...(message.readByUsers || []), user.id]),
                          ),
                        }
                      : message,
                  ),
                })),
              }
            : data,
      );
    },
  });
};

export const useChatMessageActionMutation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (
      input:
        | { action: "react"; messageId: string; emoji: string }
        | { action: "edit"; messageId: string; content: string }
        | { action: "delete"; messageId: string }
        | {
            action: "forward";
            messageId: string;
            targetConversationId: string;
          },
    ) => {
      if (input.action === "react")
        return api.reactToMessage(input.messageId, input.emoji);
      if (input.action === "edit")
        return api.editMessage(input.messageId, input.content);
      if (input.action === "delete") return api.deleteMessage(input.messageId);
      return api.forwardMessage(input.messageId, input.targetConversationId);
    },
    onSuccess: (result, input) => {
      if (
        conversationId &&
        (input.action === "edit" || input.action === "delete") &&
        result.data &&
        "id" in result.data
      ) {
        queryClient.setQueryData<InfiniteMessagesCache>(
          queryKeys.chat.messages(conversationId),
          (data) => updateMessageInCache(data, result.data as ChatMessage),
        );
      }

      const labels = {
        react: "Reaction saved",
        edit: "Message edited",
        delete: "Message deleted",
        forward: "Message forwarded",
      };
      showToast("success", labels[input.action]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.messages(conversationId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });
};

export const useConversationSettingsMutation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<unknown, Error, ChatSettingsInput>({
    mutationFn: (input) => {
      if (!conversationId) throw new Error("Conversation missing");

      if (input.action === "pin")
        return api.togglePinConversation(conversationId);
      if (input.action === "mute")
        return api.toggleMuteConversation(conversationId, input.muted);
      if (input.action === "archive")
        return api.toggleArchiveConversation(conversationId);
      if (input.action === "add-participant") {
        return api.addConversationParticipant(conversationId, input.userId);
      }
      return api.removeConversationParticipant(conversationId, input.userId);
    },
    onSuccess: (result, input) => {
      if (input.action === "pin" || input.action === "mute") {
        const participantResult = result as { data: ConversationParticipant };

        queryClient.setQueryData<Conversation[]>(
          queryKeys.chat.conversations(),
          (conversations) =>
            conversations?.map((conversation) =>
              conversation.id === conversationId
                ? updateConversationParticipant(
                    conversation,
                    participantResult.data,
                  )
                : conversation,
            ),
        );
      }

      const labels = {
        pin: "Conversation updated",
        mute: "Notification preference updated",
        archive: "Conversation archived",
        "add-participant": "Participant added",
        "remove-participant": "Participant removed",
      };
      showToast("success", labels[input.action]);
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateChat(queryClient, conversationId),
  });
};

export const useDeleteConversationMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (conversationId: string) => {
      if (!conversationId) throw new Error("Conversation missing");
      return api.deleteConversation(conversationId);
    },
    onSuccess: () => {
      showToast("success", "Conversation deleted");
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.archived() });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
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
        queryClient.invalidateQueries({
          queryKey: queryKeys.colleges.departments(collegeId),
        });
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

export const useSuggestedCommunitiesQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.communities(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCommunities(limit, { signal });
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

export const useJoinedCommunitiesQuery = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.communities.joined(),
    queryFn: async ({ signal }) => {
      const result = await api.joinedCommunities({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
  });
};

export const useJoinCommunityMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (communityId: string) => api.joinCommunity(communityId),
    onSuccess: () => {
      invalidateCommunity(queryClient, slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.suggested() });
      showToast("success", "Successfully joined community");
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useLeaveCommunityMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (communityId: string) => api.leaveCommunity(communityId),
    onSuccess: () => {
      invalidateCommunity(queryClient, slug);
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joined() });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.suggested() });
      showToast("success", "Left community successfully");
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useCommunityJoinRequestsQuery = (slug: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.communities.joinRequests(slug),
    queryFn: async () => {
      const res = await api.getCommunityJoinRequests(slug);
      return res.data;
    },
    enabled: !!slug && enabled,
  });
};

export const useReviewCommunityJoinRequestMutation = (slug: string) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ pendingUserId, action }: { pendingUserId: string; action: "approve" | "reject" }) => {
      const res = await api.reviewCommunityJoinRequest(slug, pendingUserId, action);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.joinRequests(slug) });
      invalidateCommunity(queryClient, slug);
      showToast("success", `Request ${res.status === "approved" ? "approved" : "declined"} successfully`);
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};


const invalidateCommunity = (
  queryClient: ReturnType<typeof useQueryClient>,
  slug?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

  if (slug) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.communities.detail(slug),
    });
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

const invalidateHackathon = (
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

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();
  const { refreshUser, user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      content: string;
      type: string;
      tags?: string[];
      visibility?: string;
    }) => {
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
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "like" | "save";
    }) => {
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
        queryClient.setQueriesData<FeedItem[]>(
          { queryKey: queryKeys.feed.all },
          (items) =>
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
      showToast(
        "success",
        variables.action === "like" ? "Post liked" : "Post saved",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
};

export const useCommentOnPostMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      content,
      parentCommentId,
    }: {
      id: string;
      content: string;
      parentCommentId?: string;
    }) => {
      if (!user) throw new Error("Login required");
      return api.commentOnPost(id, { content, parentCommentId });
    },
    onSuccess: () => showToast("success", "Comment added"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.post(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useRepostMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, caption }: { id: string; caption?: string }) => {
      if (!user) throw new Error("Login required");
      return api.repostPost(id, caption ? { caption } : undefined);
    },
    onSuccess: () => showToast("success", "Post reposted"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed.post(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
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

const invalidateSocial = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.social.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.users.full });
  queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });

  if (userId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.followers(userId, 20),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.following(userId, 20),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.social.connections(userId, 20),
    });
  }
};

export const useFollowersQuery = (userId?: string, limit = 20) =>
  useInfiniteQuery({
    queryKey: queryKeys.social.followers(userId || "", limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.followers(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
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
      const result = await api.following(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
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
      const result = await api.connections(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
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
      const result = await api.suggestedConnections(limit, {
        cursor: pageParam,
        signal,
      });
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
      const result = await api.mutualConnections(userId || "", limit, {
        cursor: pageParam,
        signal,
      });
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
    mutationFn: ({
      connectionId,
      status,
    }: {
      connectionId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => api.reviewConnection(connectionId, status),
    onSuccess: (_result, variables) => {
      showToast(
        "success",
        variables.status === "ACCEPTED"
          ? "Connection accepted"
          : "Connection rejected",
      );
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => invalidateSocial(queryClient, user?.id),
  });
};

export type PlatformSearchPayload =
  | { tab: "all"; q: string }
  | { tab: "people"; q: string; people?: { college?: string; year?: string; skills?: string; role?: string; openToWork?: boolean; acceptingReferrals?: boolean } }
  | { tab: "projects"; q: string; project?: { techStack?: string; status?: string; acceptingCollaborators?: boolean } }
  | { tab: "jobs"; q: string; job?: { company?: string; location?: string; workMode?: string; experienceLevel?: string; salaryMin?: string; salaryMax?: string; skills?: string; freshness?: string } }
  | { tab: "hackathons"; q: string; hack?: { tags?: string; upcomingOnly?: boolean } }
  | { tab: "companies"; q: string; company?: { industry?: string; location?: string; hiringEnabled?: boolean; referralEnabled?: boolean } }
  | { tab: "communities"; q: string; community?: { type?: string; category?: string } }
  | { tab: "posts"; q: string };

export const usePlatformSearchMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: PlatformSearchPayload | string): Promise<SearchResults> => {
      // Legacy string support
      if (typeof payload === "string") {
        const q = payload.trim();
        if (!q) return {};
        const [globalResult, userResult, projectResult] = await Promise.all([
          api.searchGlobal(q),
          api.searchUsers({ q }),
          api.searchProjects({ q }),
        ]);
        // Server returns { user, relevanceScore }[] — flatten to raw User[]
        const rawUsers: any[] = userResult.data || [];
        const flatUsers = rawUsers.map((item: any) =>
          item?.id ? item : { ...item?.user, affinityScore: item?.relevanceScore }
        );
        // Server returns { project, relevanceScore }[] — flatten to raw Project[]
        const rawProjects: any[] = projectResult.data || [];
        const flatProjects = rawProjects.map((item: any) =>
          item?.id ? item : { ...item?.project }
        );
        return { ...globalResult.data, users: flatUsers, projects: flatProjects };
      }

      const q = payload.q.trim();

      // Helper: server returns { user, relevanceScore, matchReasons }[] from searchUsers
      const flattenUsers = (data: any[]): any[] => {
        if (!data?.length) return [];
        // If first item is a raw user (has 'id'), return as-is
        if (data[0]?.id) return data;
        // Otherwise flatten the wrapped format
        return data.map((item: any) => ({
          ...item.user,
          affinityScore: item.relevanceScore,
        }));
      };

      // Helper: server returns { project, relevanceScore }[] from searchProjects
      const flattenProjects = (data: any[]): any[] => {
        if (!data?.length) return [];
        if (data[0]?.id) return data;
        return data.map((item: any) => ({ ...item.project, relevanceScore: item.relevanceScore }));
      };

      // ── People ────────────────────────────────────────────────────────────
      if (payload.tab === "people") {
        const f = (payload as any).people || {};
        const result = await api.searchUsers({
          ...(q && { q }),
          ...(f.college && { collegeName: f.college }),
          ...(f.year && { graduationYears: f.year }),
          ...(f.skills && { skills: f.skills }),
          ...(f.openToWork && { openToWork: true }),
          ...(f.acceptingReferrals && { acceptingReferrals: true }),
          ...(f.role && { role: f.role }),
        });
        return { users: flattenUsers(result.data as any) };
      }

      // ── Projects ──────────────────────────────────────────────────────────
      if (payload.tab === "projects") {
        const f = (payload as any).project || {};
        const result = await api.searchProjects({
          ...(q && { q }),
          ...(f.techStack && { techStack: f.techStack }),
          ...(f.status && { status: f.status }),
          ...(f.acceptingCollaborators && { lookingForCollaborators: true }),
        } as any);
        return { projects: flattenProjects(result.data as any) };
      }

      // ── Jobs ──────────────────────────────────────────────────────────────
      if (payload.tab === "jobs") {
        const f = (payload as any).job || {};
        const result = await api.searchJobs({
          ...(q && { q }),
          ...(f.company && { companyName: f.company }),
          ...(f.location && { location: f.location }),
          ...(f.workMode && { workMode: f.workMode }),
          ...(f.experienceLevel && { experienceLevel: f.experienceLevel }),
          ...(f.skills && { skills: f.skills }),
          ...(f.salaryMin && { salaryMin: Number(f.salaryMin) }),
          ...(f.salaryMax && { salaryMax: Number(f.salaryMax) }),
          ...(f.freshness && { postedWithinDays: Number(f.freshness) }),
        });
        return { jobs: result.data };
      }

      // ── Hackathons ────────────────────────────────────────────────────────
      if (payload.tab === "hackathons") {
        const f = (payload as any).hack || {};
        const result = await api.searchHackathons({
          ...(q && { q }),
          ...(f.tags && { tags: f.tags }),
          ...(f.upcomingOnly && { upcomingOnly: true }),
        } as any);
        return { hackathons: result.data };
      }

      // ── Companies ─────────────────────────────────────────────────────────
      if (payload.tab === "companies") {
        const f = (payload as any).company || {};
        const result = await api.searchCompanies({
          ...(q && { q }),
          ...(f.industry && { industry: f.industry }),
          ...(f.location && { location: f.location }),
          ...(f.hiringEnabled && { hiringEnabled: "true" }),
          ...(f.referralEnabled && { referralEnabled: "true" }),
        });
        return { companies: result.data };
      }

      // ── Communities ───────────────────────────────────────────────────────
      if (payload.tab === "communities") {
        const f = (payload as any).community || {};
        const result = await api.searchCommunities({
          ...(q && { q }),
          ...(f.type && { type: f.type }),
          ...(f.category && { category: f.category }),
        });
        return { communities: result.data };
      }

      // ── All (global) ──────────────────────────────────────────────────────
      // Run with whatever query is available; even empty query returns top results
      const searchQuery = q || undefined;
      const [globalResult, userResult, projectResult, jobResult, companyResult, communityResult] = await Promise.all([
        searchQuery ? api.searchGlobal(searchQuery) : Promise.resolve({ data: {} as any }),
        api.searchUsers({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchProjects({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchJobs({ ...(searchQuery && { q: searchQuery }), limit: 12 }),
        api.searchCompanies({ ...(searchQuery && { q: searchQuery }), limit: 8 }),
        api.searchCommunities({ ...(searchQuery && { q: searchQuery }), limit: 8 }),
      ]);
      return {
        ...(searchQuery ? globalResult.data : {}),
        users: flattenUsers(userResult.data as any),
        projects: flattenProjects(projectResult.data as any),
        jobs: jobResult.data,
        companies: companyResult.data,
        communities: communityResult.data,
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
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
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
            unreadCount: changedUnread
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

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
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
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const archived = page.notifications.find(
            (notification) => notification.id === id,
          );

          return {
            ...page,
            notifications: page.notifications.filter(
              (notification) => notification.id !== id,
            ),
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

export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const snapshots = queryClient.getQueriesData<NotificationsPage>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsPage>(
        { queryKey: queryKeys.notifications.all },
        (page) => {
          if (!page) return page;

          const deleted = page.notifications.find(
            (notification) => notification.id === id,
          );

          return {
            ...page,
            notifications: page.notifications.filter(
              (notification) => notification.id !== id,
            ),
            unreadCount:
              deleted && !deleted.isRead
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


// Discovery & Recommendations
export const useDiscoveryFeedQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.feed(),
    queryFn: async ({ signal }) => {
      const result = await api.discoveryFeed({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

export const useSuggestedEngineersQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.engineers(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedEngineers(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

export const useSuggestedMentorsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.mentors(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedMentors(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

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

export const useSuggestedCollaboratorsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.collaborators(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedCollaborators(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
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

export const useSuggestedPostsQuery = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.discovery.suggested.posts(limit),
    queryFn: async ({ signal }) => {
      const result = await api.suggestedPosts(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

export const useTrendingCommunitiesQuery = () => {
  return useQuery({
    queryKey: queryKeys.discovery.trending.communities(),
    queryFn: async ({ signal }) => {
      const result = await api.trendingCommunities({ signal });
      return result.data || [];
    },
    staleTime: 300_000, // 5 minutes
  });
};

export const useCommunityBySlugQuery = (
  slug?: string,
  page = 1,
  limit = 10,
) => {
  return useQuery({
    queryKey: queryKeys.communities.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.communityBySlug(slug || "", page, limit, {
        signal,
      });
      return result.data;
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
};

export const useTrackRecommendationImpressionMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: {
      entityId: string;
      entityType: string;
      position?: number;
      clicked?: boolean;
      hidden?: boolean;
    }) => api.trackRecommendationImpression(body),
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const usePostQuery = (postId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.feed.post(postId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.post(
        postId || "",
        { commentsLimit: 20, repliesLimit: 5 },
        { signal },
      );
      return result.data;
    },
    enabled: Boolean(postId && enabled),
  });

export const useJobQuery = (slug?: string) =>
  useQuery({
    queryKey: queryKeys.jobs.detail(slug || ""),
    queryFn: async ({ signal }) => {
      const result = await api.job(slug || "", { signal });
      return result.data;
    },
    enabled: Boolean(slug),
  });

export const useCompanyJobsQuery = (companyId?: string) =>
  useQuery({
    queryKey: queryKeys.jobs.company(companyId || ""),
    queryFn: async ({ signal }) => {
      const result = await api.companyJobs(companyId || "", { signal });
      return result.data || [];
    },
    enabled: Boolean(companyId),
  });

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

export const useRecommendedCollaboratorsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.recommendations.collaborators(),
    queryFn: async ({ signal }) => {
      const result = await api.recommendedCollaborators({ signal });
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
    onSuccess: () => showToast("success", "Saved jobs updated"),
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

export const useMyReputationQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.reputation.me(),
    queryFn: async ({ signal }) => {
      const result = await api.myReputation({ signal });
      return result.data;
    },
    enabled: Boolean(user),
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
    staleTime: 60_000,
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

export const useEngineeringPortfolioQuery = (username?: string) =>
  useQuery({
    queryKey: queryKeys.engineering.portfolio(username || ""),
    queryFn: async ({ signal }) => {
      const result = await api.engineeringPortfolio(username || "", { signal });
      return result.data;
    },
    enabled: Boolean(username),
  });

export const useMyActivityTimelineQuery = (limit = 20) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.activities.timeline(limit),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.myActivityTimeline(limit, {
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

export const useTrackInteractionMutation = () =>
  useMutation({
    mutationFn: (payload: InteractionPayload) => api.trackInteraction(payload),
  });

export const useRebuildAffinitiesMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Login required");
      return api.rebuildAffinities();
    },
    onSuccess: () => showToast("success", "Affinities rebuilt"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.affinity.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations.all,
      });
    },
  });
};

export const useTrendingFeedQuery = (limit = 100) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.trending.feed(limit),
    queryFn: async ({ signal }) => {
      const result = await api.trendingFeed(limit, { signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
};

export const useTrackTrendingImpressionMutation = () =>
  useMutation({
    mutationFn: (payload: InteractionPayload) =>
      api.trackTrendingImpression(payload),
  });

export const useRefreshTrendingMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Login required");
      return api.refreshTrending();
    },
    onSuccess: () => showToast("success", "Trending refreshed"),
    onError: (error) => showToast("error", getErrorMessage(error)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trending.feed(100) }),
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


export const useAdminStatsQuery = () => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");

  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: async ({ signal }) => {
      const result = await api.getAdminStats({ signal });
      return result.data;
    },
    enabled: Boolean(user && isPlatformAdmin),
  });
};

export const useAdminUsersQuery = (search: string, limit = 50) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");

  return useInfiniteQuery({
    queryKey: queryKeys.admin.users(search),
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.listAdminUsers(
        { search, limit, cursor: pageParam },
        { signal }
      );
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};

export const useUpdateUserStatusMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ACTIVE" | "INACTIVE" | "BANNED" }) =>
      api.updateUserStatus(userId, { status }),
    onSuccess: (result) => {
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
    onSuccess: (result) => {
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
    onSuccess: (result) => {
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
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
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
    onSuccess: (result) => {
      showToast("success", result.message || "Post removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "posts"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useAdminHackathonsQuery = (q: string, cursor?: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
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
    onSuccess: (result) => {
      const stats = result.data;
      showToast(
        "success",
        `Scraper run complete! Fetched: ${stats.totalFetched}, Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "hackathons"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useAdminProjectsQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
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

export const useAdminJobsQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
  return useInfiniteQuery({
    queryKey: ["admin", "content", "jobs", q],
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.adminListJobs({ q: q || undefined, limit: 20, cursor: pageParam }, { signal });
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: Boolean(user && isPlatformAdmin),
  });
};

export const useAdminDeleteJobMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (jobId: string) => api.adminDeleteJob(jobId),
    onSuccess: (result) => {
      showToast("success", result.message || "Job removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "content", "jobs"] });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};

export const useAdminCommunitiesQuery = (q: string) => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
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
  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
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

