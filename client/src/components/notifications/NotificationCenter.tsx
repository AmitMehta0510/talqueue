import {
  Archive,
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  MessageSquare,
  Rocket,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PlatformNotification } from "../../lib/api";
import { formatDate, titleCase, userName } from "../../lib/format";
import {
  useArchiveNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "../../hooks/usePlatformQueries";
import { Avatar, EmptyState } from "../ui";

function NotificationGlyph({ type }: { type: PlatformNotification["type"] }) {
  if (type.includes("PROJECT")) return <Rocket size={15} />;
  if (type.includes("INVITE") || type.includes("CONNECTION") || type === "FOLLOW") {
    return <UserPlus size={15} />;
  }
  if (type.includes("MESSAGE") || type.includes("COMMENT") || type.includes("MENTION")) {
    return <MessageSquare size={15} />;
  }
  if (type.includes("JOB") || type.includes("HACKATHON") || type.includes("REFERRAL")) {
    return <ShieldCheck size={15} />;
  }

  return <Bell size={15} />;
}

const notificationTarget = (notification: PlatformNotification) =>
  notification.actionUrl && notification.actionUrl.startsWith("/")
    ? notification.actionUrl
    : "/notifications";

function NotificationItem({
  notification,
  compact,
}: {
  notification: PlatformNotification;
  compact?: boolean;
}) {
  const markRead = useMarkNotificationReadMutation();
  const archive = useArchiveNotificationMutation();

  const markAsRead = () => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
  };

  return (
    <article
      className={`rounded-md border p-3 transition ${
        notification.isRead
          ? "border-slate-100 bg-white"
          : "border-emerald-100 bg-emerald-50/70"
      }`}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          {notification.actor ? (
            <Avatar user={notification.actor} size="sm" />
          ) : (
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <NotificationGlyph type={notification.type} />
            </div>
          )}
          {!notification.isRead && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            className="block"
            to={notificationTarget(notification)}
            onClick={markAsRead}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-slate-950">
                  {notification.title}
                </h4>
                <p className={`${compact ? "line-clamp-2" : ""} mt-1 text-sm leading-5 text-slate-600`}>
                  {notification.message}
                </p>
              </div>
              <span className="chip shrink-0 text-[11px]">{titleCase(notification.type)}</span>
            </div>
          </Link>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="truncate text-xs text-slate-500">
              {notification.actor ? `${userName(notification.actor)} - ` : ""}
              {formatDate(notification.createdAt)}
            </div>
            <div className="flex shrink-0 gap-1">
              {!notification.isRead && (
                <button
                  className="icon-btn h-8 w-8"
                  type="button"
                  title="Mark as read"
                  onClick={markAsRead}
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                className="icon-btn h-8 w-8"
                type="button"
                title="Archive"
                onClick={() => archive.mutate(notification.id)}
              >
                <Archive size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function NotificationPreview() {
  const notificationsQuery = useNotificationsQuery(1, 8);
  const markAllRead = useMarkAllNotificationsReadMutation();
  const data = notificationsQuery.data;
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="absolute right-0 top-11 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-panel">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Notifications</h3>
          <p className="text-xs text-slate-500">
            {unreadCount ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          type="button"
          disabled={!unreadCount || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck size={14} />
          Read all
        </button>
      </div>

      <div className="max-h-[28rem] space-y-2 overflow-y-auto">
        {notificationsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-1 py-6 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading notifications
          </div>
        ) : notifications.length ? (
          notifications.map((notification) => (
            <NotificationItem compact key={notification.id} notification={notification} />
          ))
        ) : (
          <div className="px-1 py-6 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        )}
      </div>

      <Link
        className="mt-3 flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        to="/notifications"
      >
        Open inbox
      </Link>
    </div>
  );
}

export function NotificationBellButton() {
  const notificationsQuery = useNotificationsQuery(1, 8);
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  return (
    <span className="relative inline-flex">
      <Bell size={17} />
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </span>
  );
}

export function NotificationsInbox() {
  const notificationsQuery = useNotificationsQuery(1, 40);
  const markAllRead = useMarkAllNotificationsReadMutation();
  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Project requests, invites, mentions, referrals, reputation, and system updates.
          </p>
        </div>
        <button
          className="btn-secondary"
          type="button"
          disabled={!unreadCount || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {markAllRead.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCheck size={16} />}
          Mark all read
        </button>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} />
          Loading notifications
        </div>
      ) : notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No notifications yet"
          text="When backend events target you, they will appear here."
        />
      )}
    </section>
  );
}
