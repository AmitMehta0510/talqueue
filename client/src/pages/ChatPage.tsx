import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  ChevronLeft,
  Edit3,
  File as FileIcon,
  Forward,
  Image,
  Loader2,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
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
import { useAuth } from "../contexts/AuthContext";
import { useChatSocket } from "../hooks/useChatSocket";
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
import { formatCount, formatDate, titleCase, userHeadline, userName } from "../lib/format";

const quickReactions = ["👍", "🔥", "✅", "💡"];

const attachmentType = (file: globalThis.File): ChatAttachment["type"] => {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "FILE";
};

const readAsDataUrl = (file: globalThis.File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const toChatAttachments = async (files: FileList | null): Promise<ChatAttachment[]> => {
  if (!files) return [];

  const selected = Array.from(files).slice(0, 5);
  const attachments = await Promise.all(
    selected.map(async (file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      dataUrl: await readAsDataUrl(file),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      type: attachmentType(file),
    })),
  );

  return attachments;
};

const participantForUser = (conversation?: Conversation, userId?: string) =>
  conversation?.participants?.find((participant) => participant.userId === userId);

const otherParticipants = (conversation?: Conversation, userId?: string) =>
  (conversation?.participants || []).filter((participant) => participant.userId !== userId);

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
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
      <Users size={20} />
    </div>
  );
}

function ConversationRow({
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
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-slate-100 ${
        active ? "bg-blue-50 border-l-2 border-blue-600" : "border-l-2 border-transparent"
      }`}
      to={`/chat/${conversation.id}`}
    >
      <div className="relative shrink-0">
        <ConversationAvatar conversation={conversation} currentUserId={currentUserId} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-sm font-semibold ${unread > 0 ? "text-slate-900" : "text-slate-700"}`}>
            {conversationName(conversation, currentUserId)}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {formatDate(conversation.updatedAt || conversation.lastMessageAt || "")}
          </span>
        </div>
        <p className={`mt-0.5 truncate text-xs ${unread > 0 ? "font-semibold text-slate-700" : "text-slate-400"}`}>
          {conversationSubtitle(conversation, currentUserId)}
        </p>
      </div>
    </Link>
  );
}


