import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EngineerCard } from "../components/cards/SocialCards";
import {
  Loader2,
  RefreshCcw,
  Trophy,
  Star,
  Award,
  ArrowUp,
  Sparkles,
  Rocket,
  Briefcase,
  X,
  Send,
  Users,
  Flame,
  MessageSquare,
  Hash,
  Zap,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Compass,
} from "lucide-react";
import { FeedCard } from "../components/cards/FeedCard";
import { Avatar, FeedCardSkeleton, SidebarItemSkeleton } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
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
  useSuggestedConnectionsQuery,
  useFollowUserMutation,
  useConnectUserMutation,
  useCreateDirectConversationMutation,
  useRecommendedProjectsQuery,
} from "../hooks/usePlatformQueries";
import { titleCase, userName, formatCount, formatDate } from "../core/utils/format";

// Lazy-load the compose modal — it carries react-hook-form + zod and is only
// needed when the user actively opens it. Falls back to a spinner until ready.
const ComposePost = lazy(() =>
  import("../components/forms/ComposePost").then((mod) => ({
    default: mod.ComposePost,
  })),
);

type FeedCategory = "all" | "recommended" | "discussions" | "projects" | "jobs";

// Rotating composer placeholder hints — engineering-specific, not generic
const COMPOSER_HINTS = [
  "Shipped something? Share it with the community…",
  "Building in public — post your latest progress…",
  "Won a hackathon? Tell the community…",
  "What engineering challenge did you solve today?…",
  "Share a project update or open-source contribution…",
];

