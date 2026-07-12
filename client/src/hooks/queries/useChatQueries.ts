import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  api,
  ChatMessage,
  ChatMessagesPage,
  Conversation,
  ConversationParticipant,
  CreateGroupConversationPayload,
  SendMessagePayload
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../core/contexts/AuthContext";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

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

export const useConversationsQuery = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: async ({ signal }) => {
      const result = await api.conversations({ signal });
      return result.data || [];
    },
    enabled: Boolean(user),
    // Step 3 & 4: staleTime prevents duplicate fetches on StrictMode double-mount.
    // The ChatIconButton (rendered on every page) shares this cached result.
    staleTime: 60_000,
    refetchInterval: user ? 45_000 : false,
    // Step 3: Don't retry aborted requests (caused by StrictMode unmount/remount).
    retry: false,
    // Step 5: Aborted fetches (DOMException name=AbortError) must NOT bubble to
    // the global AppErrorBoundary, otherwise the feed shows "Something went wrong".
    throwOnError: (error: Error) => error.name !== "AbortError" && error.name !== "CanceledError",
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
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.archived() });
    },
    onError: (error) => showToast("error", getErrorMessage(error)),
  });
};
