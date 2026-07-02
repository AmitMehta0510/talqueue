import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  Archive,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  Edit3,
  File as FileIcon,
  Forward,
  Image,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pin,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
import { useChatSocket } from "../hooks/useChatSocket";
import { useToast } from "../core/contexts/ToastContext";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";
import {
  useChatMessageActionMutation,
  useConversationMessagesQuery,
  useConversationsQuery,
  useArchivedConversationsQuery,
  useConversationSettingsMutation,
  useCreateDirectConversationMutation,
  useCreateGroupConversationMutation,
  useDeleteConversationMutation,
  useMarkConversationReadMutation,
  usePlatformSearchMutation,
  useSearchMessagesQuery,
  useSendMessageMutation,
} from "../hooks/usePlatformQueries";
import {
  ChatAttachment,
  ChatMessage,
  Conversation,
  User,
} from "../lib/api";
import {
  formatCount,
  formatDate,
  formatLastActive,
  formatMessageTime,
  formatRelativeDate,
  titleCase,
  userHeadline,
  userName,
} from "../core/utils/format";

const ALL_QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✅", "💡"];

const attachmentType = (file: globalThis.File): ChatAttachment["type"] => {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "FILE";
};

// Base64 file reader has been deprecated in favor of useFileUpload hook uploading to S3

const participantForUser = (conversation?: Conversation, userId?: string) =>
  conversation?.participants?.find((participant) => participant.userId === userId);

const otherParticipants = (conversation?: Conversation, userId?: string) =>
  (conversation?.participants || []).filter((participant) => participant.userId !== userId);

const userProfileUrl = (userId?: string, currentUserId?: string, username?: string) => {
  if (!userId) return "#";
  return userId === currentUserId ? "/profile" : `/users/${username || userId}`;
};

const conversationName = (conversation?: Conversation, userId?: string) => {
  if (!conversation) return "Conversation";
  if (conversation.title) return conversation.title;

  const others = otherParticipants(conversation, userId);
  if (conversation.type === "DIRECT") {
    return userName(others[0]?.user);
  }

  return others.map((participant) => userName(participant.user)).join(", ") || titleCase(conversation.type);
};

const conversationSubtitle = (conversation?: Conversation, userId?: string) => {
  if (!conversation) return "";
  if (conversation.description) return conversation.description;

  const lastMessage = conversation.messages?.[0];
  if (lastMessage) {
    const sender = lastMessage.senderId === userId ? "You" : userName(lastMessage.sender);
    const body = lastMessage.content || (lastMessage.attachments?.length ? "Sent an attachment" : titleCase(lastMessage.type));
    return `${sender}: ${body}`;
  }

  return `${conversation.participants?.length || 0} participants`;
};

const isGroupConversation = (conversation?: Conversation) =>
  Boolean(conversation && conversation.type !== "DIRECT");

/** Returns the date string "YYYY-MM-DD" for grouping messages by day */
const messageDay = (dateStr?: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
};

function ConversationAvatar({ conversation, currentUserId }: { conversation?: Conversation; currentUserId?: string }) {
  const other = otherParticipants(conversation, currentUserId)[0]?.user;

  if (conversation?.avatarUrl) {
    return (
      <img
        className="h-11 w-11 rounded-full object-cover"
        src={conversation.avatarUrl}
        alt={conversationName(conversation, currentUserId)}
      />
    );
  }

  if (conversation?.type === "DIRECT") {
    return <Avatar user={other} />;
  }

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
      <Users size={20} />
    </div>
  );
}