// Trending tags — static for now, can be fetched from backend later
const TRENDING_TAGS = [
  { label: "#ReactJS",      color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  { label: "#OpenSource",   color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { label: "#Hackathon",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "#SystemDesign", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { label: "#TypeScript",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { label: "#DevOps",       color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { label: "#ML",           color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" },
  { label: "#WebDev",       color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
];

// Feed tab definitions
const FEED_TABS = [
  { id: "all" as FeedCategory,           label: "All Feed",      icon: <Flame size={12} /> },
  { id: "recommended" as FeedCategory,   label: "For You",       icon: <Sparkles size={12} /> },
  { id: "discussions" as FeedCategory,   label: "Discussions",   icon: <MessageSquare size={12} /> },
  { id: "projects" as FeedCategory,      label: "Projects",      icon: <Rocket size={12} /> },
  { id: "jobs" as FeedCategory,          label: "Opportunities",  icon: <Briefcase size={12} /> },
] as const;

// ---------------------------------------------------------------------------
// FeedPage
// ---------------------------------------------------------------------------

export function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [composerHintIndex, setComposerHintIndex] = useState(0);

  // Compose modal states
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composePostType, setComposePostType] = useState("GENERAL");

  // Floating refresh toast state
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  // API Queries & Mutations
  const feedQuery        = useFeedQuery(30);
  const projectsQuery    = useProjectsQuery(12);
  const recommendedProjectsQuery = useRecommendedProjectsQuery();
  const jobsQuery        = useJobsQuery();
  const suggestedConnectionsQuery = useSuggestedConnectionsQuery(3);
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();
  const leaderboardQuery = useReputationLeaderboardQuery();
  const myReputationQuery= useMyReputationQuery();
  const hackathonsQuery  = useHackathonsQuery({ status: "ACTIVE" });

  const createPost    = useCreatePostMutation();
  const postReaction  = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost        = useRepostMutation();


  // Derived data (memoized — no expensive computation, just null-safety)
  const feed              = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const projects          = useMemo(() => {
    if (user) {
      return recommendedProjectsQuery.data || [];
    }
    return projectsQuery.data || [];
  }, [user, recommendedProjectsQuery.data, projectsQuery.data]);
  // jobs derived here for future use (e.g. Opportunities tab count)
  const jobs              = useMemo(() => jobsQuery.data?.jobs ?? [], [jobsQuery.data]);
  void jobs; // suppress unused-variable warning until used in feed cards
  const leaders           = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const featuredHackathons= useMemo(() => hackathonsQuery.data ?? [], [hackathonsQuery.data]);
  const suggestedUsers    = useMemo(() => {
    if (!suggestedConnectionsQuery.data?.pages) return [];
    return suggestedConnectionsQuery.data.pages.flatMap((page) => page.users || []);
  }, [suggestedConnectionsQuery.data?.pages]);

  const refreshing =
    feedQuery.isFetching      ||
    projectsQuery.isFetching  ||
    recommendedProjectsQuery.isFetching ||
    jobsQuery.isFetching      ||
    leaderboardQuery.isFetching||
    myReputationQuery.isFetching||
    hackathonsQuery.isFetching;

  // Rotate composer placeholder hint every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setComposerHintIndex((i) => (i + 1) % COMPOSER_HINTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Clock tick for greeting
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Show floating toast when feed refreshes in background (not on initial load)
  useEffect(() => {
    if (feedQuery.isFetching && !feedQuery.isLoading && !toastDismissed) {
      setShowRefreshToast(true);
    }
    if (!feedQuery.isFetching) {
      // Auto-dismiss after data is fresh
      const t = setTimeout(() => {
        setShowRefreshToast(false);
        setToastDismissed(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [feedQuery.isFetching, feedQuery.isLoading, toastDismissed]);

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

  // Per-tab post counts for badge indicators
  const tabCounts = useMemo(() => ({
    all:           feed.length,
    recommended:   feed.filter((i) => Boolean(i.reason)).length,
    discussions:   feed.filter((i) => i.type === "POST").length,
    projects:      feed.filter((i) => i.type === "PROJECT").length,
    jobs:          feed.filter((i) => i.type === "JOB" || i.type === "HACKATHON").length,
  }), [feed]);

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

  // Whether any interaction mutation is in-flight (used to disable FeedCard CTAs)
  const interacting = postReaction.isPending || commentOnPost.isPending || repost.isPending;

  // Scroll-to-top button visibility — only setState when threshold crosses
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const should = window.scrollY > 400;
      setShowScrollTop((prev) => (prev === should ? prev : should));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Live context line stats for greeting banner
  const todayPostCount = feed.filter((i) => {
    if (!("createdAt" in i.data)) return false;
    const d = new Date((i.data as any).createdAt);
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).length;
  const liveHackathonCount = featuredHackathons.length;

  const maxRepScore = leaders.length > 0
    ? Math.max(...leaders.map((l) => l.reputationScore || 0), 1)
    : 1;

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
          {/* Live context line */}
          <p className="text-xxs mt-1 flex items-center gap-3 flex-wrap" style={{ color: "var(--text-muted)" }}>
            {todayPostCount > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp size={10} style={{ color: "var(--brand)" }} />
                <span>{todayPostCount} engineer{todayPostCount !== 1 ? "s" : ""} posted today</span>
              </span>
            )}
            {liveHackathonCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{liveHackathonCount} active hackathon{liveHackathonCount !== 1 ? "s" : ""} live</span>
              </span>
            )}
            {todayPostCount === 0 && liveHackathonCount === 0 && (
              <span>Welcome to your collaborative dev feed workspace.</span>
            )}
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

      {/* ── TWO-COLUMN RESPONSIVE LAYOUT ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">

        {/* ── CENTER COLUMN — POST COMPOSER, TABS & FEED LIST ──────────── */}
        <section className="lg:col-span-8 space-y-4 min-w-0">

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

          {/* ── POST COMPOSER ─────────────────────────────────────────── */}
          {user && (
            <div
              className="rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <Avatar user={user} size="sm" className="mt-0.5 shrink-0" />
                <button
                  onClick={() => openCompose("GENERAL")}
                  disabled={createPost.isPending}
                  className="flex-1 text-left rounded-xl px-4 py-3 text-xs font-medium transition-all duration-200 border outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--bg-surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                    minHeight: "44px",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--brand)";
                    el.style.boxShadow = "0 0 0 3px var(--brand-light)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <span className="transition-all duration-500 block">
                    {COMPOSER_HINTS[composerHintIndex]}
                  </span>
                </button>
              </div>

              {/* Action type chips */}
              <div
                className="flex items-center gap-2 flex-wrap border-t pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                {[
                  {
                    type: "PROJECT_UPDATE",
                    icon: <Rocket size={13} />,
                    label: "Project Update",
                    style: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
                  },
                  {
                    type: "HACKATHON",
                    icon: <Award size={13} />,
                    label: "Hackathon",
                    style: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
                  },
                  {
                    type: "ACHIEVEMENT",
                    icon: <Sparkles size={13} />,
                    label: "Achievement",
                    style: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
                  },
                  {
                    type: "GENERAL",
                    icon: <Send size={13} />,
                    label: "General",
                    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
                  },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => openCompose(btn.type)}
                    disabled={createPost.isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xxs font-bold border transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${btn.style}`}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FEED TABS with icons + count badges ─────────────────── */}
          <div
            className="rounded-xl border p-1 overflow-x-auto no-scrollbar"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <nav className="flex space-x-1" aria-label="Feed category tabs">
              {FEED_TABS.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = tabCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 shrink-0"
                    style={
                      isActive
                        ? {
                            background: "linear-gradient(135deg, var(--brand), #6366f1)",
                            color: "#fff",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                          }
                        : { color: "var(--text-muted)", background: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.7 }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {count > 0 && (
                      <span
                        className="ml-0.5 rounded-full px-1.5 py-0 text-[9px] font-black leading-4 min-w-[16px] text-center"
                        style={
                          isActive
                            ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                            : { background: "var(--bg-surface-2)", color: "var(--text-muted)" }
                        }
                      >
                        {count}
                      </span>
                    )}
                    {cat.id === "recommended" && feed.some((item) => item.reason) && !isActive && (
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

          {/* ── FEED LIST ────────────────────────────────────────────── */}
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
              /* ── IMPROVED EMPTY STATE ──────────────────────────────── */
              <div
                className="rounded-xl border py-14 px-6 text-center relative overflow-hidden"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                {/* Decorative background circles */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)",
                  }}
                />
                <div
                  className="mx-auto mb-5 h-16 w-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-light), rgba(99,102,241,0.15))",
                    boxShadow: "0 0 0 1px var(--brand-light)",
                  }}
                >
                  <Compass size={28} style={{ color: "var(--brand)" }} />
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  {activeCategory === "recommended"
                    ? "No recommendations yet"
                    : "Your engineering feed is warming up 🚀"}
                </h3>
                <p className="text-xs leading-relaxed max-w-xs mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
                  {activeCategory === "recommended"
                    ? "Add detailed skills and experiences to your profile to power the recommendation engine."
                    : "Follow engineers or join projects to populate your feed with relevant content."}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    to="/campus/projects"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all duration-150 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, var(--brand), #6366f1)" }}
                  >
                    <Rocket size={13} />
                    Explore Projects
                  </Link>
                  <Link
                    to="/discover"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-150"
                    style={{
                      borderColor: "var(--brand)",
                      color: "var(--brand)",
                      background: "var(--brand-light)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--brand-light)";
                    }}
                  >
                    <Users size={13} />
                    Follow Engineers
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── RIGHT COLUMN — LEADERBOARD, TAGS, PROJECTS, HACKATHONS ── */}
        <aside className="hidden lg:col-span-4 space-y-4 lg:block">

          {/* Top Engineers Leaderboard */}
          <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div
              className="flex items-center justify-between pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy size={15} className="text-amber-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Top Engineers
                </h3>
              </div>
              <Link
                to="/career/reputation"
                className="text-[9px] font-bold flex items-center gap-0.5 transition-colors duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Full Board <ChevronRight size={10} />
              </Link>
            </div>

            {leaderboardQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SidebarItemSkeleton key={i} />)}
              </div>
            ) : leaders.length > 0 ? (
              <div className="space-y-4">
                {leaders.slice(0, 5).map((lead, idx) => {
                  const medalColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  const rankIcons   = [<Trophy size={13} key="t" />, <Star size={13} key="s" />, <Award size={13} key="a" />];
                  const repPct = Math.round(((lead.reputationScore || 0) / maxRepScore) * 100);
                  return (
                    <div key={lead.userId || idx} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 font-bold text-xs ${medalColors[idx] || "text-slate-400"}`}>
                            {idx < 3 ? rankIcons[idx] : <span className="text-[10px]">#{idx + 1}</span>}
                          </span>
                          {lead.user ? (
                            <Avatar user={lead.user} size="sm" />
                          ) : (
                            <div
                              className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                              style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
                            >
                              {(lead.username || "U").substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {lead.user ? (
                              <Link
                                to={`/users/${lead.user?.username || lead.userId}`}
                                className="font-semibold truncate block text-xs transition-colors duration-150 hover:underline"
                                style={{ color: "var(--text-primary)" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                              >
                                {userName(lead.user)}
                              </Link>
                            ) : (
                              <span className="font-semibold truncate block text-xs" style={{ color: "var(--text-primary)" }}>
                                @{lead.username}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--brand)" }}>
                          {formatCount(lead.reputationScore || 0)}
                        </span>
                      </div>
                      {/* Rep progress bar */}
                      <div
                        className="h-1 rounded-full overflow-hidden ml-10"
                        style={{ background: "var(--bg-surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${repPct}%`,
                            background: idx === 0
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : idx === 1
                              ? "linear-gradient(90deg, #94a3b8, #cbd5e1)"
                              : idx === 2
                              ? "linear-gradient(90deg, #b45309, #d97706)"
                              : "var(--brand)",
                          }}
                        />
                      </div>
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

          {/* Trending Tags */}
          <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Hash size={14} style={{ color: "var(--brand)" }} />
              <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Trending Topics
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <span
                  key={tag.label}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all duration-150 hover:scale-105 ${tag.color}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          {/* Suggested Connections Widget */}
          {user && suggestedUsers.length > 0 && (
            <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div
                className="flex items-center gap-2 pb-3 mb-3 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <Users size={14} className="text-indigo-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Suggested Connections
                </h3>
              </div>
              <div className="space-y-3">
                {suggestedUsers.slice(0, 3).map((sUser) => (
                  <EngineerCard
                    key={sUser.id}
                    user={sUser}
                    currentUserId={user.id}
                    actionsInHeader={true}
                    onConnect={(u) => connectUser.mutate(u.id)}
                    onFollow={(u) => followUser.mutate(u.id)}
                    onMessage={(u) => createDirectConversation.mutate(u.id)}
                    onRequestReferral={(u) => navigate(`/discover?referral=${u.id}`)}
                    onOpenProfile={(u) => navigate(`/users/${u.username || u.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Projects */}
          <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div
              className="flex items-center justify-between pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <Rocket size={14} className="text-indigo-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Featured Projects
                </h3>
              </div>
              <Link
                to="/campus/projects"
                className="text-[9px] font-bold flex items-center gap-0.5 transition-colors duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                See all <ChevronRight size={10} />
              </Link>
            </div>

            {projectsQuery.isLoading || (user && recommendedProjectsQuery.isLoading) ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <SidebarItemSkeleton key={i} />)}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3.5">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="group/proj">
                    <Link
                      to={`/projects/${project.slug || project.id}`}
                      className="block text-xs font-bold transition-colors duration-150 truncate hover:underline"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    >
                      {project.title}
                    </Link>
                    <p className="text-[10px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {project.shortDescription || project.description || "Active collaboration project"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Array.isArray(project.techStack) ? (
                        project.techStack.slice(0, 3).map((stack) => (
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
              <div className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                No projects matching your skills yet.
              </div>
            )}
          </div>

          {/* Featured Hackathons */}
          <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <div
              className="flex items-center justify-between pb-3 mb-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1 rounded-lg bg-[var(--bg-surface-warning)] text-[var(--text-warning)]">
                  <Trophy size={13} className="stroke-[2.5]" />
                </div>
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Live Hackathons
                </h3>
              </div>
              {featuredHackathons.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {featuredHackathons.length} active
                </span>
              )}
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
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        to={`/hackathons/${hackathon.slug || hackathon.id}`}
                        className="block text-xs font-bold transition-colors duration-150 truncate hover:underline flex-1"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                      >
                        {hackathon.title}
                      </Link>
                      {/* LIVE pulse dot */}
                      <span className="flex items-center gap-1 shrink-0 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Live</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
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
                          {formatDate(hackathon.startDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-center py-3 flex flex-col items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Zap size={18} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                No active hackathons right now.
              </div>
            )}
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

      {/* ── FLOATING BACKGROUND REFRESH TOAST ───────────────────────── */}
      {showRefreshToast && (
        <div
          className="fixed top-20 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg transition-all duration-300"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          }}
        >
          {feedQuery.isFetching ? (
            <Loader2 className="animate-spin shrink-0" size={14} style={{ color: "var(--brand)" }} />
          ) : (
            <ArrowUp size={14} style={{ color: "var(--brand)" }} />
          )}
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {feedQuery.isFetching ? "Updating feed…" : "Feed updated · ↑ New posts"}
          </span>
          {!feedQuery.isFetching && (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setShowRefreshToast(false);
                setToastDismissed(true);
              }}
              className="text-[10px] font-bold ml-1 underline underline-offset-2"
              style={{ color: "var(--brand)" }}
            >
              View
            </button>
          )}
          <button
            type="button"
            onClick={() => { setShowRefreshToast(false); setToastDismissed(true); }}
            className="icon-btn ml-1 p-0.5"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── SCROLL TO TOP BUTTON ────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Scroll to top"
        title="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-24 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300 lg:bottom-8"
        style={{
          background: "var(--brand)",
          color: "#fff",
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? "auto" : "none",
          transform: showScrollTop ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}
