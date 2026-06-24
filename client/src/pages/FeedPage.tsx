import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Loader2,
  RefreshCcw,
  Trophy,
  Star,
  Award,
  ArrowUpRight,
  Activity,
  Sparkles,
  Rocket,
  Briefcase,
  User as UserIcon,
  CheckCircle,
  X,
  Send,
  Users,
  History,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { FeedCard } from "../components/cards/FeedCard";
import { EmptyState, Avatar, FeedCardSkeleton, SidebarItemSkeleton } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreatePostMutation,
  useCommentOnPostMutation,
  useFeedQuery,
  useJobsQuery,
  usePostReactionMutation,
  useProjectsQuery,
  useRepostMutation,
  useMyReputationQuery,
  useReputationLeaderboardQuery,
  useHackathonsQuery,
} from "../hooks/usePlatformQueries";
import { titleCase, userName, formatCount, userHeadline, formatDate } from "../lib/format";

// Lazy-load the compose modal — it carries react-hook-form + zod and is only
// needed when the user actively opens it. Falls back to a spinner until ready.
const ComposePost = lazy(() =>
  import("../components/forms/ComposePost").then((mod) => ({
    default: mod.ComposePost,
  })),
);

type FeedCategory = "all" | "recommended" | "discussions" | "projects" | "jobs";

// ---------------------------------------------------------------------------
// FeedPage
// ---------------------------------------------------------------------------

