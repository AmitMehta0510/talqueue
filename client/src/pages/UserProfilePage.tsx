import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Award,
  Briefcase,
  Building2,
  Code2,
  ExternalLink,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
  User,
  UserPlus,
  Zap,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  EducationCard,
  ExperienceCard,
  SkillPill,
} from "../components/cards/ProfileCards";
import { Avatar, EmptyState, ErrorState, InlineLoader } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateDirectConversationMutation,
  useFollowUserMutation,
  useFollowingQuery,
  useUserProfileQuery,
} from "../hooks/usePlatformQueries";
import { FollowingPage } from "../lib/api";
import {
  formatCount,
  titleCase,
  userHeadline,
  userName,
} from "../lib/format";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";

type Tab = "about" | "experience" | "skills" | "education";

const flattenFollowing = <T, K extends string>(pages: Array<Record<K, T[]>>, key: K) =>
  pages.flatMap((page) => page[key] || []);

export function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileQuery = useUserProfileQuery(userId);
  const followingQuery = useFollowingQuery(user?.id, 20);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const followUser = useFollowUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();
  const profile = profileQuery.data;

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

  const isOwnProfile = Boolean(user?.id && user.id === userId);
  const isFollowing = Boolean(userId && followingIds.has(userId));

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

  const availability = [
    profile.openToWork && "Open to work",
    profile.openToInternship && "Internships",
    profile.acceptingCollaborators && "Collaborators",
    profile.acceptingReferrals && "Referrals",
    profile.acceptingMentorship && "Mentorship",
  ].filter(Boolean) as string[];

  const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: "about",      label: "About",      icon: User },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "skills",     label: "Skills",     icon: Code2 },
    { id: "education",  label: "Education",  icon: GraduationCap },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-sm">
        {/* Banner */}
        <div
          className="relative h-40 bg-cover bg-center"
          style={
            profile.profile?.bannerUrl
              ? { backgroundImage: `url(${profile.profile.bannerUrl})` }
              : { background: "linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #1e3a5f 100%)" }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Avatar + name */}
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                <div className="rounded-full p-1 ring-4 ring-white bg-white shadow-lg">
                  <Avatar user={profile} size="lg" />
                </div>
                {profile.verifiedEngineer && (
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 ring-2 ring-white">
                    <ShieldCheck size={13} className="text-white" />
                  </div>
                )}
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold text-slate-900">{userName(profile)}</h1>
                <p className="text-sm text-slate-500">
                  {userHeadline(profile) || `@${profile.username}`}
                </p>
                {profile.profile?.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={11} />
                    {profile.profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="user-profile-message-btn"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
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
              {profile.acceptingReferrals && (
                <button
                  id="user-profile-referral-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  onClick={() => setShowReferralModal(true)}
                >
                  <Send size={15} />
                  Request Referral
                </button>
              )}
              {isFollowing ? (
                <button
                  id="user-profile-following-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                  disabled
                >
                  <ShieldCheck size={15} />
                  Following
                </button>
              ) : (
                <button
                  id="user-profile-follow-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:text-slate-400"
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

          {/* Trust badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              <ShieldCheck size={12} className="text-emerald-700" />
              {titleCase(profile.trustLevel || "BEGINNER")}
            </span>
            {availability.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
              >
                <Zap size={11} />
                {a}
              </span>
            ))}
          </div>

          {/* Quick stats */}
          <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-100 pt-5">
            <QStat label="Reputation" value={formatCount(profile.reputationScore)} accent />
            <QStat label="Engineering" value={Math.round(profile.engineeringScore || 0)} />
            <QStat label="Followers" value={formatCount(profile.followersCount)} />
            <QStat label="Connections" value={formatCount(profile.connectionCount)} />
            <QStat label="Posts" value={formatCount(profile.postCount)} />
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
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
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="flex overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`user-profile-tab-${id}`}
              className={`relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-medium transition
                ${activeTab === id
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          ))}
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
                  <p className="text-sm leading-relaxed text-slate-600">{profile.profile.bio}</p>
                ) : (
                  <p className="text-sm italic text-slate-400">No bio added.</p>
                )}
              </InfoPanel>

              {profile.profile?.availabilityText && (
                <InfoPanel title="Availability" icon={Zap}>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {profile.profile.availabilityText}
                  </p>
                </InfoPanel>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <InfoPanel title="Profile signals" icon={MapPin}>
                <div className="space-y-2.5 text-sm text-slate-600">
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

        {/* EXPERIENCE */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Work Experience</h2>
            {(profile.experiences || []).length > 0 ? (
              <div className="space-y-3">
                {(profile.experiences || []).map((exp) => (
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
            <h2 className="text-base font-semibold text-slate-900">Skills</h2>
            {(profile.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).map((skill) => (
                  <SkillPill key={skill.id} skill={skill} large />
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
            <h2 className="text-base font-semibold text-slate-900">Education</h2>
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
      </div>

      {/* Referral modal */}
      {showReferralModal && (
        <RequestReferralModal
          targetUser={profile}
          onClose={() => setShowReferralModal(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-700" : "text-slate-800"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-emerald-700" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <div className="text-base font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
        <Icon size={22} className="text-slate-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <p className="mt-1 max-w-xs text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
