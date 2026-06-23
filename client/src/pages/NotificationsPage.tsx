import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  MessageSquare,
  Rocket,
  ShieldCheck,
  UserPlus,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sliders,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  useArchiveNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useDeleteNotificationMutation,
} from "../hooks/usePlatformQueries";
import { Avatar, EmptyState } from "../components/ui";
import { formatDate, titleCase, userName } from "../lib/format";
import { PlatformNotification } from "../lib/api";

type TabType = "all" | "unread" | "messages" | "projects" | "social" | "jobs" | "system";

interface NotificationPreferences {
  emailAlerts: boolean;
  pushNotifications: boolean;
  chatMessages: boolean;
  jobUpdates: boolean;
  projectInvites: boolean;
  hackathonAlerts: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailAlerts: true,
  pushNotifications: true,
  chatMessages: true,
  jobUpdates: true,
  projectInvites: true,
  hackathonAlerts: true,
};

function NotificationGlyph({ type }: { type: PlatformNotification["type"] }) {
  const t = type.toUpperCase();
  if (t.includes("PROJECT") || t.includes("TEAM") || t.includes("COMMUNITY")) {
    return (
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 transition group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
        <Rocket size={17} />
      </div>
    );
  }
  if (t.includes("INVITE") || t.includes("CONNECTION") || t.includes("FOLLOW") || t.includes("MENTORSHIP")) {
    return (
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
        <UserPlus size={17} />
      </div>
    );
  }
  if (t.includes("MESSAGE") || t.includes("COMMENT") || t.includes("MENTION")) {
    return (
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50">
        <MessageSquare size={17} />
      </div>
    );
  }
  if (t.includes("JOB") || t.includes("HACKATHON") || t.includes("REFERRAL")) {
    return (
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50">
        <ShieldCheck size={17} />
      </div>
    );
  }

  return (
    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
      <Bell size={17} />
    </div>
  );
}

const notificationTarget = (notification: PlatformNotification) =>
  notification.actionUrl && notification.actionUrl.startsWith("/")
    ? notification.actionUrl
    : "/notifications";