function StartConversationPanel() {
  const navigate = useNavigate();
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
                ? "bg-emerald-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
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
        <form className="mt-3 space-y-3 rounded-md border border-slate-100 p-3" onSubmit={createGroup}>
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
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={foundUser.id}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={foundUser} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{userName(foundUser)}</div>
                  <div className="truncate text-xs text-slate-500">
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
                className="max-h-56 rounded-md border border-slate-200 object-cover"
                src={attachment.url || attachment.dataUrl}
                alt={attachment.name}
              />
            </a>
          );
        }

        return (
          <a
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
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

function MessageBubble({
  message,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onForward,
}: {
  message: ChatMessage;
  currentUserId?: string;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onForward: (message: ChatMessage) => void;
}) {
  const mine = message.senderId === currentUserId;
  const deleted = Boolean(message.deletedAt);

  return (
    <article className={`flex gap-2.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      {!mine && <div className="shrink-0 mt-1"><Avatar user={message.sender} size="sm" /></div>}
      <div className={`flex max-w-[min(34rem,78%)] flex-col ${mine ? "items-end" : "items-start"}`}>
        {/* Sender name for group chats */}
        {!mine && (
          <span className="mb-1 text-[11px] font-semibold text-blue-700">{userName(message.sender)}</span>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div className={`mb-1.5 rounded-lg px-3 py-1.5 text-[11px] border-l-2 ${
            mine
              ? "border-blue-300 bg-blue-700/50 text-blue-50"
              : "border-slate-300 bg-slate-100 text-slate-500"
          }`}>
            <span className="font-semibold">{userName(message.replyToMessage.sender)}: </span>
            {message.replyToMessage.content || titleCase(message.replyToMessage.type)}
          </div>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2.5 ${
          mine
            ? "rounded-tr-sm bg-blue-600 text-white"
            : "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
        }`}>
          {message.content && (
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${deleted ? "italic opacity-60" : ""}`}>
              {message.content}
            </p>
          )}
          <MessageAttachments attachments={message.attachments || undefined} />
          <div className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${mine ? "text-blue-200" : "text-slate-400"}`}>
            <span>{message.createdAt ? formatDate(message.createdAt) : "Sending…"}</span>
            {mine && (
              <span>{(message.readByUsers?.length || 0) > 1 ? "✓✓" : "✓"}</span>
            )}
          </div>
        </div>

        {/* Action row */}
        {!deleted && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
            {quickReactions.map((emoji) => (
              <button
                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs transition hover:border-blue-300 hover:bg-blue-50"
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
              >
                {emoji}
              </button>
            ))}
            <button className="icon-btn h-6 w-6" type="button" title="Reply" onClick={() => onReply(message)}>
              <MessageSquare size={12} />
            </button>
            <button className="icon-btn h-6 w-6" type="button" title="Forward" onClick={() => onForward(message)}>
              <Forward size={12} />
            </button>
            {mine && !message.id.startsWith("pending-") && (
              <>
                <button className="icon-btn h-6 w-6" type="button" title="Edit" onClick={() => onEdit(message)}>
                  <Edit3 size={12} />
                </button>
                <button className="icon-btn h-6 w-6" type="button" title="Delete" onClick={() => onDelete(message)}>
                  <Trash2 size={12} />
                </button>
              </>
            )}
            {(message.reactions || []).slice(0, 4).map((reaction) => (
              <span className="chip py-0.5 text-xs" key={reaction.id}>{reaction.emoji}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

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
    const nextAttachments = await toChatAttachments(event.target.files);
    setAttachments((current) => [...current, ...nextAttachments].slice(0, 5));
    event.target.value = "";
  };

  const updateContent = (value: string) => {
    setContent(value);
    onTyping();
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(onStopTyping, 1000);
  };

  return (
    <form className="border-t border-slate-100 bg-white px-4 py-3" onSubmit={submit}>
      {/* Reply banner */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-semibold text-slate-700">Replying to {userName(replyTo.sender)}: </span>
            <span className="truncate text-slate-500">{replyTo.content || titleCase(replyTo.type)}</span>
          </div>
          <button className="icon-btn h-6 w-6" type="button" onClick={onClearReply}><X size={13} /></button>
        </div>
      )}

      {/* Attachment pills */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600" key={att.id || att.name}>
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
        <label className="shrink-0 cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600" title="Attach files">
          <Paperclip size={18} />
          <input className="hidden" type="file" multiple onChange={handleFiles} />
        </label>

        {/* Textarea pill */}
        <textarea
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
            content.trim() || attachments.length
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
          type="submit"
          disabled={sendMessage.isPending || (!content.trim() && !attachments.length)}
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
        <h3 className="text-sm font-semibold text-slate-950">Conversation</h3>
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
            className="btn-secondary justify-start text-red-600 hover:bg-red-50"
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
        <h3 className="text-sm font-semibold text-slate-950">Participants</h3>
        <div className="mt-4 space-y-3">
          {(conversation.participants || []).map((member) => (
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={member.id}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={member.user} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{userName(member.user)}</div>
                  <div className="truncate text-xs text-slate-500">{userHeadline(member.user) || formatDate(member.joinedAt)}</div>
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
          <h3 className="text-sm font-semibold text-slate-950">Add participant</h3>
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
                <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3" key={foundUser.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={foundUser} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{userName(foundUser)}</div>
                      <div className="truncate text-xs text-slate-500">{userHeadline(foundUser) || `@${foundUser.username}`}</div>
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
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={15} />
              Searching
            </div>
          )}
          {(searchQuery.data || []).slice(0, 5).map((message) => (
            <div className="rounded-md border border-slate-100 p-3" key={message.id}>
              <div className="text-xs font-semibold text-slate-500">{userName(message.sender)}</div>
              <div className="mt-1 line-clamp-2 text-sm text-slate-700">{message.content || titleCase(message.type)}</div>
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
  const { connected, typingUserIds, emitTyping, emitStopTyping, markSeenViaSocket } = chatSocket;
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState("");
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setShowSettings(false);
  }, [conversation.id]);

  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages || [])
        .slice()
        .reverse()
        .flatMap((page) => page.messages || []),
    [messagesQuery.data?.pages],
  );

  useEffect(() => {
    if (conversation.id && (conversation.unreadCount || 0) > 0) {
      markRead.mutate();
      markSeenViaSocket();
    }
  }, [conversation.id, conversation.unreadCount]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, conversation.id]);

  const typingNames = typingUserIds
    .map((userId) => conversation.participants?.find((participant) => participant.userId === userId)?.user)
    .filter(Boolean)
    .map((typingUser) => userName(typingUser));

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editContent.trim()) return;

    messageActions.mutate({ action: "edit", messageId: editing.id, content: editContent.trim() });
    setEditing(null);
    setEditContent("");
  };

  return (
    <section className="grid min-h-[calc(100vh-9rem)] gap-5 xl:grid-cols-[1fr_23rem]">
      <div className="panel flex min-h-[42rem] flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/chat"
              className="lg:hidden text-slate-600 hover:text-emerald-805 p-1 -ml-1 mr-1 rounded-md transition hover:bg-slate-105 flex items-center justify-center shrink-0"
              title="Back to conversations"
            >
              <ChevronLeft size={20} />
            </Link>
            <ConversationAvatar conversation={conversation} currentUserId={user?.id} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-950">
                {conversationName(conversation, user?.id)}
              </h2>
              <p className="truncate text-xs text-slate-500">
                {connected ? "Realtime connected" : "Reconnecting"} · {conversation.participants?.length || 0} members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`xl:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xxs font-bold uppercase transition ${
                showSettings
                  ? "bg-emerald-50 border-emerald-200 text-emerald-850"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
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

        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4" ref={scrollRef}>
          {messagesQuery.hasNextPage && (
            <button
              className="btn-secondary mx-auto mb-4 flex"
              type="button"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => messagesQuery.fetchNextPage()}
            >
              {messagesQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
              Load older
            </button>
          )}

          {messagesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Loading messages
            </div>
          ) : messages.length ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  currentUserId={user?.id}
                  key={message.id}
                  message={message}
                  onDelete={(target) => {
                    if (window.confirm("Delete this message?")) {
                      messageActions.mutate({ action: "delete", messageId: target.id });
                    }
                  }}
                  onEdit={(target) => {
                    setEditing(target);
                    setEditContent(target.content || "");
                  }}
                  onForward={setForwarding}
                  onReact={(target, emoji) =>
                    messageActions.mutate({ action: "react", messageId: target.id, emoji })
                  }
                  onReply={setReplyTo}
                />
              ))}
              {typingNames.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mic size={13} />
                  {typingNames.join(", ")} typing
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
          onClearReply={() => setReplyTo(null)}
          onStopTyping={emitStopTyping}
          onTyping={emitTyping}
        />
      </div>

      <div className={`space-y-5 ${showSettings ? "block" : "hidden xl:block"}`}>
        <MessageSearchPanel conversationId={conversation.id} />
        <ConversationSettings conversation={conversation} currentUserId={user?.id} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
          <form className="panel w-full max-w-lg p-5" onSubmit={submitEdit}>
            <h3 className="text-sm font-semibold text-slate-950">Edit message</h3>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="panel w-full max-w-lg p-5">
            <h3 className="text-sm font-semibold text-slate-950">Forward message</h3>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {conversations
                .filter((item) => item.id !== conversation.id)
                .map((target) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-md border border-slate-100 p-3 text-left transition hover:border-emerald-300"
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
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {conversationName(target, user?.id)}
                      </div>
                      <div className="truncate text-xs text-slate-500">{conversationSubtitle(target, user?.id)}</div>
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

  // Guarantee client-side sorting by the most recent activity (message time, updated, or created time)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const dateA = a.lastMessageAt || a.updatedAt || a.createdAt || "";
      const dateB = b.lastMessageAt || b.updatedAt || b.createdAt || "";
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [conversations]);

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
    <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <aside className={`space-y-5 ${conversationId ? "hidden lg:block" : "block"}`}>
        <StartConversationPanel />

        <div className="panel p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="field pl-9"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter conversations"
            />
          </div>
          <div className="mt-4 space-y-2">
            {showArchived ? archivedConversationsQuery.isLoading : conversationsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
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
              <div className="rounded-md border border-slate-100 p-4 text-sm text-slate-500">
                {showArchived ? "No archived conversations." : "No conversations yet."}
              </div>
            )}
          </div>
        </div>

        {!showArchived && (
          <div className="panel px-4 py-3">
            <button
              onClick={() => setShowArchived(true)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Archived
            </button>
          </div>
        )}

        {showArchived && (
          <div className="panel px-4 py-3">
            <button
              onClick={() => setShowArchived(false)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Active
            </button>
          </div>
        )}
      </aside>

      <div className={conversationId ? "block" : "hidden lg:block"}>
        {activeConversation ? (
          <ActiveConversation
            chatSocket={chatSocket}
            conversation={activeConversation}
            conversations={sortedConversations}
          />
        ) : conversationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
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
