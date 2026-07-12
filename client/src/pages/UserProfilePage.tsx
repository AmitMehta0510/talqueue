import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Code2,
  ExternalLink,
  FolderKanban,
  Gift,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  EducationCard,
  ExperienceCard,
  SkillPill,
} from "../components/cards/ProfileCards";
import { ProjectCard } from "../components/cards/ProjectCard";
import { Avatar, EmptyState, ErrorState, InlineLoader } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useCreateDirectConversationMutation,
  useFollowUserMutation,
  useFollowingQuery,
  useMutualConnectionsQuery,
  useUserProfileQuery,
  useUpgradePremiumMutation,
  useUserTimelineQuery,
  usePostReactionMutation,
  useCommentOnPostMutation,
  useRepostMutation,
} from "../hooks/usePlatformQueries";
import { FeedCard } from "../components/cards/FeedCard";
import { FollowingPage } from "../lib/api";
import {
  formatCount,
  titleCase,
  userHeadline,
  userName,
} from "../core/utils/format";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";

type Tab = "about" | "posts" | "projects" | "experience" | "skills" | "education" | "connections";

const flattenFollowing = <T, K extends string>(pages: Array<Record<K, T[]>>, key: K) =>
  pages.flatMap((page) => page[key] || []);

export function UserProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileQuery = useUserProfileQuery(username);
  const profile = profileQuery.data;
  const followingQuery = useFollowingQuery(user?.id, 20);
  const mutualQuery = useMutualConnectionsQuery(profile?.id, 12);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedVerificationSkill, setSelectedVerificationSkill] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const followUser = useFollowUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();

  const followingIds = useMemo(
    () =>
      new Set(
        flattenFollowing<FollowingPage["following"][number], "following">(
          followingQuery.data?.pages || [],
          "following",
        )
          .map((item) => item.following?.id)
          .filter(Boolean) as string[],
      ),
    [followingQuery.data?.pages],
  );

  const isOwnProfile = Boolean(user && (user.id === username || user.username === username));
  const isFollowing = Boolean(profile?.id && followingIds.has(profile.id));

  if (!user) return <Navigate to="/auth" replace />;
  if (isOwnProfile) return <Navigate to="/profile" replace />;
  if (profileQuery.isLoading) return <InlineLoader label="Loading profile" />;

  if (profileQuery.isError) {
    return (
      <ErrorState
        title="Profile could not load"
        text="This profile may be private, unavailable, or temporarily unreachable."
        onRetry={() => profileQuery.refetch()}
      />
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Profile not found"
        text="This engineer profile is unavailable."
      />
    );
  }

  const startConversation = async () => {
    const result = await createDirectConversation.mutateAsync(profile.id);
    navigate(`/chat/${result.data.id}`);
  };

  const profileLinks = [
    { icon: Github, label: "GitHub", href: profile.profile?.githubUrl },
    { icon: Linkedin, label: "LinkedIn", href: profile.profile?.linkedinUrl },
    { icon: Globe, label: "Portfolio", href: profile.profile?.portfolioUrl },
    { icon: LinkIcon, label: "Resume", href: profile.profile?.resumeUrl },
  ].filter((l) => l.href);

  const availabilitySignals = [
    profile.openToWork             && { label: "Open to Work",       color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
    profile.openToInternship       && { label: "Internships",         color: "bg-sky-500/10 text-sky-400 border-sky-500/30",            dot: "bg-sky-500" },
    profile.acceptingReferrals     && { label: "Accepting Referrals", color: "bg-amber-500/10 text-amber-400 border-amber-500/30",      dot: "bg-amber-500" },
    profile.acceptingCollaborators && { label: "Collaborators",        color: "bg-violet-500/10 text-violet-400 border-violet-500/30",   dot: "bg-violet-500" },
    profile.acceptingMentorship    && { label: "Mentoring",            color: "bg-rose-500/10 text-rose-400 border-rose-500/30",         dot: "bg-rose-500" },
  ].filter(Boolean) as { label: string; color: string; dot: string }[];

  const isAvailable = availabilitySignals.length > 0;

  const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: "about",       label: "Overview",        icon: User },
    { id: "posts",       label: "Posts",           icon: MessageSquare },
    { id: "projects",   label: "Projects",        icon: FolderKanban },
    { id: "experience", label: "Experience",      icon: Briefcase },
    { id: "skills",     label: "Skills",          icon: Code2 },
    { id: "education",  label: "Education",       icon: GraduationCap },
    { id: "connections",label: "Mutual",          icon: Users },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-t-xl shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {/* Banner */}
        <div
          className="relative h-40 bg-cover bg-center"
          style={
            profile.profile?.bannerUrl
              ? { backgroundImage: `url(${profile.profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, #0f0f1a 0%, #1a1040 40%, #0d1b3e 70%, #0f0f1a 100%)" }
          }
        >
          {/* Decorative code symbols on default banner */}
          {!profile.profile?.bannerUrl && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden>
              {(["< />", "{ }", "=>", "&&", "//"] as const).map((sym, i) => (
                <span key={i} className="absolute font-mono font-black text-4xl" style={{ color: "#ffffff", opacity: 0.06,
                  top: `${[12,55,20,65,30][i]}%`, left: `${[6,20,50,60,80][i]}%` }}>{sym}</span>
              ))}
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="relative shrink-0 -mt-16 sm:-mt-10">
                <div
                  className="rounded-2xl p-0.5 shadow-xl"
                  style={{ background: "linear-gradient(135deg, var(--brand), #6366f1, #818cf8)", boxShadow: "0 0 0 3px var(--bg-surface), 0 0 20px rgba(99,102,241,0.3)" }}
                >
                  <div className="rounded-[13px] overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                    <Avatar user={profile} size="lg" />
                  </div>
                </div>
                {profile.verifiedEngineer && (
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-800">
                    <ShieldCheck size={13} className="text-white" />
                  </div>
                )}
              </div>
              <div className="mb-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{userName(profile)}</h1>
                  {isAvailable && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                      style={{ background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}
                      title="Available for opportunities"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--brand)" }}>@{profile.username}</p>
                {userHeadline(profile) && (
                  <p className="text-sm mt-1 max-w-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>{userHeadline(profile)}</p>
                )}
                {profile.profile?.location && (
                  <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <MapPin size={11} />
                    {profile.profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* CTAs — prominent gradient Message + outlined Follow */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="user-profile-message-btn"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--brand), #6366f1)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}
                disabled={createDirectConversation.isPending}
                onClick={startConversation}
              >
                {createDirectConversation.isPending ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <MessageSquare size={15} />
                )}
                Message
              </button>
              {(profile.primaryRole === "PROFESSIONAL" || profile.primaryRole === "WORKING_PROFESSIONAL" || profile.primaryRole === "RECRUITER") &&
                profile.acceptingReferrals === true && (
                <button
                  id="user-profile-referral-btn"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-400 transition-all duration-150 hover:bg-amber-500/20"
                  onClick={() => setShowReferralModal(true)}
                >
                  <Gift size={15} />
                  Ask Referral
                </button>
              )}
              {isFollowing ? (
                <button
                  id="user-profile-following-btn"
                  className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-150"
                  style={{ borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "var(--brand)" }}
                  disabled
                >
                  <ShieldCheck size={15} />
                  Following
                </button>
              ) : (
                <button
                  id="user-profile-follow-btn"
                  className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-200 hover:border-indigo-400 disabled:opacity-50"
                  style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
                  disabled={followUser.isPending}
                  onClick={() => followUser.mutate(profile.id)}
                >
                  {followUser.isPending ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <UserPlus size={15} />
                  )}
                  Follow
                </button>
              )}
            </div>
          </div>

          {/* Role badge + Trust badge + Availability */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Colored role badge */}
            {(() => {
              const ROLE_BADGE: Record<string, { label: string; className: string }> = {
                STUDENT:              { label: "Student",              className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
                PROFESSIONAL:         { label: "Professional",         className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
                WORKING_PROFESSIONAL: { label: "Working Professional", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
                RECRUITER:            { label: "Recruiter",            className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
                TPO:                  { label: "TPO Officer",          className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                MENTOR:               { label: "Mentor",               className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
              };
              const badge = ROLE_BADGE[profile.primaryRole || "STUDENT"] ?? ROLE_BADGE["STUDENT"];
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge.className}`}>
                  <Code2 size={11} />
                  {badge.label}
                </span>
              );
            })()}
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
            >
              <ShieldCheck size={12} className="text-indigo-500" />
              {titleCase(profile.trustLevel || "BEGINNER")}
            </span>
            {availabilitySignals.map((sig) => (
              <span
                key={sig.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${sig.color}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sig.dot} shrink-0`} />
                {sig.label}
              </span>
            ))}
          </div>

          {/* Glowing stat cards */}
          <div
            className="mt-5 border-t pt-5 grid grid-cols-2 sm:grid-cols-5 gap-3"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              { label: "Reputation",   value: formatCount(profile.reputationScore),          accent: true },
              { label: "Eng. Score",   value: Math.round(profile.engineeringScore || 0),     accent: false },
              { label: "Followers",    value: formatCount(profile.followersCount),            accent: false },
              { label: "Connections",  value: formatCount(profile.connectionCount),           accent: false },
              { label: "Posts",        value: formatCount(profile.postCount),                 accent: false },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border py-3 px-2 text-center shadow-sm"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: s.accent ? "var(--brand)" : "var(--text-primary)" }}
                >
                  {s.value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* External links */}
          {profileLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profileLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
                >
                  <Icon size={13} />
                  {label}
                  <ExternalLink size={11} className="opacity-40" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b backdrop-blur-sm shadow-sm" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg-surface) 95%, transparent)" }}>
        <div className="flex overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`user-profile-tab-${id}`}
                type="button"
                className="relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all duration-200"
                style={isActive ? { color: "var(--brand)" } : { color: "var(--text-muted)" }}
                onClick={() => setActiveTab(id)}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                <Icon size={15} />
                {label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--brand), #6366f1)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-5">
              <InfoPanel title="About" icon={User}>
                {profile.profile?.bio ? (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.profile.bio}</p>
                ) : (
                  <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>No bio added.</p>
                )}
              </InfoPanel>

              {profile.profile?.availabilityText && (
                <InfoPanel title="Availability" icon={Zap}>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {profile.profile.availabilityText}
                  </p>
                </InfoPanel>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <InfoPanel title="Profile signals" icon={MapPin}>
                <div className="space-y-2.5 text-sm">
                  <SigRow icon={MapPin}>{profile.profile?.location || "No location"}</SigRow>
                  <SigRow icon={Building2}>
                    {profile.profile?.college?.name || "No college"}
                  </SigRow>
                  <SigRow icon={GraduationCap}>
                    {profile.profile?.department?.name || "No department"}
                  </SigRow>
                </div>
              </InfoPanel>

              <InfoPanel title="Stats" icon={Star}>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Skills" value={profile._count?.skills ?? 0} />
                  <MiniStat label="Experiences" value={profile._count?.experiences ?? 0} />
                  <MiniStat label="Following" value={formatCount(profile.followingCount)} />
                  <MiniStat label="Trust" value={titleCase(profile.trustLevel || "BEGINNER")} />
                </div>
              </InfoPanel>
            </div>
          </div>
        )}

        {/* POSTS & REPOSTS */}
        {activeTab === "posts" && profile.id && (
          <PostsTab userId={profile.id} />
        )}

        {/* PROJECTS */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Projects</h2>
            {(profile.ownedProjects || []).length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {(profile.ownedProjects || []).map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    currentUserId={user?.id}
                    onJoin={() => {}}
                  />
                ))}
              </div>
            ) : (
              <BlankSection
                icon={FolderKanban}
                title="No projects showcase yet"
                text="This engineer hasn't listed any public projects yet."
              />
            )}
          </div>
        )}

        {/* EXPERIENCE */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Work Experience</h2>
            {(profile.experiences || []).length > 0 || (profile.tpoMemberships || []).length > 0 || (profile.collegeAdminships || []).length > 0 ? (
              <div className="space-y-3">
                {/* TPO Memberships */}
                {(profile.tpoMemberships || []).map((tpo: any) => (
                  <article key={tpo.id} className="group relative flex flex-col gap-4 panel p-5 border border-indigo-500/10 hover:border-indigo-500/40 dark:hover:border-indigo-400/40">
                    <div className="flex gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-500 dark:from-indigo-950/40 dark:to-indigo-900/40 dark:text-indigo-400">
                        <GraduationCap size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-primary">Training & Placement Officer (TPO)</h4>
                            <p className="mt-0.5 text-sm text-secondary">{tpo.college?.name || "Target College"}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/40">
                              <ShieldCheck size={11} />
                              Verified Staff
                            </span>
                            <span className="chip">
                              Academic Staff
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Active Institutional Administrator
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {/* College Adminships */}
                {(profile.collegeAdminships || []).map((admin: any) => (
                  <article key={admin.id} className="group relative flex flex-col gap-4 panel p-5 border border-indigo-500/10 hover:border-indigo-500/40 dark:hover:border-indigo-400/40">
                    <div className="flex gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-500 dark:from-indigo-950/40 dark:to-indigo-900/40 dark:text-indigo-400">
                        <GraduationCap size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-primary">College Placement Administrator</h4>
                            <p className="mt-0.5 text-sm text-secondary">{admin.college?.name || "Target College"}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-12">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/40">
                              <ShieldCheck size={11} />
                              Verified Admin
                            </span>
                            <span className="chip">
                              Academic Staff
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Active Institutional Administrator
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {(profile.experiences || []).map((exp: any) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            ) : (
              <BlankSection icon={Briefcase} title="No experience listed" text="This engineer hasn't added work experience yet." />
            )}
          </div>
        )}

        {/* SKILLS */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Skills</h2>
            {(profile.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).map((skill) => (
                  <SkillPill
                    key={skill.id}
                    skill={skill}
                    large
                    onClick={() => {
                      if (skill.verified) {
                        setSelectedVerificationSkill(skill);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <BlankSection icon={Code2} title="No skills listed" text="This engineer hasn't added skills yet." />
            )}
          </div>
        )}

        {/* EDUCATION */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Education</h2>
            {(profile.educations || []).length > 0 ? (
              <div className="space-y-3">
                {(profile.educations || []).map((edu) => (
                  <EducationCard key={edu.id} education={edu} />
                ))}
              </div>
            ) : (
              <BlankSection icon={GraduationCap} title="No education listed" text="This engineer hasn't added education records yet." />
            )}
          </div>
        )}

        {/* MUTUAL CONNECTIONS */}
        {activeTab === "connections" && (() => {
          const mutualPages = mutualQuery.data?.pages || [];
          const mutuals = mutualPages.flatMap((p: any) => p.connections || p.users || []);
          return (
            <div className="space-y-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Mutual Connections
                {mutuals.length > 0 && (
                  <span className="ml-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {mutuals.length}{mutualQuery.hasNextPage ? "+" : ""}
                  </span>
                )}
              </h2>
              {mutualQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  <Loader2 className="animate-spin" size={15} />
                  Loading mutual connections…
                </div>
              ) : mutuals.length > 0 ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mutuals.map((item: any) => {
                      const u = item?.user || item?.follower || item?.following || item;
                      if (!u?.id) return null;
                      return (
                        <button
                          key={u.id}
                          className="flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
                          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                          onClick={() => navigate(`/users/${u.username || u.id}`)}
                        >
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {u.profile?.fullName || u.username}
                            </div>
                            <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                              {u.profile?.headline || u.primaryRole || `@${u.username}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {mutualQuery.hasNextPage && (
                    <button
                      className="btn-secondary w-full"
                      disabled={mutualQuery.isFetchingNextPage}
                      onClick={() => mutualQuery.fetchNextPage()}
                    >
                      {mutualQuery.isFetchingNextPage
                        ? <Loader2 className="animate-spin" size={16} />
                        : <Users size={16} />}
                      Load more
                    </button>
                  )}
                </>
              ) : (
                <BlankSection
                  icon={Users}
                  title="No mutual connections"
                  text="You and this engineer don't share any common connections yet."
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* Referral modal */}
      {showReferralModal && (
        <RequestReferralModal
          targetUser={profile}
          onClose={() => setShowReferralModal(false)}
        />
      )}

      {/* Verification details modal */}
      {selectedVerificationSkill && (
        <SkillVerificationModal
          skill={selectedVerificationSkill}
          onClose={() => setSelectedVerificationSkill(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-bold ${accent ? "text-indigo-600 dark:text-indigo-400" : ""}`} style={!accent ? { color: "var(--text-primary)" } : {}}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SigRow({
  icon: Icon,
  children,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "var(--bg-surface-2)" }}>
      <div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function BlankSection({
  icon: Icon,
  title,
  text,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
        <Icon size={22} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</h3>
        <p className="mt-1 max-w-xs text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>
      </div>
    </div>
  );
}

function SkillVerificationModal({
  skill,
  onClose,
}: {
  skill: any;
  onClose: () => void;
}) {
  const proof = skill.verificationProof;
  const isLocked = proof?.locked === true;
  const upgradeMutation = useUpgradePremiumMutation();

  const handleUpgrade = () => {
    upgradeMutation.mutate(undefined, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
              {skill.skill?.name || "Skill"} Verification
            </h3>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLocked ? (
            <div className="text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 ring-4 ring-amber-100 dark:ring-amber-900/50">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Unlock Verification Proof</h4>
                <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Unlock Recruiter Premium to inspect detailed repository statistics, code byte counts, and platform activity data that validated this skill.
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgradeMutation.isPending}
                className="btn-primary w-full bg-amber-600 hover:bg-amber-700 ring-amber-100 flex items-center justify-center gap-2"
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Upgrade to Premium"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Verification Source:</span>
                <span className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700">
                  {skill.verificationSource || "External Profiles"}
                </span>
              </div>

              {/* GitHub Proof Details */}
              {proof?.repositories && (
                <div className="space-y-2">
                  <span className="font-semibold block" style={{ color: "var(--text-primary)" }}>Verified GitHub repositories:</span>
                  <div className="space-y-2 rounded-xl border p-3.5" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    {proof.repositories.map((repo: any) => (
                      <div key={repo.name} className="flex justify-between items-center text-xs">
                        <span className="font-medium text-indigo-700 dark:text-indigo-400 break-all">{repo.name}</span>
                        <span className="shrink-0" style={{ color: "var(--text-muted)" }}>{(repo.bytes / 1024).toFixed(1)} KB code</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      <span>Total analyzed size:</span>
                      <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{(proof.totalBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              )}

              {/* LeetCode Proof Details */}
              {proof?.leetcode && (
                <div className="space-y-2">
                  <span className="font-semibold block" style={{ color: "var(--text-primary)" }}>LeetCode metrics:</span>
                  <div className="rounded-xl border p-3.5 space-y-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>LeetCode Username:</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>@{proof.leetcode.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Problems Solved in language:</span>
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{proof.leetcode.problemsSolved} questions</span>
                    </div>
                  </div>
                </div>
              )}

              {/* HackerRank/GFG Proof Details */}
              {(proof?.hackerrank || proof?.geeksforgeeks || proof?.codingninjas) && (
                <div className="space-y-2">
                  <span className="font-semibold block" style={{ color: "var(--text-primary)" }}>Coding Platform Profile:</span>
                  <div className="rounded-xl border p-3.5 space-y-1.5 text-xs" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    {proof.hackerrank && (
                      <div className="flex justify-between">
                        <span style={{ color: "var(--text-muted)" }}>HackerRank Username:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>@{proof.hackerrank.username}</span>
                      </div>
                    )}
                    {proof.geeksforgeeks && (
                      <div className="flex justify-between">
                        <span style={{ color: "var(--text-muted)" }}>GeeksforGeeks Username:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>@{proof.geeksforgeeks.username}</span>
                      </div>
                    )}
                    {proof.codingninjas && (
                      <div className="flex justify-between">
                        <span style={{ color: "var(--text-muted)" }}>Coding Ninjas Username:</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>@{proof.codingninjas.username}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-indigo-600 dark:text-indigo-400">
                      <span>Verification Status:</span>
                      <span>{proof.hackerrank?.status || proof.geeksforgeeks?.status || proof.codingninjas?.status}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-[10px] leading-normal" style={{ color: "var(--text-muted)" }}>
                This verification is based on public source code repositories and profile analytics fetched from connected accounts.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Posts Tab ────────────────────────────────────────────────────────────────
function PostsTab({ userId }: { userId: string }) {
  const { user } = useAuth();
  const timelineQuery = useUserTimelineQuery(userId);
  const postReaction = usePostReactionMutation();
  const commentOnPost = useCommentOnPostMutation();
  const repost = useRepostMutation();

  const handleLike = (id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "like" });
  };

  const handleSave = (id: string) => {
    if (postReaction.isPending) return;
    postReaction.mutate({ id, action: "save" });
  };

  const handleComment = async (id: string, content: string, parentCommentId?: string) => {
    try {
      await commentOnPost.mutateAsync({ id, content, parentCommentId });
      return true;
    } catch {
      return false;
    }
  };

  const handleRepost = async (id: string, caption?: string) => {
    try {
      await repost.mutateAsync({ id, caption });
      return true;
    } catch {
      return false;
    }
  };

  const timeline = timelineQuery.data || [];
  const interacting = postReaction.isPending || commentOnPost.isPending || repost.isPending;

  if (timelineQuery.isLoading) {
    return <InlineLoader label="Loading posts..." />;
  }

  return (
    <div className="space-y-4">
      {timeline.length ? (
        timeline.map((item, index) => (
          <FeedCard
            key={`${item.type}-${(item.data as any).id || index}`}
            item={item}
            position={index}
            trackImpression={false}
            canInteract={Boolean(user) && !interacting}
            onLike={handleLike}
            onSave={handleSave}
            onComment={handleComment}
            onRepost={handleRepost}
          />
        ))
      ) : (
        <BlankSection
          icon={MessageSquare}
          title="No posts or reposts published"
          text="This engineer hasn't published any posts or reposts yet."
        />
      )}
    </div>
  );
}
