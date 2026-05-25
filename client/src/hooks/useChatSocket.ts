import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { authStorage } from "../lib/storage";
import { api, ChatMessage, ChatMessagesPage, Conversation } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

type InfiniteMessagesCache = {
  pages: ChatMessagesPage[];
  pageParams: unknown[];
};

type MessageCreatedPayload = {
  conversationId: string;
  message: ChatMessage;
};

type MessageSeenPayload = {
  conversationId: string;
  userId: string;
  readAt: string;
  messageIds: string[];
};

const socketUrl = api.baseUrl.replace(/\/api\/v1\/?$/, "");

const upsertMessage = (
  data: InfiniteMessagesCache | undefined,
  message: ChatMessage,
) => {
  if (!data?.pages?.length) return data;

  let exists = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.map((item) => {
      if (item.id === message.id) {
        exists = true;
        return message;
      }

      return item;
    });

    return {
      ...page,
      messages,
    };
  });

  if (!exists) {
    pages[pages.length - 1] = {
      ...pages[pages.length - 1],
      messages: [...pages[pages.length - 1].messages, message],
    };
  }

  return {
    ...data,
    pages,
  };
};

export function useChatSocket(activeConversationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef(activeConversationId);
  const typingTimeouts = useRef<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const token = authStorage.getToken();

    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setTypingUserIds([]);
      return;
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 700,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("conversation_created", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    });

    socket.on("message_created", (payload: MessageCreatedPayload) => {
      queryClient.setQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(payload.conversationId),
        (data) => upsertMessage(data, payload.message),
      );

      queryClient.setQueryData<Conversation[]>(
        queryKeys.chat.conversations(),
        (conversations) => {
          if (!conversations) return conversations;

          return conversations
            .map((conversation) =>
              conversation.id === payload.conversationId
                ? {
                    ...conversation,
                    messages: [payload.message],
                    unreadCount:
                      payload.message.senderId !== user.id &&
                      payload.conversationId !== activeConversationRef.current
                        ? (conversation.unreadCount || 0) + 1
                        : conversation.unreadCount || 0,
                    lastMessageAt: payload.message.createdAt || conversation.lastMessageAt,
                    updatedAt: payload.message.createdAt || conversation.updatedAt,
                  }
                : conversation,
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt || b.lastMessageAt || 0).getTime() -
                new Date(a.updatedAt || a.lastMessageAt || 0).getTime(),
            );
        },
      );
    });

    socket.on("message_seen", (payload: MessageSeenPayload) => {
      queryClient.setQueryData<InfiniteMessagesCache>(
        queryKeys.chat.messages(payload.conversationId),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((message) =>
                    payload.messageIds.includes(message.id)
                      ? {
                          ...message,
                          readByUsers: Array.from(
                            new Set([...(message.readByUsers || []), payload.userId]),
                          ),
                        }
                      : message,
                  ),
                })),
              }
            : data,
      );

      if (payload.userId === user.id) {
        queryClient.setQueryData<Conversation[]>(
          queryKeys.chat.conversations(),
          (conversations) =>
            conversations?.map((conversation) =>
              conversation.id === payload.conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
        );
      }
    });

    socket.on(
      "user_typing",
      ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        if (conversationId !== activeConversationRef.current || userId === user.id) return;

        setTypingUserIds((current) =>
          current.includes(userId) ? current : [...current, userId],
        );

        window.clearTimeout(typingTimeouts.current[userId]);
        typingTimeouts.current[userId] = window.setTimeout(() => {
          setTypingUserIds((current) => current.filter((id) => id !== userId));
        }, 2500);
      },
    );

    socket.on(
      "user_stop_typing",
      ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        if (conversationId !== activeConversationRef.current) return;

        window.clearTimeout(typingTimeouts.current[userId]);
        setTypingUserIds((current) => current.filter((id) => id !== userId));
      },
    );

    socket.on("participant_added", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    });
    socket.on("participant_removed", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    });

    return () => {
      Object.values(typingTimeouts.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      typingTimeouts.current = {};
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, user]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !activeConversationId) {
      setTypingUserIds([]);
      return;
    }

    setTypingUserIds([]);
    socket.emit("join_conversation", activeConversationId);
  }, [activeConversationId, connected]);

  const emitTyping = useCallback(() => {
    if (activeConversationId) {
      socketRef.current?.emit("typing_start", { conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  const emitStopTyping = useCallback(() => {
    if (activeConversationId) {
      socketRef.current?.emit("typing_stop", { conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  const markSeenViaSocket = useCallback(() => {
    if (activeConversationId) {
      socketRef.current?.emit("message_seen", { conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  return useMemo(
    () => ({
      connected,
      typingUserIds,
      emitTyping,
      emitStopTyping,
      markSeenViaSocket,
    }),
    [connected, emitStopTyping, emitTyping, markSeenViaSocket, typingUserIds],
  );
}