const ConversationRow = memo(function ConversationRow({
  conversation,
  currentUserId,
  active,
  isArchived,
}: {
  conversation: Conversation;
  currentUserId?: string;
  active?: boolean;
  isArchived?: boolean;
}) {
  const participant = participantForUser(conversation, currentUserId);
  const unread = conversation.unreadCount || participant?.unreadCount || 0;

  return (
    <Link
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
        active
          ? "bg-blue-50 border-l-4 border-blue-600 dark:bg-blue-900/20 dark:border-blue-400"
          : "border-l-4 border-transparent hover:bg-[var(--bg-surface-2)]"
      }`}
      to={`/chat/${conversation.id}`}
    >
      <div className="relative shrink-0">
        <ConversationAvatar conversation={conversation} currentUserId={currentUserId} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="truncate text-sm"
            style={{ fontWeight: unread > 0 ? 700 : 600, color: unread > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {conversationName(conversation, currentUserId)}
          </span>
          <span className="shrink-0 text-[10px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            {formatDate(conversation.lastMessageAt || conversation.updatedAt || "")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className="truncate text-xs flex-1"
            style={{ fontWeight: unread > 0 ? 600 : 400, color: unread > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}
          >
            {conversationSubtitle(conversation, currentUserId)}
          </p>
          {participant?.pinned && (
            <Pin size={12} className="shrink-0 -rotate-45" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </div>
    </Link>
  );
});


function StartConversationPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = usePlatformSearchMutation();
  const direct = useCreateDirectConversationMutation();
  const group = useCreateGroupConversationMutation();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  const startDirect = async (userId: string) => {
    const result = await direct.mutateAsync(userId);
    navigate(`/chat/${result.data.id}`);
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();

    const result = await group.mutateAsync({
      title: groupTitle,
      participantIds: selectedUsers.map((user) => user.id),
    });
    setSelectedUsers([]);
    setGroupTitle("");
    navigate(`/chat/${result.data.id}`);
  };

  const toggleSelected = (user: User) => {
    setSelectedUsers((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  return (
    <div className="panel p-4">
      <div className="flex gap-2">
        {(["direct", "group"] as const).map((item) => (
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === item
                ? "bg-blue-600 text-white"
                : "btn-secondary"
            }`}
            key={item}
            type="button"
            onClick={() => setMode(item)}
          >
            {titleCase(item)}
          </button>
        ))}
      </div>

      <form className="mt-4 flex gap-2" onSubmit={submitSearch}>
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search engineers"
        />
        <button className="btn-secondary" type="submit" disabled={search.isPending}>
          {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </button>
      </form>

      {mode === "group" && selectedUsers.length > 0 && (
        <form className="mt-3 space-y-3 rounded-md border p-3" style={{ borderColor: "var(--border)" }} onSubmit={createGroup}>
          <input
            className="field"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder="Group title"
            required
          />
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <span className="chip" key={user.id}>
                {userName(user)}
              </span>
            ))}
          </div>
          <button className="btn-primary w-full" type="submit" disabled={group.isPending}>
            {group.isPending ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
            Create group
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {(search.data?.users || []).slice(0, 6).map((foundUser) => {
          const selected = selectedUsers.some((user) => user.id === foundUser.id);

          return (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3" style={{ borderColor: "var(--border)" }} key={foundUser.id}>
              <div className="flex min-w-0 items-center gap-3">
                <Link to={userProfileUrl(foundUser.id, user?.id, foundUser.username)} className="shrink-0 hover:opacity-85 transition">
                  <Avatar user={foundUser} size="sm" />
                </Link>
                <div className="min-w-0">
                  <Link
                    to={userProfileUrl(foundUser.id, user?.id, foundUser.username)}
                    className="truncate text-sm font-semibold hover:text-indigo-800 hover:underline transition block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {userName(foundUser)}
                  </Link>
                  <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {userHeadline(foundUser) || `@${foundUser.username}`}
                  </div>
                </div>
              </div>
              {mode === "direct" ? (
                <button
                  className="btn-secondary px-3 py-1.5"
                  type="button"
                  disabled={direct.isPending}
                  onClick={() => startDirect(foundUser.id)}
                >
                  <MessageSquare size={15} />
                  Chat
                </button>
              ) : (
                <button className="icon-btn h-8 w-8" type="button" title="Select" onClick={() => toggleSelected(foundUser)}>
                  {selected ? <Check size={15} /> : <UserPlus size={15} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageAttachments({ attachments }: { attachments?: ChatAttachment[] | null }) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-2 grid gap-2">
      {attachments.map((attachment) => {
        if (attachment.type === "IMAGE" && (attachment.url || attachment.dataUrl)) {
          return (
            <a href={attachment.url || attachment.dataUrl} key={attachment.id || attachment.name} rel="noreferrer" target="_blank">
              <img
                className="max-h-56 rounded-md border object-cover"
                style={{ borderColor: "var(--border)" }}
                src={attachment.url || attachment.dataUrl}
                alt={attachment.name}
              />
            </a>
          );
        }

        return (
          <a
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition hover:border-[var(--brand)]"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
            href={attachment.url || attachment.dataUrl}
            key={attachment.id || attachment.name}
            rel="noreferrer"
            target="_blank"
          >
            <FileIcon size={15} />
            <span className="truncate">{attachment.name}</span>
          </a>
        );
      })}
    </div>
  );
}

/** Centered date divider between message groups */
function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      <span className="text-[11px] font-semibold uppercase tracking-wide px-2" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}

function ReactionPicker({
  onReact,
  onClose,
}: {
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
    >
      {ALL_QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onReact(emoji); onClose(); }}
          className="text-lg leading-none hover:scale-125 transition-transform"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  currentUserId,
  isGroup,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onForward,
}: {
  message: ChatMessage;
  currentUserId?: string;
  isGroup?: boolean;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onForward: (message: ChatMessage) => void;
}) {
  const mine = message.senderId === currentUserId;
  const deleted = Boolean(message.deletedAt);
  const pending = message.id.startsWith("pending-");
  const [showReactions, setShowReactions] = useState(false);

  // Aggregate reactions: emoji → count
  const reactionGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of message.reactions || []) {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [message.reactions]);

  const readCount = message.readByUsers?.length || 0;

  return (
    <article className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar — only for others in group chats */}
      {!mine && isGroup && (
        <Link
          to={userProfileUrl(message.senderId, currentUserId, message.sender?.username)}
          className="shrink-0 mt-auto mb-0.5 hover:opacity-85 transition"
        >
          <Avatar user={message.sender} size="sm" />
        </Link>
      )}
      {!mine && !isGroup && <div className="w-8 shrink-0" />}

      <div className={`relative flex max-w-[min(34rem,80%)] flex-col ${mine ? "items-end" : "items-start"}`}>
        {/* Sender name — group chats only, others' messages */}
        {!mine && isGroup && (
          <Link
            to={userProfileUrl(message.senderId, currentUserId, message.sender?.username)}
            className="mb-1 ml-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 hover:underline transition"
          >
            {userName(message.sender)}
          </Link>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div className={`mb-1.5 rounded-lg px-3 py-1.5 text-[11px] border-l-2 max-w-full ${
            mine
              ? "border-blue-300 bg-blue-100/50 dark:bg-blue-900/20 dark:border-blue-700"
              : "border-[var(--border-strong)] bg-[var(--bg-surface-2)]"
          }`} style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold">{userName(message.replyToMessage.sender)}: </span>
            <span className="line-clamp-1">{message.replyToMessage.content || titleCase(message.replyToMessage.type)}</span>
          </div>
        )}

        {/* Forwarded indicator */}
        {message.forwardedFromMessageId && (
          <div className="mb-1 flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <Forward size={10} />
            <span>Forwarded</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2.5 ${
            mine
              ? "rounded-tr-sm bg-blue-50 dark:bg-blue-900/25 border border-blue-100/70 dark:border-blue-800/50"
              : "rounded-tl-sm border"
          } ${deleted ? "opacity-60" : ""}`}
          style={mine ? { color: "var(--text-primary)" } : { borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
        >
          {deleted ? (
            <p className="italic text-sm" style={{ color: "var(--text-muted)" }}>🚫 This message was deleted</p>
          ) : (
            <>
              {message.content && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              )}
              <MessageAttachments attachments={message.attachments || undefined} />
            </>
          )}

          {/* Time + read receipt */}
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
            {message.editedAt && !deleted && <span className="italic">edited</span>}
            <span className="tabular-nums">{pending ? <Clock size={9} className="inline" /> : formatMessageTime(message.createdAt)}</span>
            {mine && !pending && (
              readCount > 1
                ? <CheckCheck size={12} className="text-sky-500" />
                : <CheckCheck size={12} style={{ color: "var(--text-muted)" }} />
            )}
          </div>
        </div>

        {/* Aggregated reactions */}
        {reactionGroups.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactionGroups.map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className="flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Floating action bar — appears on hover */}
        {!deleted && !pending && (
          <div
            className={`absolute ${mine ? "right-full mr-2" : "left-full ml-2"} top-0 flex items-center gap-0.5 rounded-full border px-1.5 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20`}
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            {/* Emoji reaction picker trigger */}
            <div className="relative">
              {showReactions && (
                <ReactionPicker
                  onReact={(emoji) => onReact(message, emoji)}
                  onClose={() => setShowReactions(false)}
                />
              )}
              <button
                type="button"
                title="React"
                onClick={() => setShowReactions((s) => !s)}
                className="rounded-full p-1.5 transition hover:bg-[var(--bg-surface-2)] hover:text-blue-600"
                style={{ color: "var(--text-muted)" }}
              >
                <Smile size={14} />
              </button>
            </div>

            <button
              type="button"
              title="Reply"
              onClick={() => onReply(message)}
              className="rounded-full p-1.5 transition hover:bg-[var(--bg-surface-2)] hover:text-blue-600"
              style={{ color: "var(--text-muted)" }}
            >
              <Reply size={14} />
            </button>

            <button
              type="button"
              title="Forward"
              onClick={() => onForward(message)}
              className="rounded-full p-1.5 transition hover:bg-[var(--bg-surface-2)] hover:text-blue-600"
              style={{ color: "var(--text-muted)" }}
            >
              <Forward size={14} />
            </button>

            {mine && (
              <>
                <button
                  type="button"
                  title="Edit"
                  onClick={() => onEdit(message)}
                  className="rounded-full p-1.5 transition hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => onDelete(message)}
                  className="rounded-full p-1.5 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

function Composer({
  conversationId,
  replyTo,
  onClearReply,
  onTyping,
  onStopTyping,
}: {
  conversationId?: string;
  replyTo?: ChatMessage | null;
  onClearReply: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
}) {
  const sendMessage = useSendMessageMutation(conversationId);
  const { showToast } = useToast();
  const fileUpload = useFileUpload();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const typingTimer = useRef<number | undefined>(undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed && !attachments.length) return;

    await sendMessage.mutateAsync({
      content: trimmed || undefined,
      type: attachments[0]?.type || "TEXT",
      attachments: attachments.length ? attachments : undefined,
      replyToMessageId: replyTo?.id,
    });
    setContent("");
    setAttachments([]);
    onClearReply();
    onStopTyping();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files).slice(0, 5);
    event.target.value = "";

    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const result = await fileUpload.upload(file, "attachment");
          return {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            name: file.name,
            url: result.fileUrl,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            type: attachmentType(file),
          } as ChatAttachment;
        })
      );
      setAttachments((current) => [...current, ...uploaded].slice(0, 5));
      showToast("success", "Files uploaded successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to upload attachments");
    }
  };

  const updateContent = (value: string) => {
    setContent(value);
    onTyping();
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(onStopTyping, 1000);
  };

  return (
    <form
      className="border-t px-4 py-3"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      onSubmit={submit}
    >
      {/* Reply banner */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/20 px-3 py-2">
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Replying to {userName(replyTo.sender)}: </span>
            <span className="truncate" style={{ color: "var(--text-muted)" }}>{replyTo.content || titleCase(replyTo.type)}</span>
          </div>
          <button className="icon-btn h-6 w-6" type="button" onClick={onClearReply}><X size={13} /></button>
        </div>
      )}

      {/* Attachment pills */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <span
              className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
              key={att.id || att.name}
            >
              {att.type === "IMAGE" ? <Image size={11} /> : <FileIcon size={11} />}
              {att.name}
              <button type="button" onClick={() => setAttachments((c) => c.filter((a) => a !== att))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* LinkedIn-style pill input row */}
      <div className="flex items-end gap-2">
        {/* Attach */}
        <label
          className={`shrink-0 cursor-pointer rounded-full p-2 transition hover:bg-[var(--bg-surface-2)] hover:text-blue-600 ${fileUpload.uploading ? "pointer-events-none" : ""}`}
          style={{ color: "var(--text-muted)" }}
          title="Attach files"
        >
          {fileUpload.uploading ? <Loader2 className="animate-spin text-blue-600" size={18} /> : <Paperclip size={18} />}
          <input className="hidden" type="file" multiple onChange={handleFiles} disabled={fileUpload.uploading} />
        </label>

        {/* Textarea pill */}
        <textarea
          className="flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--brand-glow)]"
          style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface-2)", color: "var(--text-primary)" }}
          value={content}
          onChange={(e) => updateContent(e.target.value)}
          onBlur={onStopTyping}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as FormEvent); } }}
          placeholder="Write a message…"
          rows={1}
        />

        {/* Send button */}
        <button
          className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition ${
            (content.trim() || attachments.length) && !fileUpload.uploading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed"
          }`}
          style={(content.trim() || attachments.length) && !fileUpload.uploading ? {} : { background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
          type="submit"
          disabled={sendMessage.isPending || fileUpload.uploading || (!content.trim() && !attachments.length)}
        >
          {sendMessage.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </button>
      </div>
    </form>
  );
}

function ConversationSettings({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId?: string;
}) {
  const settings = useConversationSettingsMutation(conversation.id);
  const deleteConversation = useDeleteConversationMutation();
  const participant = participantForUser(conversation, currentUserId);
  const search = usePlatformSearchMutation();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(query);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this conversation? It will be removed from your list. You can still view archived conversations.")) {
      deleteConversation.mutate(conversation.id, {
        onSuccess: () => {
          navigate("/chat");
        },
      });
    }
  };

  return (
    <aside className="space-y-5">
      <div className="panel p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Conversation</h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Members" value={conversation.participants?.length || 0} />
          <Metric label="Messages" value={formatCount(conversation.messageCount)} />
          <Metric label="Unread" value={conversation.unreadCount || 0} />
        </div>
        <div className="mt-4 grid gap-2">
          <button className="btn-secondary justify-start" type="button" onClick={() => settings.mutate({ action: "pin" })}>
            <Pin size={16} />
            {participant?.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            className="btn-secondary justify-start"
            type="button"
            onClick={() => settings.mutate({ action: "mute", muted: !participant?.muted })}
          >
            {participant?.muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {participant?.muted ? "Unmute" : "Mute"}
          </button>
          <button
            className="btn-secondary justify-start"
            type="button"
            onClick={() => {
              if (window.confirm("Archive this conversation?")) {
                settings.mutate({ action: "archive" });
              }
            }}
          >
            <Archive size={16} />
            {participant?.archived ? "Unarchive" : "Archive"}
          </button>
          <button
            className="btn-secondary justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            type="button"
            onClick={handleDelete}
            disabled={deleteConversation.isPending}
          >
            <Trash2 size={16} />
            {deleteConversation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Participants</h3>
        <div className="mt-4 space-y-3">
          {(conversation.participants || []).map((member) => (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3" style={{ borderColor: "var(--border)" }} key={member.id}>
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to={userProfileUrl(member.userId, currentUserId, member.user?.username)}
                  className="shrink-0 hover:opacity-85 transition"
                >
                  <Avatar user={member.user} size="sm" />
                </Link>
                <div className="min-w-0">
                  <Link
                    to={userProfileUrl(member.userId, currentUserId, member.user?.username)}
                    className="truncate text-sm font-semibold hover:text-indigo-800 hover:underline transition block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {userName(member.user)}
                  </Link>
                  <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{userHeadline(member.user) || formatDate(member.joinedAt)}</div>
                </div>
              </div>
              {isGroupConversation(conversation) && member.userId !== currentUserId && (
                <button
                  className="icon-btn h-8 w-8"
                  type="button"
                  title="Remove"
                  onClick={() => settings.mutate({ action: "remove-participant", userId: member.userId })}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isGroupConversation(conversation) && (
        <div className="panel p-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add participant</h3>
          <form className="mt-4 flex gap-2" onSubmit={submit}>
            <input
              className="field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search engineers"
            />
            <button className="btn-secondary" type="submit" disabled={search.isPending}>
              {search.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(search.data?.users || []).slice(0, 5).map((foundUser) => {
              const exists = conversation.participants?.some((participant) => participant.userId === foundUser.id);

              return (
                <div className="flex items-center justify-between gap-3 rounded-md border p-3" style={{ borderColor: "var(--border)" }} key={foundUser.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      to={userProfileUrl(foundUser.id, currentUserId, foundUser.username)}
                      className="shrink-0 hover:opacity-85 transition"
                    >
                      <Avatar user={foundUser} size="sm" />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={userProfileUrl(foundUser.id, currentUserId, foundUser.username)}
                        className="truncate text-sm font-semibold hover:text-indigo-800 hover:underline transition block"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {userName(foundUser)}
                      </Link>
                      <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{userHeadline(foundUser) || `@${foundUser.username}`}</div>
                    </div>
                  </div>
                  <button
                    className="btn-secondary px-3 py-1.5"
                    type="button"
                    disabled={settings.isPending || exists}
                    onClick={() => settings.mutate({ action: "add-participant", userId: foundUser.id })}
                  >
                    <UserPlus size={15} />
                    {exists ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

function MessageSearchPanel({ conversationId }: { conversationId: string }) {
  const [query, setQuery] = useState("");
  const searchQuery = useSearchMessagesQuery(conversationId, query);

  return (
    <div className="panel p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--text-muted)" }} />
        <input
          className="field pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this conversation"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="mt-4 space-y-2">
          {searchQuery.isFetching && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="animate-spin" size={15} />
              Searching
            </div>
          )}
          {(searchQuery.data || []).slice(0, 5).map((message) => (
            <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }} key={message.id}>
              <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{userName(message.sender)}</div>
              <div className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>{message.content || titleCase(message.type)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveConversation({
  conversation,
  conversations,
  chatSocket,
}: {
  conversation: Conversation;
  conversations: Conversation[];
  chatSocket: ReturnType<typeof useChatSocket>;
}) {
  const { user } = useAuth();
  const messagesQuery = useConversationMessagesQuery(conversation.id);
  const markRead = useMarkConversationReadMutation(conversation.id);
  const messageActions = useChatMessageActionMutation(conversation.id);
  const { typingUserIds, emitTyping, emitStopTyping, markSeenViaSocket } = chatSocket;
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState("");
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const lastScrolledConvId = useRef<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setShowSettings(false);
  }, [conversation.id]);

  const messages = useMemo(() => {
    const flat = (messagesQuery.data?.pages || [])
      .slice()
      .reverse()
      .flatMap((page) => page.messages || []);
    // Deduplicate by id to prevent optimistic + socket double-render
    const seen = new Set<string>();
    const deduped = flat.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    // Always sort ascending by createdAt so latest message is at the bottom
    return deduped.sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
    );
  }, [messagesQuery.data?.pages]);

  useEffect(() => {
    if (conversation.id && (conversation.unreadCount || 0) > 0) {
      markRead.mutate();
      markSeenViaSocket();
    }
  }, [conversation.id, conversation.unreadCount]);

  // Scroll to bottom on conversation change and when initial messages load
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Reset the scroll ref on room switch
  useEffect(() => {
    lastScrolledConvId.current = null;
  }, [conversation.id]);

  // On messages load: scroll to bottom instantly (no layout jump/animation)
  useEffect(() => {
    if (!messagesQuery.isLoading && messages.length > 0 && lastScrolledConvId.current !== conversation.id) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        lastScrolledConvId.current = conversation.id;
      }
    }
  }, [messagesQuery.isLoading, messages.length, conversation.id]);

  // On new message: only smooth-scroll if user is already near the bottom and room is initially scrolled
  useEffect(() => {
    if (messagesQuery.isFetchingNextPage) return; // don't scroll when loading older pages
    if (lastScrolledConvId.current === conversation.id && isNearBottom()) {
      const id = setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 60);
      return () => clearTimeout(id);
    }
  }, [messages.length, conversation.id]);


  // Preserve scroll position when older messages are prepended
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messagesQuery.isFetchingNextPage) {
      prevScrollHeightRef.current = el.scrollHeight;
    } else {
      const diff = el.scrollHeight - prevScrollHeightRef.current;
      if (diff > 0 && prevScrollHeightRef.current > 0) {
        el.scrollTop = diff;
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messagesQuery.isFetchingNextPage, messages.length]);

  // IntersectionObserver: auto-load older messages when sentinel is visible (user scrolled to top)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          messagesQuery.hasNextPage &&
          !messagesQuery.isFetchingNextPage
        ) {
          const el = scrollRef.current;
          if (el) prevScrollHeightRef.current = el.scrollHeight;
          messagesQuery.fetchNextPage();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage, messagesQuery.fetchNextPage]);

  const typingOthers = useMemo(() => typingUserIds.filter((id) => id !== user?.id), [typingUserIds, user?.id]);
  const typingNames = useMemo(() => {
    return typingOthers
      .map((userId) => conversation.participants?.find((p) => p.userId === userId)?.user)
      .filter(Boolean)
      .map((tu) => userName(tu));
  }, [typingOthers, conversation.participants]);

  const submitEdit = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editContent.trim()) return;

    messageActions.mutate({ action: "edit", messageId: editing.id, content: editContent.trim() });
    setEditing(null);
    setEditContent("");
  }, [editing, editContent, messageActions]);

  const handleDelete = useCallback((target: ChatMessage) => {
    if (window.confirm("Delete this message?")) {
      messageActions.mutate({ action: "delete", messageId: target.id });
    }
  }, [messageActions]);

  const handleEdit = useCallback((target: ChatMessage) => {
    setEditing(target);
    setEditContent(target.content || "");
  }, []);

  const handleReact = useCallback((target: ChatMessage, emoji: string) => {
    messageActions.mutate({ action: "react", messageId: target.id, emoji });
  }, [messageActions]);

  const handleClearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  return (
    <section className="grid h-full gap-5 xl:grid-cols-[1fr_23rem] overflow-x-hidden min-h-0">
      <div className="panel flex h-full flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b p-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/chat"
              className="lg:hidden p-1 -ml-1 mr-1 rounded-md transition hover:bg-[var(--bg-surface-2)] flex items-center justify-center shrink-0"
              style={{ color: "var(--text-secondary)" }}
              title="Back to conversations"
            >
              <ChevronLeft size={20} />
            </Link>
            {conversation.type === "DIRECT" ? (
              <Link
                to={userProfileUrl(otherParticipants(conversation, user?.id)[0]?.userId, user?.id, otherParticipants(conversation, user?.id)[0]?.user?.username)}
                className="shrink-0 hover:opacity-85 transition"
              >
                <ConversationAvatar conversation={conversation} currentUserId={user?.id} />
              </Link>
            ) : (
              <ConversationAvatar conversation={conversation} currentUserId={user?.id} />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {conversation.type === "DIRECT" ? (
                  <Link
                    to={userProfileUrl(otherParticipants(conversation, user?.id)[0]?.userId, user?.id, otherParticipants(conversation, user?.id)[0]?.user?.username)}
                    className="hover:text-indigo-800 hover:underline transition"
                  >
                    {conversationName(conversation, user?.id)}
                  </Link>
                ) : (
                  conversationName(conversation, user?.id)
                )}
              </h2>
              <p className={`truncate text-xs ${typingOthers.length > 0 ? "text-indigo-600 font-medium animate-pulse" : ""}`}
                style={typingOthers.length > 0 ? {} : { color: "var(--text-muted)" }}>
                {typingOthers.length > 0
                  ? (conversation.type === "DIRECT"
                      ? "typing..."
                      : `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing...`)
                  : conversation.type === "DIRECT"
                    ? (() => {
                        const other = otherParticipants(conversation, user?.id)[0];
                        const lastSeen = other?.user?.lastActiveAt || other?.lastReadAt || conversation.updatedAt;
                        return lastSeen ? formatLastActive(lastSeen) : "Tap for info";
                      })()
                    : `${conversation.participants?.length || 0} members`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`xl:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xxs font-bold uppercase transition ${
                showSettings
                  ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300"
                  : "hover:bg-[var(--bg-surface-2)]"
              }`}
              style={showSettings ? {} : { borderColor: "var(--border)", color: "var(--text-secondary)" }}
              type="button"
            >
              <MoreHorizontal size={14} />
              <span>Details</span>
            </button>
            <span className="chip font-bold">
              {titleCase(conversation.type)}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4" style={{ background: "var(--bg-surface-2)" }} ref={scrollRef}>
          {/* Sentinel for IntersectionObserver – sits at the top of the scroll container */}
          <div ref={sentinelRef} className="h-px w-full" />
          {messagesQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="animate-spin" size={14} />
              Loading older messages…
            </div>
          )}

          {messagesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="animate-spin" size={16} />
              Loading messages
            </div>
          ) : messages.length ? (
            <div className="space-y-1">
              {messages.map((message, index) => {
                const prevDay = messageDay(messages[index - 1]?.createdAt);
                const thisDay = messageDay(message.createdAt);
                const showDivider = thisDay && thisDay !== prevDay;
                return (
                  <div key={message.id}>
                    {showDivider && <DateDivider label={formatRelativeDate(message.createdAt)} />}
                    <MessageBubble
                      currentUserId={user?.id}
                      isGroup={isGroupConversation(conversation)}
                      message={message}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onForward={setForwarding}
                      onReact={handleReact}
                      onReply={setReplyTo}
                    />
                  </div>
                );
              })}
              {typingNames.length > 0 && (
                <div className="flex items-center gap-2 pl-1 pt-2">
                  <div className="flex h-8 items-center gap-1 rounded-2xl rounded-tl-sm border px-4 py-2" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full [animation-delay:0ms]" style={{ background: "var(--text-muted)" }} />
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full [animation-delay:160ms]" style={{ background: "var(--text-muted)" }} />
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full [animation-delay:320ms]" style={{ background: "var(--text-muted)" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{typingNames.join(", ")} typing…</span>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} title="No messages yet" text="Send the first message in this conversation." />
          )}
        </div>

        <Composer
          conversationId={conversation.id}
          replyTo={replyTo}
          onClearReply={handleClearReply}
          onStopTyping={emitStopTyping}
          onTyping={emitTyping}
        />
      </div>

      <div className={`space-y-5 ${showSettings ? "block" : "hidden xl:block"}`}>
        <MessageSearchPanel conversationId={conversation.id} />
        <ConversationSettings conversation={conversation} currentUserId={user?.id} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "var(--bg-overlay)" }}>
          <form className="panel w-full max-w-lg p-5" onSubmit={submitEdit}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Edit message</h3>
            <textarea
              className="field mt-4 min-h-28"
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              required
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn-primary" type="submit">
                <Edit3 size={16} />
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {forwarding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "var(--bg-overlay)" }}>
          <div className="panel w-full max-w-lg p-5">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Forward message</h3>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {conversations
                .filter((item) => item.id !== conversation.id)
                .map((target) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition hover:border-[var(--brand)]"
                    style={{ borderColor: "var(--border)" }}
                    key={target.id}
                    type="button"
                    onClick={() => {
                      messageActions.mutate({
                        action: "forward",
                        messageId: forwarding.id,
                        targetConversationId: target.id,
                      });
                      setForwarding(null);
                    }}
                  >
                    <ConversationAvatar conversation={target} currentUserId={user?.id} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {conversationName(target, user?.id)}
                      </div>
                      <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{conversationSubtitle(target, user?.id)}</div>
                    </div>
                  </button>
                ))}
            </div>
            <button className="btn-secondary mt-4 w-full" type="button" onClick={() => setForwarding(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const conversationsQuery = useConversationsQuery();
  const archivedConversationsQuery = useArchivedConversationsQuery(showArchived);
  const chatSocket = useChatSocket(conversationId);

  const conversations = showArchived
    ? (archivedConversationsQuery.data || [])
    : (conversationsQuery.data || []);

  // Guarantee client-side sorting: pinned first, then by the most recent activity
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const participantA = a.participants?.find((p) => p.userId === user?.id);
      const participantB = b.participants?.find((p) => p.userId === user?.id);
      const pinnedA = Boolean(participantA?.pinned);
      const pinnedB = Boolean(participantB?.pinned);

      if (pinnedA && !pinnedB) return -1;
      if (!pinnedA && pinnedB) return 1;

      const dateA = a.lastMessageAt || a.updatedAt || a.createdAt || "";
      const dateB = b.lastMessageAt || b.updatedAt || b.createdAt || "";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [conversations, user?.id]);

  const activeConversation = sortedConversations.find((conversation) => conversation.id === conversationId);

  const filteredConversations = useMemo(() => {
    const normalized = filter.trim().toLowerCase();

    return sortedConversations.filter((conversation) => {
      const haystack = [
        conversationName(conversation, user?.id),
        conversationSubtitle(conversation, user?.id),
        conversation.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalized || haystack.includes(normalized);
    });
  }, [sortedConversations, filter, user?.id]);

  useEffect(() => {
    if (!conversationId && sortedConversations[0]?.id) {
      navigate(`/chat/${sortedConversations[0].id}`, { replace: true });
    }
  }, [conversationId, sortedConversations, navigate]);

  if (!user) {
    return <EmptyState icon={MessageSquare} title="Login required" text="Sign in to open your conversations." />;
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[22rem_1fr] h-[calc(100vh-9rem)] min-h-[42rem] overflow-hidden">
      <aside className={`flex flex-col gap-4 h-full overflow-hidden ${conversationId ? "hidden lg:flex" : "flex"}`}>
        <StartConversationPanel />

        <div className="panel flex-1 flex flex-col p-4 overflow-hidden min-h-0">
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--text-muted)" }} />
            <input
              className="field pl-9"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter conversations"
            />
          </div>
          <div className="mt-4 flex-1 overflow-y-auto no-scrollbar space-y-2">
            {showArchived ? archivedConversationsQuery.isLoading : conversationsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <Loader2 className="animate-spin" size={16} />
                Loading conversations
              </div>
            ) : filteredConversations.length ? (
              filteredConversations.map((conversation) => (
                <ConversationRow
                  active={conversation.id === conversationId}
                  conversation={conversation}
                  currentUserId={user.id}
                  key={conversation.id}
                  isArchived={showArchived}
                />
              ))
            ) : (
              <div className="rounded-md border p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                {showArchived ? "No archived conversations." : "No conversations yet."}
              </div>
            )}
          </div>
        </div>

        {!showArchived && (
          <div className="panel px-4 py-3 shrink-0">
            <button
              onClick={() => setShowArchived(true)}
              className="btn-secondary w-full"
            >
              View Archived
            </button>
          </div>
        )}

        {showArchived && (
          <div className="panel px-4 py-3 shrink-0">
            <button
              onClick={() => setShowArchived(false)}
              className="btn-secondary w-full"
            >
              View Active
            </button>
          </div>
        )}
      </aside>

      <div className={`h-full overflow-hidden ${conversationId ? "block" : "hidden lg:block"}`}>
        {activeConversation ? (
          <ActiveConversation
            chatSocket={chatSocket}
            conversation={activeConversation}
            conversations={sortedConversations}
          />
        ) : conversationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={16} />
            Loading chat
          </div>
        ) : (
          <EmptyState icon={Smile} title="Pick a conversation" text="Start a direct chat or create a group." />
        )}
      </div>
    </section>
  );
}