const ToggleSwitch = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <div className="flex-1">
      <span className="text-sm font-semibold transition" style={{ color: "var(--text-primary)" }}>{label}</span>
      {description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Queries & Mutations
  const notificationsQuery = useNotificationsQuery(page, limit);
  const markRead = useMarkNotificationReadMutation();
  const archive = useArchiveNotificationMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem("notification_preferences");
    if (saved) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    localStorage.setItem("notification_preferences", JSON.stringify(next));

    setSavedMessage("Preferences saved successfully!");
    setTimeout(() => {
      setSavedMessage(null);
    }, 3000);
  };

  const rawNotifications = useMemo(
    () => notificationsQuery.data?.notifications || [],
    [notificationsQuery.data?.notifications]
  );
  const serverUnreadCount = notificationsQuery.data?.unreadCount || 0;

  // Filter notifications by both local tab filter and subscription toggles
  const filteredNotifications = useMemo(() => {
    return rawNotifications.filter((n) => {
      const type = n.type.toUpperCase();

      // Check Preferences Subscription Filters
      if (!preferences.chatMessages && (type.includes("MESSAGE") || type.includes("COMMENT") || type.includes("MENTION"))) {
        return false;
      }
      if (!preferences.jobUpdates && (type.includes("JOB") || type.includes("REFERRAL"))) {
        return false;
      }
      if (!preferences.projectInvites && (type.includes("PROJECT") || type.includes("TEAM"))) {
        return false;
      }
      if (!preferences.hackathonAlerts && type.includes("HACKATHON")) {
        return false;
      }

      // Check Active Tab Filter
      if (activeTab === "unread") return !n.isRead;
      if (activeTab === "messages") {
        return type.includes("MESSAGE") || type.includes("COMMENT") || type.includes("MENTION");
      }
      if (activeTab === "projects") {
        return type.includes("PROJECT") || type.includes("TEAM") || type.includes("COMMUNITY");
      }
      if (activeTab === "social") {
        return type.includes("CONNECTION") || type.includes("FOLLOW") || type.includes("MENTORSHIP");
      }
      if (activeTab === "jobs") {
        return type.includes("JOB") || type.includes("HACKATHON") || type.includes("REFERRAL");
      }
      if (activeTab === "system") {
        return type.includes("SYSTEM");
      }

      return true;
    });
  }, [rawNotifications, activeTab, preferences]);

  // Reset page when tab or limit changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, limit]);

  const hasNextPage = rawNotifications.length === limit;

  const handleMarkAsRead = (id: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(id);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner/Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-emerald-200/50 shadow-md">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Notifications</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Track your projects, team communications, social connection requests, jobs, and system statuses.
            </p>
          </div>
          </div>
        </div>

        {/* Quick Operations Bar */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={serverUnreadCount === 0 || markAllRead.isPending}
            className="btn-secondary transition duration-150 ease-in-out hover:bg-emerald-50 hover:border-emerald-200"
          >
            {markAllRead.isPending ? (
              <Loader2 size={16} className="animate-spin text-emerald-600" />
            ) : (
              <CheckCheck size={16} className="text-emerald-600" />
            )}
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column - Tabs and Notification Feed */}
        <div className="lg:col-span-8 space-y-6">
          {/* Responsive Tab Panel */}
          <div className="panel p-1.5 overflow-x-auto">
            <nav className="flex space-x-1" aria-label="Notification type filters">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "unread", label: "Unread" },
                  { id: "messages", label: "Messages" },
                  { id: "projects", label: "Projects" },
                  { id: "social", label: "Social" },
                  { id: "jobs", label: "Jobs" },
                  { id: "system", label: "System" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative rounded-md px-3.5 py-2 text-xs font-semibold transition-all duration-150 shrink-0 ${
                      isActive
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                    style={!isActive ? { color: "var(--text-secondary)" } : {}}
                  >
                    {tab.label}
                    {tab.id === "unread" && serverUnreadCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                        {serverUnreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Notifications Feed */}
          <div className="space-y-3">
            {notificationsQuery.isLoading ? (
              <div className="panel flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="animate-spin text-emerald-600 mb-3" size={32} />
                <span className="text-sm font-medium">Retrieving notifications...</span>
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => {
                const isItemRead = notification.isRead;
                return (
                  <article
                    key={notification.id}
                    className={`panel group overflow-hidden transition-all duration-200 hover:shadow-md ${
                      isItemRead
                        ? "hover:border-emerald-200/80"
                        : "border-emerald-200 dark:border-emerald-700 shadow-[inset_4px_0_0_0_#059669]"
                    }`}
                  >
                    <div className="p-4 flex gap-4">
                      {/* Avatar / Glyph Indicator */}
                      <div className="relative shrink-0">
                        {notification.actor ? (
                          <Avatar user={notification.actor} size="md" />
                        ) : (
                          <NotificationGlyph type={notification.type} />
                        )}
                        {!isItemRead && (
                          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-600" />
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={notificationTarget(notification)}
                              onClick={() => handleMarkAsRead(notification.id, isItemRead)}
                              className="group-hover:text-emerald-700 transition"
                            >
                              <h4 className="text-sm font-bold group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-1 transition" style={{ color: "var(--text-primary)" }}>
                                {notification.title}
                              </h4>
                            </Link>
                            <p className="mt-1 text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                              {notification.message}
                            </p>
                          </div>
                          <span className="chip shrink-0 text-[10px] py-0.5 px-2 bg-slate-50 border border-slate-100">
                            {titleCase(notification.type.replace(/_/g, " "))}
                          </span>
                        </div>

                        {/* Metadata & Actions footer */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                          <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                            {notification.actor ? `${userName(notification.actor)} • ` : ""}
                            {formatDate(notification.createdAt)}
                          </div>
                          
                          {/* Item Operations */}
                          <div className="flex shrink-0 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {!isItemRead && (
                              <button
                                className="icon-btn h-8 w-8 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-150"
                                type="button"
                                title="Mark as read"
                                disabled={markRead.isPending}
                                onClick={() => handleMarkAsRead(notification.id, false)}
                              >
                                <CheckCheck size={14} />
                              </button>
                            )}
                            <button
                              className="icon-btn h-8 w-8 hover:bg-amber-50 hover:text-amber-700 transition-all duration-150"
                              type="button"
                              title="Archive notification"
                              disabled={archive.isPending}
                              onClick={() => archive.mutate(notification.id)}
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              className="icon-btn h-8 w-8 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-150"
                              type="button"
                              title="Delete notification"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(notification.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon={Inbox}
                title={
                  activeTab === "unread"
                    ? "All caught up!"
                    : `No ${activeTab !== "all" ? activeTab : ""} notifications`
                }
                text={
                  activeTab === "unread"
                    ? "You have read all notifications in this category."
                    : "No notifications found. Change your subscriptions or filter parameters."
                }
              />
            )}
          </div>

          {/* Pagination Controls */}
          {(!notificationsQuery.isLoading && rawNotifications.length > 0) && (
            <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Limit selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Page limit:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="field py-1 text-xs w-auto"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1 || notificationsQuery.isFetching}
                  className="btn-secondary h-8 w-8 !p-0"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Page {page}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNextPage || notificationsQuery.isFetching}
                  className="btn-secondary h-8 w-8 !p-0"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Preferences and Information */}
        <div className="lg:col-span-4 space-y-6">
          {/* Preferences Card */}
          <section className="panel p-5 relative overflow-hidden" aria-labelledby="preferences-title">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <Sliders size={18} className="text-emerald-600" />
              <h2 id="preferences-title" className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Preferences
              </h2>
            </div>

            {/* Local storage sync confirmation banner */}
            {savedMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-700 p-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition duration-150 animate-fade-in">
                <CheckCircle size={14} />
                <span>{savedMessage}</span>
              </div>
            )}

            <div className="space-y-5 divide-y" style={{ borderColor: "var(--border)" }}>
              {/* Delivery Channels */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Channels
                </h3>
                <ToggleSwitch
                  checked={preferences.emailAlerts}
                  onChange={(val) => updatePreference("emailAlerts", val)}
                  label="Email Alerts"
                  description="Receive digest emails for new mentions and application state updates."
                />
                <ToggleSwitch
                  checked={preferences.pushNotifications}
                  onChange={(val) => updatePreference("pushNotifications", val)}
                  label="Push Notifications"
                  description="Enable interactive browser prompt alerts on notification triggers."
                />
              </div>

              {/* Subscription Filters */}
              <div className="space-y-3 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Subscriptions
                </h3>
                <ToggleSwitch
                  checked={preferences.chatMessages}
                  onChange={(val) => updatePreference("chatMessages", val)}
                  label="Messages & Mentions"
                  description="Enable updates for personal messages, comments, and post mentions."
                />
                <ToggleSwitch
                  checked={preferences.jobUpdates}
                  onChange={(val) => updatePreference("jobUpdates", val)}
                  label="Jobs & Referrals"
                  description="Receive details on job application state changes and referrals."
                />
                <ToggleSwitch
                  checked={preferences.projectInvites}
                  onChange={(val) => updatePreference("projectInvites", val)}
                  label="Teams & Projects"
                  description="Alert when invited to projects, team channels, and group requests."
                />
                <ToggleSwitch
                  checked={preferences.hackathonAlerts}
                  onChange={(val) => updatePreference("hackathonAlerts", val)}
                  label="Hackathons"
                  description="Recieve status notifications on submissions, winner reveals, and judging."
                />
              </div>
            </div>
          </section>

          {/* Quick Help Card */}
          <div className="panel p-5 bg-gradient-to-br from-emerald-950 to-slate-900 text-white border-0 shadow-lg">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Local Sync Sandbox</h4>
                <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">
                  Settings toggles automatically manage notifications locally. Unsubscribed notifications will be filtered from view instantly.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
                  <Mail size={12} />
                  <span>Channel: {preferences.emailAlerts ? "Email Enabled" : "Email Disabled"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
