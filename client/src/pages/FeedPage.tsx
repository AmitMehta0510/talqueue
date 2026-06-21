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
  X,
  Send,
  Users,
  History,
  CalendarDays,
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
  useHackathonsQuery,
} from "../hooks/usePlatformQueries";
import { titleCase, userName, formatCount, userHeadline, formatDate } from "../lib/format";

type FeedCategory = "all" | "recommended" | "discussions" | "projects" | "jobs";

export function FeedPage() {
  const { user, apiOnline } = useAuth();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Compose modal states
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composePostType, setComposePostType] = useState("GENERAL");

  // API Queries & Mutations
  const feedQuery = useFeedQuery(30);
  const projectsQuery = useProjectsQuery(12);
  const jobsQuery = useJobsQuery();
  const leaderboardQuery = useReputationLeaderboardQuery();
  const myReputationQuery = useMyReputationQuery();
  const hackathonsQuery = useHackathonsQuery({ status: "ACTIVE" });

  const createPost = useCreatePostMutation();
  const postReaction = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost = useRepostMutation();

  const feed = useMemo(() => feedQuery.data || [], [feedQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const jobs = useMemo(() => jobsQuery.data?.jobs || [], [jobsQuery.data]);
  const leaders = useMemo(() => leaderboardQuery.data || [], [leaderboardQuery.data]);
  const featuredHackathons = useMemo(() => hackathonsQuery.data || [], [hackathonsQuery.data]);

  const refreshing =
    feedQuery.isFetching ||
    projectsQuery.isFetching ||
    jobsQuery.isFetching ||
    leaderboardQuery.isFetching ||
    myReputationQuery.isFetching ||
    hackathonsQuery.isFetching;

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
      return true;
    });
  }, [feed, activeCategory]);

  const handleRefreshAll = () => {
    feedQuery.refetch();
    projectsQuery.refetch();
    jobsQuery.refetch();
    leaderboardQuery.refetch();
    hackathonsQuery.refetch();
    if (user) {
      myReputationQuery.refetch();
    }
  };

  const displayReputation = myReputationQuery.data?.reputationScore ?? user?.reputationScore ?? 0;
  const displayEngineering = myReputationQuery.data?.engineeringScore ?? user?.engineeringScore ?? 0;
  const displayBadgeCount = myReputationQuery.data?.badges?.length ?? user?.skills?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/70 border border-slate-200/50 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            {getGreeting()}, {user ? userName(user) : "Engineer"}!
          </h2>
          <p className="text-xxs text-slate-500 mt-0.5">Welcome to your collaborative dev feed workspace.</p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="btn-secondary py-1 px-3 text-xxs font-semibold flex items-center gap-1.5"
          type="button"
        >
          {refreshing ? (
            <Loader2 className="animate-spin text-emerald-700" size={13} />
          ) : (
            <RefreshCcw size={13} className="text-emerald-750" />
          )}
          Refresh Feed
        </button>
      </div>

      {/* THREE-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        
        {/* LEFT COLUMN - USER CARD & QUICK LINKS */}
        <aside className="lg:col-span-3 space-y-6">
          {/* User Profile Snapshot Card */}
          {user ? (
            <div className="panel overflow-hidden">
              <div className="h-16 w-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800" />
              <div className="p-4 relative">
                <div className="absolute -top-9 left-4 rounded-full border-4 border-white shadow-md">
                  <Avatar user={user} size="md" />
                </div>
                
                <div className="pt-7">
                  <Link to="/profile" className="block group">
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                      {userName(user)}
                    </h2>
                  </Link>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">@{user.username}</p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                    {userHeadline(user) || "Professional Software Developer"}
                  </p>

                  <div className="mt-4 border-t border-slate-100/80 pt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div>
                      <span className="block text-slate-800 font-bold text-xxs">{formatCount(displayReputation)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Rep</span>
                    </div>
                    <div>
                      <span className="block text-slate-800 font-bold text-xxs">{Math.round(displayEngineering)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Score</span>
                    </div>
                    <div>
                      <span className="block text-slate-800 font-bold text-xxs">{displayBadgeCount}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Badges</span>
                    </div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 py-1.5 text-xxs font-bold text-slate-700 transition"
                  >
                    <span>View full profile</span>
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-5 text-center">
              <UserIcon className="mx-auto text-slate-350 mb-2.5" size={28} />
              <h2 className="text-xs font-bold text-slate-900">Developer Profile Snapshot</h2>
              <p className="mt-1.5 text-xxs text-slate-500 leading-normal">
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
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                Developer Shortcuts
              </h3>
              <div className="space-y-2.5 text-xs font-semibold text-slate-700">
                <Link to="/teams" className="flex items-center gap-2 hover:text-emerald-700 transition">
                  <Users size={14} className="text-slate-400" />
                  <span>My Teams</span>
                </Link>
                <Link to="/jobs" className="flex items-center gap-2 hover:text-emerald-700 transition">
                  <Briefcase size={14} className="text-slate-400" />
                  <span>Saved Opportunity Cards</span>
                </Link>
                <Link to="/referrals" className="flex items-center gap-2 hover:text-emerald-700 transition">
                  <Send size={14} className="text-slate-400" />
                  <span>Referrals Console</span>
                </Link>
                <Link to="/reputation" className="flex items-center gap-2 hover:text-emerald-700 transition">
                  <History size={14} className="text-slate-400" />
                  <span>Points & Badges Log</span>
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* MIDDLE COLUMN - POST TRIGGER, CATEGORY TABS & FEED LIST */}
        <section className="lg:col-span-6 space-y-6">
          {/* Start a Post Card (LinkedIn trigger style) */}
          {user && (
            <div className="panel p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="sm" />
                <button
                  onClick={() => { setComposePostType("GENERAL"); setShowComposeModal(true); }}
                  className="flex-1 text-left bg-slate-100 hover:bg-slate-200/80 rounded-full px-4 py-2 text-xs font-semibold text-slate-500 transition border border-slate-200/50 outline-none"
                >
                  Start an engineering update...
                </button>
              </div>
              <div className="flex items-center justify-around border-t border-slate-100 pt-3 text-xxs font-bold text-slate-500">
                <button
                  onClick={() => { setComposePostType("PROJECT_UPDATE"); setShowComposeModal(true); }}
                  className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition"
                >
                  <Rocket className="text-indigo-650" size={15} />
                  Project Update
                </button>
                <button
                  onClick={() => { setComposePostType("HACKATHON"); setShowComposeModal(true); }}
                  className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition"
                >
                  <Award className="text-amber-500" size={15} />
                  Hackathon
                </button>
                <button
                  onClick={() => { setComposePostType("ACHIEVEMENT"); setShowComposeModal(true); }}
                  className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition"
                >
                  <Sparkles className="text-emerald-600" size={15} />
                  Achievement
                </button>
              </div>
            </div>
          )}

          {/* Category tabs selector bar */}
          <div className="panel p-1 shadow-sm overflow-x-auto">
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
                    className={`relative rounded-md px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? "bg-slate-950 text-white shadow"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {cat.label}
                    {cat.id === "recommended" && feed.some((item) => item.reason) && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Loading spinner */}
          {refreshing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/70 border border-slate-200/50 rounded-lg px-4 py-2.5 shadow-sm">
              <Loader2 className="animate-spin text-emerald-700" size={15} />
              <span>Updating platform stream feeds...</span>
            </div>
          )}

          {/* Feed List */}
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
                title={activeCategory === "recommended" ? "No recommendations matches" : "Workspace feed empty"}
                text={
                  activeCategory === "recommended"
                    ? "Add detailed skills and experiences to your developer profile to enable the matching engine recommendation signals."
                    : "No posts found in this feed category at the moment. Try reloading the feed."
                }
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN - TOP ENGINEERS, PROJECTS & MONITOR TELEMETRY */}
        <aside className="hidden lg:col-span-3 space-y-6 lg:block">
          {/* Top Engineers Leaderboard */}
          <div className="panel p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                Top Engineers
              </h3>
            </div>

            {leaderboardQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Loading rankings...</span>
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
                              to={`/users/${lead.user?.username || lead.userId}`}
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
              <div className="text-xs text-slate-450 text-center py-4">No top engineers data.</div>
            )}
          </div>

          {/* Featured Projects Card */}
          <div className="panel p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <Rocket size={16} className="text-indigo-600" />
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                Featured Repositories
              </h3>
            </div>

            {projectsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Loading repositories...</span>
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3.5">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="group/item">
                    <Link
                      to={`/projects/${project.slug || project.id}`}
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

          {/* Featured Hackathons Card */}
          <div className="panel p-4 bg-white border-slate-200 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center justify-center p-1 rounded bg-amber-50 text-amber-500">
                <Trophy size={14} className="stroke-[2.5]" />
              </div>
              <h3 className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                Featured Hackathons
              </h3>
            </div>

            {hackathonsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin text-emerald-600" />
                <span>Loading hackathons...</span>
              </div>
            ) : featuredHackathons.length > 0 ? (
              <div className="space-y-1">
                {featuredHackathons.slice(0, 3).map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="group/item -mx-2 p-2.5 rounded-lg border border-transparent hover:bg-slate-50/80 hover:border-slate-100 hover:pl-3.5 transition-all duration-300 border-l-2 hover:border-l-emerald-500 flex flex-col"
                  >
                    <Link
                      to={`/hackathons/${hackathon.slug || hackathon.id}`}
                      className="block text-xs font-bold text-slate-800 hover:text-emerald-700 transition truncate"
                    >
                      {hackathon.title}
                    </Link>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {hackathon.shortDescription || hackathon.description || "Active collaboration hackathon"}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {hackathon.sourcePlatform ? (
                          <span className={`chip text-[8px] py-0 px-1.5 font-bold uppercase tracking-wide border ${
                            hackathon.sourcePlatform === "Devpost"
                              ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                              : hackathon.sourcePlatform === "Devfolio"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : hackathon.sourcePlatform === "Unstop"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                            {hackathon.sourcePlatform}
                          </span>
                        ) : (
                          <span className="chip text-[8px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            Internal
                          </span>
                        )}
                        {hackathon.mode && (
                          <span className="chip text-[8px] py-0 px-1.5 bg-slate-50 border border-slate-100/60 text-slate-500">
                            {titleCase(hackathon.mode)}
                          </span>
                        )}
                      </div>
                      
                      {hackathon.startDate && (
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                          <CalendarDays size={10} className="text-slate-350" />
                          Starts {formatDate(hackathon.startDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">No active hackathons available.</div>
            )}
          </div>

          {/* Telemetry Snapshot Monitor Widget */}
          <div className="panel p-4 bg-slate-950 text-white border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
              <Activity size={16} className="text-emerald-400" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-white">
                Telemetry Monitor
              </h3>
            </div>
            
            <div className="space-y-2 text-[10px] font-semibold text-slate-350">
              <div className="flex justify-between items-center">
                <span>API MONITOR STATUS:</span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? "bg-emerald-400" : "bg-rose-400 animate-ping"}`} />
                  <span className={apiOnline ? "text-emerald-400" : "text-rose-400"}>{apiOnline ? "ONLINE" : "OFFLINE"}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>LOCAL LATENCY SPEED:</span>
                <span className="text-emerald-400">12 ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span>CACHED STREAM ITEMS:</span>
                <span>{feed.length} elements</span>
              </div>
              <div className="flex justify-between items-center">
                <span>INTEGRITY PIPELINE:</span>
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle size={10} />
                  <span>SECURE</span>
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>

      {/* COMPOSER OVERLAY MODAL */}
      {showComposeModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setShowComposeModal(false)} />
          <div className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl z-10 animate-in fade-in zoom-in duration-150 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <Sparkles className="text-emerald-700" size={17} />
                Compose Engineering Update
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="icon-btn border-slate-100 hover:bg-slate-100 shrink-0"
                type="button"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
            
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
          </div>
        </div>
      )}
    </div>
  );
}