export function FeedPage() {
  const { user, apiOnline } = useAuth();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Compose modal states
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composePostType, setComposePostType] = useState("GENERAL");

  // API Queries & Mutations
  const feedQuery        = useFeedQuery(30);
  const projectsQuery    = useProjectsQuery(12);
  const jobsQuery        = useJobsQuery();
  const leaderboardQuery = useReputationLeaderboardQuery();
  const myReputationQuery= useMyReputationQuery();
  const hackathonsQuery  = useHackathonsQuery({ status: "ACTIVE" });

  const createPost    = useCreatePostMutation();
  const postReaction  = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost        = useRepostMutation();

  // Derived data (memoized — no expensive computation, just null-safety)
  const feed              = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const projects          = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const jobs              = useMemo(() => jobsQuery.data?.jobs ?? [], [jobsQuery.data]);
  const leaders           = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const featuredHackathons= useMemo(() => hackathonsQuery.data ?? [], [hackathonsQuery.data]);

  const refreshing =
    feedQuery.isFetching      ||
    projectsQuery.isFetching  ||
    jobsQuery.isFetching      ||
    leaderboardQuery.isFetching||
    myReputationQuery.isFetching||
    hackathonsQuery.isFetching;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      if (activeCategory === "recommended") return Boolean(item.reason);
      if (activeCategory === "discussions") return item.type === "POST";
      if (activeCategory === "projects")    return item.type === "PROJECT";
      if (activeCategory === "jobs")        return item.type === "JOB" || item.type === "HACKATHON";
      return true;
    });
  }, [feed, activeCategory]);

  const handleRefreshAll = useCallback(() => {
    feedQuery.refetch();
    projectsQuery.refetch();
    jobsQuery.refetch();
    leaderboardQuery.refetch();
    hackathonsQuery.refetch();
    if (user) myReputationQuery.refetch();
  }, [feedQuery, projectsQuery, jobsQuery, leaderboardQuery, hackathonsQuery, myReputationQuery, user]);

  // Memoized interaction handlers — prevent re-renders on every FeedCard
  const handleLike = useCallback(
    (id: string) => {
      if (postReaction.isPending) return;
      postReaction.mutate({ id, action: "like" });
    },
    [postReaction],
  );

  const handleSave = useCallback(
    (id: string) => {
      if (postReaction.isPending) return;
      postReaction.mutate({ id, action: "save" });
    },
    [postReaction],
  );

  const handleComment = useCallback(
    async (id: string, content: string, parentCommentId?: string) => {
      try {
        await commentOnPost.mutateAsync({ id, content, parentCommentId });
        return true;
      } catch {
        return false;
      }
    },
    [commentOnPost],
  );

  const handleRepost = useCallback(
    async (id: string, caption?: string) => {
      try {
        await repost.mutateAsync({ id, caption });
        return true;
      } catch {
        return false;
      }
    },
    [repost],
  );

  // Opening the compose modal is blocked if createPost is already in flight
  const openCompose = useCallback(
    (type: string) => {
      if (createPost.isPending) return;
      setComposePostType(type);
      setShowComposeModal(true);
    },
    [createPost.isPending],
  );

  const displayReputation  = myReputationQuery.data?.reputationScore ?? user?.reputationScore ?? 0;
  const displayEngineering = myReputationQuery.data?.engineeringScore ?? user?.engineeringScore ?? 0;
  const displayBadgeCount  = myReputationQuery.data?.badges?.length ?? user?.skills?.length ?? 0;

  // Whether any interaction mutation is in-flight (used to disable FeedCard CTAs)
  const interacting = postReaction.isPending || commentOnPost.isPending || repost.isPending;

  return (
    <div className="space-y-5">

      {/* ── GREETING BANNER ───────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
        style={{ background: "var(--glass-bg)", borderColor: "var(--border)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <div>
          <h2 className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {getGreeting()},{" "}
            <span style={{ color: "var(--brand)" }}>
              {user ? userName(user) : "Engineer"}
            </span>
            !
          </h2>
          <p className="text-xxs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Welcome to your collaborative dev feed workspace.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="btn-secondary py-1 px-3 text-xxs font-semibold"
          type="button"
        >
          {refreshing ? (
            <Loader2 className="animate-spin" size={13} style={{ color: "var(--brand)" }} />
          ) : (
            <RefreshCcw size={13} style={{ color: "var(--brand)" }} />
          )}
          Refresh Feed
        </button>
      </div>

      {/* ── THREE-COLUMN RESPONSIVE LAYOUT ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">

        {/* ── LEFT COLUMN — USER CARD & QUICK LINKS ──────────────────── */}
        <aside className="lg:col-span-3 space-y-5">
          {/* User Profile Snapshot Card */}
          {user ? (
            <div className="panel overflow-hidden">
              {/* Cover gradient */}
              <div className="h-16 w-full" style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }} />
              <div className="p-4 relative">
                {/* Avatar overlapping cover */}
                <div
                  className="absolute -top-9 left-4 rounded-full border-[3px] shadow-card"
                  style={{ borderColor: "var(--bg-surface)" }}
                >
                  <Avatar user={user} size="md" />
                </div>

                <div className="pt-7">
                  <Link to="/profile" className="block group">
                    <h2
                      className="text-sm font-bold group-hover:underline transition line-clamp-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {userName(user)}
                    </h2>
                  </Link>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: "var(--text-muted)" }}>
                    @{user.username}
                  </p>
                  <p className="mt-2 text-xs line-clamp-2 leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>
                    {userHeadline(user) || "Professional Software Developer"}
                  </p>

                  {/* Stats row */}
                  <div
                    className="mt-4 border-t pt-3 grid grid-cols-3 gap-1.5 text-center text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {[
                      { value: formatCount(displayReputation),      label: "Rep" },
                      { value: Math.round(displayEngineering),      label: "Score" },
                      { value: displayBadgeCount,                   label: "Badges" },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <span className="block font-bold text-xxs" style={{ color: "var(--text-primary)" }}>
                          {stat.value}
                        </span>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/profile"
                    className="mt-4 btn-secondary w-full text-xxs font-bold py-1.5"
                  >
                    <span>View full profile</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-5 text-center">
              <div
                className="mx-auto mb-3 h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ background: "var(--brand-light)", color: "var(--brand)" }}
              >
                <UserIcon size={22} />
              </div>
              <h2 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Developer Profile Snapshot
              </h2>
              <p className="mt-1.5 text-xxs leading-normal" style={{ color: "var(--text-muted)" }}>
                Sign in to view and publish updates, check your engineering standing, and track open referral cards.
              </p>
              <Link to="/auth" className="mt-4 btn-primary text-xxs py-1.5 px-3 block">
                Sign In
              </Link>
            </div>
          )}

          {/* Quick Shortcuts Panel */}
          {user && (
            <div className="panel p-4 space-y-3.5">
              <h3
                className="text-[10px] font-bold uppercase tracking-wider border-b pb-2"
                style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
              >
                Developer Shortcuts
              </h3>
              <div className="space-y-2.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {[
                  { to: "/teams",      icon: <Users size={14} />,   label: "My Teams" },
                  { to: "/jobs",       icon: <Briefcase size={14} />, label: "Saved Opportunity Cards" },
                  { to: "/referrals",  icon: <Send size={14} />,    label: "Referrals Console" },
                  { to: "/reputation", icon: <History size={14} />, label: "Points & Badges Log" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2 transition-colors duration-150 hover:underline"
                    style={{ color: "inherit" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── MIDDLE COLUMN — POST TRIGGER, TABS & FEED LIST ─────────── */}
        <section className="lg:col-span-6 space-y-5 min-w-0">

          {/* Start a Post Card */}
          {user && (
            <div className="panel p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="sm" />
                <button
                  onClick={() => openCompose("GENERAL")}
                  disabled={createPost.isPending}
                  className="flex-1 text-left rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 border outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--bg-surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-3)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                >
                  Start an engineering update...
                </button>
              </div>
              <div
                className="flex items-center justify-around border-t pt-3 text-xxs font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                {[
                  { type: "PROJECT_UPDATE", icon: <Rocket size={15} className="text-indigo-500" />,  label: "Project Update" },
                  { type: "HACKATHON",      icon: <Award size={15} className="text-amber-500" />,    label: "Hackathon" },
                  { type: "ACHIEVEMENT",    icon: <Sparkles size={15} style={{ color: "var(--brand)" }} />, label: "Achievement" },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => openCompose(btn.type)}
                    disabled={createPost.isPending}
                    className="flex items-center gap-2 p-2 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="panel p-1 overflow-x-auto no-scrollbar">
            <nav className="flex space-x-1" aria-label="Feed category tabs">
              {(
                [
                  { id: "all",           label: "All Feed" },
                  { id: "recommended",   label: "For You" },
                  { id: "discussions",   label: "Discussions" },
                  { id: "projects",      label: "Projects" },
                  { id: "jobs",          label: "Opportunities" },
                ] as const
              ).map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className="relative rounded-lg px-4 py-2 text-xs font-bold transition-all duration-150 shrink-0"
                    style={
                      isActive
                        ? { background: "var(--text-primary)", color: "var(--text-inverse)" }
                        : { color: "var(--text-muted)", background: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {cat.label}
                    {cat.id === "recommended" && feed.some((item) => item.reason) && (
                      <span
                        className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500"
                        style={{ border: "2px solid var(--bg-surface)" }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Background-refresh indicator */}
          {feedQuery.isFetching && !feedQuery.isLoading && (
            <div
              className="flex items-center gap-2 text-xs rounded-xl border px-4 py-2.5"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <Loader2 className="animate-spin flex-shrink-0" size={15} style={{ color: "var(--brand)" }} />
              <span>Updating platform stream feeds...</span>
            </div>
          )}

          {/* Error Banner */}
          {feedQuery.isError && (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
              style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Failed to load feed. Check your connection.</span>
              </div>
              <button
                onClick={() => feedQuery.refetch()}
                type="button"
                className="text-xxs font-bold text-rose-600 hover:text-rose-800 underline underline-offset-2 shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Feed List */}
          <div className="space-y-4">
            {feedQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <FeedCardSkeleton key={i} />)
            ) : filteredFeed.length > 0 ? (
              filteredFeed.map((item, index) => (
                <FeedCard
                  key={`${item.type}-${"id" in item.data ? item.data.id : index}`}
                  item={item}
                  position={index}
                  trackImpression={Boolean(user)}
                  canInteract={Boolean(user) && !interacting}
                  onLike={handleLike}
                  onSave={handleSave}
                  onComment={handleComment}
                  onRepost={handleRepost}
                />
              ))
            ) : (
              <EmptyState
                icon={Compass}
                title={activeCategory === "recommended" ? "No recommendations yet" : "Workspace feed empty"}
                text={
                  activeCategory === "recommended"
                    ? "Add detailed skills and experiences to your developer profile to enable the matching engine recommendation signals."
                    : "No posts found in this feed category at the moment. Try reloading the feed."
                }
              />
            )}
          </div>
        </section>

        {/* ── RIGHT COLUMN — LEADERBOARD, PROJECTS, HACKATHONS, MONITOR ─ */}
        <aside className="hidden lg:col-span-3 space-y-5 lg:block">

          {/* Top Engineers Leaderboard */}
          <div className="panel p-4">
            <div
              className="flex items-center gap-2 pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Top Engineers
              </h3>
            </div>

            {leaderboardQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SidebarItemSkeleton key={i} />)}
              </div>
            ) : leaders.length > 0 ? (
              <div className="space-y-3">
                {leaders.slice(0, 3).map((lead, idx) => {
                  const medalColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  const rankIcons   = [<Trophy size={14} key="t" />, <Star size={14} key="s" />, <Award size={14} key="a" />];
                  return (
                    <div key={lead.userId || idx} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 font-bold ${medalColors[idx] || "text-slate-400"}`}>
                          {idx < 3 ? rankIcons[idx] : `#${idx + 1}`}
                        </span>
                        {lead.user ? (
                          <Avatar user={lead.user} size="sm" />
                        ) : (
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px]"
                            style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
                          >
                            {(lead.username || "U").substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          {lead.user ? (
                            <Link
                              to={`/users/${lead.user?.username || lead.userId}`}
                              className="font-semibold truncate block transition-colors duration-150 hover:underline"
                              style={{ color: "var(--text-primary)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                            >
                              {userName(lead.user)}
                            </Link>
                          ) : (
                            <span className="font-semibold truncate block" style={{ color: "var(--text-primary)" }}>
                              @{lead.username}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="chip text-[10px] font-bold py-0.5 px-2 text-indigo-700 dark:text-indigo-400" style={{ background: "var(--brand-light)", borderColor: "transparent" }}>
                        {lead.reputationScore} rep
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                No top engineers data.
              </div>
            )}
          </div>

          {/* Featured Projects */}
          <div className="panel p-4">
            <div
              className="flex items-center gap-2 pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <Rocket size={16} className="text-indigo-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Featured Repositories
              </h3>
            </div>

            {projectsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SidebarItemSkeleton key={i} />)}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3.5">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id}>
                    <Link
                      to={`/projects/${project.slug || project.id}`}
                      className="block text-xs font-bold transition-colors duration-150 truncate hover:underline"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    >
                      {project.title}
                    </Link>
                    <p className="text-[10px] mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {project.shortDescription || project.description || "Active collaboration project"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.isArray(project.techStack) ? (
                        project.techStack.slice(0, 2).map((stack) => (
                          <span key={String(stack)} className="chip text-[9px] py-0 px-1.5">
                            {String(stack)}
                          </span>
                        ))
                      ) : (
                        <span className="chip text-[9px] py-0 px-1.5">
                          {titleCase(project.status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                No active projects available.
              </div>
            )}
          </div>

          {/* Featured Hackathons */}
          <div className="panel p-4">
            <div
              className="flex items-center gap-2 pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center justify-center p-1 rounded-lg"
                style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
              >
                <Trophy size={14} className="stroke-[2.5]" />
              </div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Featured Hackathons
              </h3>
            </div>

            {hackathonsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SidebarItemSkeleton key={i} />)}
              </div>
            ) : featuredHackathons.length > 0 ? (
              <div className="space-y-1">
                {featuredHackathons.slice(0, 3).map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="group/item -mx-2 p-2.5 rounded-lg border-l-2 border-transparent flex flex-col transition-all duration-200"
                    style={{ borderLeftColor: "transparent" }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "var(--bg-surface-2)";
                      el.style.borderLeftColor = "var(--brand)";
                      el.style.paddingLeft = "14px";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "transparent";
                      el.style.borderLeftColor = "transparent";
                      el.style.paddingLeft = "10px";
                    }}
                  >
                    <Link
                      to={`/hackathons/${hackathon.slug || hackathon.id}`}
                      className="block text-xs font-bold transition-colors duration-150 truncate hover:underline"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    >
                      {hackathon.title}
                    </Link>
                    <p className="text-[10px] mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {hackathon.shortDescription || hackathon.description || "Active collaboration hackathon"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {hackathon.sourcePlatform ? (
                          <span
                            className={`chip text-[8px] py-0 px-1.5 font-bold uppercase tracking-wide border ${
                              hackathon.sourcePlatform === "Devpost"  ? "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800"
                              : hackathon.sourcePlatform === "Devfolio" ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                              : hackathon.sourcePlatform === "Unstop"   ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                            }`}
                          >
                            {hackathon.sourcePlatform}
                          </span>
                        ) : (
                          <span className="chip text-[8px] py-0 px-1.5 font-semibold" style={{ background: "var(--brand-light)", color: "var(--brand)", borderColor: "transparent" }}>
                            Internal
                          </span>
                        )}
                        {hackathon.mode && (
                          <span className="chip text-[8px] py-0 px-1.5">
                            {titleCase(hackathon.mode)}
                          </span>
                        )}
                      </div>
                      {hackathon.startDate && (
                        <span className="text-[9px] font-medium flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                          <CalendarDays size={10} />
                          Starts {formatDate(hackathon.startDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                No active hackathons available.
              </div>
            )}
          </div>

          {/* Telemetry Snapshot Monitor Widget — intentionally dark in both modes */}
          <div className="panel p-4 bg-slate-950 text-white border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
              <Activity size={16} className="text-indigo-400" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-white">
                Telemetry Monitor
              </h3>
            </div>
            <div className="space-y-2 text-[10px] font-semibold text-slate-400">
              <div className="flex justify-between items-center">
                <span>API MONITOR STATUS:</span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? "bg-indigo-400" : "bg-rose-400 animate-ping"}`} />
                  <span className={apiOnline ? "text-indigo-400" : "text-rose-400"}>
                    {apiOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>LOCAL LATENCY SPEED:</span>
                <span className="text-indigo-400">12 ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span>CACHED STREAM ITEMS:</span>
                <span>{feed.length} elements</span>
              </div>
              <div className="flex justify-between items-center">
                <span>INTEGRITY PIPELINE:</span>
                <span className="text-indigo-400 flex items-center gap-0.5">
                  <CheckCircle size={10} />
                  <span>SECURE</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── COMPOSE MODAL — lazy loaded, glass overlay ──────────────── */}
      {showComposeModal && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--bg-overlay)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        >
          <div className="absolute inset-0" onClick={() => setShowComposeModal(false)} />
          <div className="glass relative w-full max-w-xl z-10 animate-scale-in p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Sparkles size={17} style={{ color: "var(--brand)" }} />
                Compose Engineering Update
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="icon-btn shrink-0"
                type="button"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 py-12 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Loader2 className="animate-spin" size={18} style={{ color: "var(--brand)" }} />
                  <span>Loading composer...</span>
                </div>
              }
            >
              <ComposePost
                onCreate={async (payload) => {
                  try {
                    await createPost.mutateAsync(payload);
                    setShowComposeModal(false);
                    return true;
                  } catch {
                    return false;
                  }
                }}
                disabled={createPost.isPending}
                initialType={composePostType}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
