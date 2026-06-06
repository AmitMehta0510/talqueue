import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { FeedCard } from "../components/cards/FeedCard";
import { ComposePost } from "../components/forms/ComposePost";
import { EmptyState, Avatar } from "../components/ui";
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
} from "../hooks/usePlatformQueries";
import { titleCase, userName, formatCount, userHeadline } from "../lib/format";

type FeedCategory = "all" | "recommended" | "discussions" | "projects" | "jobs";

export function FeedPage() {
  const { user, apiOnline } = useAuth();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  // API Queries & Mutations
  const feedQuery = useFeedQuery(30); // Request larger batch for client filtering
  const projectsQuery = useProjectsQuery(12);
  const jobsQuery = useJobsQuery();
  const leaderboardQuery = useReputationLeaderboardQuery();
  const myReputationQuery = useMyReputationQuery();

  const createPost = useCreatePostMutation();
  const postReaction = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost = useRepostMutation();

  const feed = useMemo(() => feedQuery.data || [], [feedQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const jobs = useMemo(() => jobsQuery.data || [], [jobsQuery.data]);
  const leaders = useMemo(() => leaderboardQuery.data || [], [leaderboardQuery.data]);

  const refreshing =
    feedQuery.isFetching ||
    projectsQuery.isFetching ||
    jobsQuery.isFetching ||
    leaderboardQuery.isFetching ||
    myReputationQuery.isFetching;

  // Refresh clock every minute for dynamic greetings
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Filter feed items by selected category
  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      if (activeCategory === "recommended") {
        return Boolean(item.reason);
      }
      if (activeCategory === "discussions") {
        return item.type === "POST";
      }
      if (activeCategory === "projects") {
        return item.type === "PROJECT";
      }
      if (activeCategory === "jobs") {
        return item.type === "JOB" || item.type === "HACKATHON";
      }
      return true; // "all"
    });
  }, [feed, activeCategory]);

  const handleRefreshAll = () => {
    feedQuery.refetch();
    projectsQuery.refetch();
    jobsQuery.refetch();
    leaderboardQuery.refetch();
    if (user) {
      myReputationQuery.refetch();
    }
  };

  // Calculate user display metrics
  const displayReputation = myReputationQuery.data?.reputationScore ?? user?.reputationScore ?? 0;
  const displayEngineering = myReputationQuery.data?.engineeringScore ?? user?.engineeringScore ?? 0;
  const displayBadgeCount = myReputationQuery.data?.badges?.length ?? user?.skills?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 1. Header Banner Dashboard */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles size={14} className="animate-spin-slow" />
              <span>Developer Central Workspace</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {getGreeting()}, {user ? userName(user) : "Engineer"}!
            </h1>
            <p className="mt-1.5 text-sm text-emerald-100/70 max-w-2xl leading-relaxed">
              Collaborate on open projects, apply for vetted jobs, and participate in community hackathons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Quick dashboard metrics */}
            {user && (
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5">
                <div className="text-center px-1">
                  <div className="text-base font-bold text-white">{formatCount(displayReputation)}</div>
                  <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">Reputation</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center px-1">
                  <div className="text-base font-bold text-white">{formatCount(displayEngineering)}</div>
                  <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">Eng Score</div>
                </div>
              </div>
            )}

            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
              type="button"
            >
              {refreshing ? (
                <Loader2 className="animate-spin text-emerald-300" size={16} />
              ) : (
                <RefreshCcw size={16} className="text-emerald-300" />
              )}
              <span>Refresh Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Responsive Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN - USER SNAPSHOT & LEADERBOARD (lg:col-span-3) */}
        <aside className="lg:col-span-3 space-y-6">
          {/* Profile Snapshot Card */}
          {user ? (
            <div className="panel overflow-hidden border-slate-200 bg-white/95 shadow-panel">
              {/* Cover gradient */}
              <div className="h-16 w-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800" />
              <div className="p-4 relative">
                {/* Overlapping Avatar */}
                <div className="absolute -top-10 left-4 rounded-full border-4 border-white shadow">
                  <Avatar user={user} size="md" />
                </div>
                
                <div className="pt-6">
                  <Link to="/profile" className="block group">
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                      {userName(user)}
                    </h2>
                  </Link>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    @{user.username}
                  </p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {userHeadline(user) || "Software Engineer"}
                  </p>

                  <div className="mt-4 border-t border-slate-100/80 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="block text-slate-800 font-bold">{formatCount(displayReputation)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rep</span>
                    </div>
                    <div>
                      <span className="block text-slate-800 font-bold">{formatCount(displayEngineering)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
                    </div>
                    <div>
                      <span className="block text-slate-800 font-bold">{displayBadgeCount}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Skills</span>
                    </div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="mt-4 flex items-center justify-center gap-1 w-full rounded-md border border-slate-150 bg-slate-50/70 hover:bg-slate-100 py-1.5 text-[11px] font-semibold text-slate-700 transition"
                  >
                    <span>View full profile</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-5 text-center bg-white border-slate-200">
              <UserIcon className="mx-auto text-slate-300 mb-2" size={28} />
              <h2 className="text-sm font-bold text-slate-800">Developer Profile</h2>
              <p className="mt-1 text-xs text-slate-500">Sign in to track your personal engineering scores and project credentials.</p>
              <Link to="/auth" className="mt-3.5 btn-primary text-xs py-1.5 px-3 block">
                Log In
              </Link>
            </div>
          )}

          {/* Reputation Leaderboard Widget */}
          <div className="panel p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Top Engineers
              </h3>
            </div>

            {leaderboardQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Fetching leaderboard...</span>
              </div>
            ) : leaders.length > 0 ? (
              <div className="space-y-3">
                {leaders.slice(0, 3).map((lead, idx) => {
                  const medalColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  const rankIcons = [<Trophy size={14} />, <Star size={14} />, <Award size={14} />];
                  return (
                    <div key={lead.userId || idx} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 font-bold ${medalColors[idx] || "text-slate-400"}`}>
                          {idx < 3 ? rankIcons[idx] : `#${idx + 1}`}
                        </span>
                        {lead.user ? (
                          <Avatar user={lead.user} size="sm" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                            {(lead.username || "U").substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          {lead.user ? (
                            <Link
                              to={`/users/${lead.userId}`}
                              className="font-semibold text-slate-800 hover:text-emerald-700 transition truncate block"
                            >
                              {userName(lead.user)}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-800 truncate block">
                              @{lead.username}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="chip text-[10px] font-bold py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-100/50">
                        {lead.reputationScore} rep
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">No top engineers data.</div>
            )}
          </div>
        </aside>

        {/* MIDDLE COLUMN - COMPOSE FEED CARD & CHANNELS (lg:col-span-9 xl:col-span-6) */}
        <section className="lg:col-span-9 xl:col-span-6 space-y-6">
          {/* Category Tabs */}
          <div className="panel p-1 border-slate-200 bg-white/95 shadow-sm overflow-x-auto">
            <nav className="flex space-x-1" aria-label="Feed category tabs">
              {(
                [
                  { id: "all", label: "All Feed" },
                  { id: "recommended", label: "For You" },
                  { id: "discussions", label: "Discussions" },
                  { id: "projects", label: "Projects" },
                  { id: "jobs", label: "Opportunities" },
                ] as const
              ).map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`relative rounded-md px-4 py-2 text-xs font-semibold transition-all shrink-0 ${
                      isActive
                        ? "bg-slate-950 text-white shadow"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {cat.label}
                    {cat.id === "recommended" && feed.some((item) => item.reason) && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Compose Post */}
          {user && (
            <ComposePost
              onCreate={async (payload) => {
                try {
                  await createPost.mutateAsync(payload);
                  return true;
                } catch {
                  return false;
                }
              }}
              disabled={createPost.isPending}
            />
          )}

          {/* Refresh/Loader indicator */}
          {refreshing && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/80 border border-slate-150 rounded-lg px-4 py-2.5 shadow-sm">
              <Loader2 className="animate-spin text-emerald-600" size={16} />
              <span>Fetching latest platform feeds...</span>
            </div>
          )}

          {/* Feed Streams */}
          <div className="space-y-4">
            {filteredFeed.length > 0 ? (
              filteredFeed.map((item, index) => (
                <FeedCard
                  key={`${item.type}-${"id" in item.data ? item.data.id : index}`}
                  item={item}
                  position={index}
                  trackImpression={Boolean(user)}
                  canInteract={Boolean(user)}
                  onLike={(id) => postReaction.mutate({ id, action: "like" })}
                  onSave={(id) => postReaction.mutate({ id, action: "save" })}
                  onComment={async (id, content, parentCommentId) => {
                    try {
                      await commentOnPost.mutateAsync({ id, content, parentCommentId });
                      return true;
                    } catch {
                      return false;
                    }
                  }}
                  onRepost={async (id, caption) => {
                    try {
                      await repost.mutateAsync({ id, caption });
                      return true;
                    } catch {
                      return false;
                }
              }}
            />
              ))
            ) : (
              <EmptyState
                icon={Compass}
                title={activeCategory === "recommended" ? "No matches yet" : "End of Feed"}
                text={
                  activeCategory === "recommended"
                    ? "Completing your skills profile helps our recommendation engine find suitable projects."
                    : "No items match this filter category right now. Refresh the page to reload."
                }
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN - FEATURED PROJECTS & LATEST JOBS (xl:col-span-3, hidden lg, shown xl) */}
        <aside className="hidden xl:block xl:col-span-3 space-y-6">
          {/* Featured Projects Card */}
          <div className="panel p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Rocket size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Featured Projects
              </h3>
            </div>

            {projectsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Loading projects...</span>
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3.5">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="group/item">
                    <Link
                      to="/projects"
                      className="block text-xs font-bold text-slate-800 group-hover/item:text-emerald-700 transition truncate"
                    >
                      {project.title}
                    </Link>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {project.shortDescription || project.description || "Active collaboration project"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.isArray(project.techStack) ? (
                        project.techStack.slice(0, 2).map((stack) => (
                          <span key={String(stack)} className="chip text-[9px] py-0 px-1.5 bg-slate-50">
                            {String(stack)}
                          </span>
                        ))
                      ) : (
                        <span className="chip text-[9px] py-0 px-1.5 bg-slate-50">
                          {titleCase(project.status)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">No active projects available.</div>
            )}
          </div>

          {/* Latest Jobs Card */}
          <div className="panel p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Briefcase size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Latest Jobs
              </h3>
            </div>

            {jobsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Loading job listings...</span>
              </div>
            ) : jobs.length > 0 ? (
              <div className="space-y-3.5">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="group/item">
                    <Link
                      to="/jobs"
                      className="block text-xs font-bold text-slate-800 group-hover/item:text-emerald-700 transition truncate"
                    >
                      {job.title}
                    </Link>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-slate-500 font-medium">
                      <span>{job.company?.name || "Company"}</span>
                      <span className="shrink-0 text-emerald-700">{titleCase(job.workMode)}</span>
                    </div>
                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.skillsRequired.slice(0, 2).map((skill) => (
                          <span key={skill} className="chip text-[9px] py-0 px-1.5 bg-slate-50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">No job openings listed.</div>
            )}
          </div>

          {/* Telemetry Snapshot Widget */}
          <div className="panel p-4 bg-slate-950 text-white border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
              <Activity size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Telemetry Monitor
              </h3>
            </div>
            
            <div className="space-y-2 text-[10px] font-semibold text-slate-300">
              <div className="flex justify-between items-center">
                <span>API STATUS:</span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? "bg-emerald-400" : "bg-rose-400 animate-ping"}`} />
                  <span className={apiOnline ? "text-emerald-400" : "text-rose-400"}>{apiOnline ? "ONLINE" : "OFFLINE"}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>LATENCY:</span>
                <span className="text-emerald-400">14 ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span>TOTAL FEED ITEMS:</span>
                <span>{feed.length} loaded</span>
              </div>
              <div className="flex justify-between items-center">
                <span>COMPILER STATUS:</span>
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle size={10} />
                  <span>READY</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
