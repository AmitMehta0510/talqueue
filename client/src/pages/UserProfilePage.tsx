import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Send,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { EducationCard, ExperienceCard, SkillPill } from "../components/cards/ProfileCards";
import { Avatar, EmptyState, ErrorState, InlineLoader, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateDirectConversationMutation,
  useFollowUserMutation,
  useFollowingQuery,
  useUserProfileQuery,
} from "../hooks/usePlatformQueries";
import { FollowingPage } from "../lib/api";
import { formatCount, titleCase, userHeadline, userName } from "../lib/format";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";

const flattenPages = <T, K extends string>(pages: Array<Record<K, T[]>>, key: K) =>
  pages.flatMap((page) => page[key] || []);

export function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileQuery = useUserProfileQuery(userId);
  const followingQuery = useFollowingQuery(user?.id, 20);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const followUser = useFollowUserMutation();
  const createDirectConversation = useCreateDirectConversationMutation();
  const profile = profileQuery.data;

  const followingIds = useMemo(
    () =>
      new Set(
        flattenPages<FollowingPage["following"][number], "following">(
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isOwnProfile) {
    return <Navigate to="/profile" replace />;
  }

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
    return <EmptyState icon={ShieldCheck} title="Profile not found" text="This engineer profile is unavailable." />;
  }

  const startConversation = async () => {
    const result = await createDirectConversation.mutateAsync(profile.id);
    navigate(`/chat/${result.data.id}`);
  };
  const profileLinks = [
    { label: "GitHub", href: profile.profile?.githubUrl },
    { label: "LinkedIn", href: profile.profile?.linkedinUrl },
    { label: "Portfolio", href: profile.profile?.portfolioUrl },
    { label: "Resume", href: profile.profile?.resumeUrl },
  ].flatMap((link) => (link.href ? [{ ...link, href: link.href }] : []));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="space-y-5">
        <div className="panel overflow-hidden">
          <div
            className="h-28 bg-emerald-950 bg-cover bg-center"
            style={profile.profile?.bannerUrl ? { backgroundImage: `url(${profile.profile.bannerUrl})` } : undefined}
          />
          <div className="px-5 pb-5">
            <div className="-mt-8 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <Avatar user={profile} />
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950">{userName(profile)}</h2>
                    {profile.verifiedEngineer && (
                      <span className="chip bg-white text-emerald-700">
                        <ShieldCheck size={14} />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {userHeadline(profile) || `@${profile.username}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  disabled={createDirectConversation.isPending}
                  onClick={startConversation}
                >
                  {createDirectConversation.isPending ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
                  Message
                </button>
                {profile.acceptingReferrals && (
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => setShowReferralModal(true)}
                  >
                    <Send size={16} />
                    Request Referral
                  </button>
                )}
                {isFollowing ? (
                  <button className="btn-secondary" type="button" disabled>
                    <ShieldCheck size={16} />
                    Following
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={followUser.isPending}
                    onClick={() => followUser.mutate(profile.id)}
                  >
                    {followUser.isPending ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                    Follow
                  </button>
                )}
              </div>
            </div>

            {profile.profile?.bio && (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">{profile.profile.bio}</p>
            )}

            {profileLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {profileLinks.map((link) => (
                  <a
                    className="btn-secondary px-3 py-1.5"
                    href={link.href}
                    key={link.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={15} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
              <Metric label="Reputation" value={formatCount(profile.reputationScore)} />
              <Metric label="Engineering" value={Math.round(profile.engineeringScore || 0)} />
              <Metric label="Followers" value={formatCount(profile.followersCount)} />
              <Metric label="Connections" value={formatCount(profile.connectionCount)} />
            </div>
          </div>
        </div>

        <ProfilePanel title="Skills" loading={false}>
          <div className="flex flex-wrap gap-2">
            {(profile.skills || []).length ? (
              (profile.skills || []).map((skill) => <SkillPill key={skill.id} skill={skill} />)
            ) : (
              <p className="text-sm text-slate-500">No skills listed yet.</p>
            )}
          </div>
        </ProfilePanel>

        <ProfilePanel title="Experience" loading={false}>
          <div className="grid gap-3 md:grid-cols-2">
            {(profile.experiences || []).length ? (
              (profile.experiences || []).map((experience) => (
                <ExperienceCard experience={experience} key={experience.id} />
              ))
            ) : (
              <p className="text-sm text-slate-500">No experience listed yet.</p>
            )}
          </div>
        </ProfilePanel>

        <ProfilePanel title="Education" loading={false}>
          <div className="grid gap-3 md:grid-cols-2">
            {(profile.educations || []).length ? (
              (profile.educations || []).map((education) => (
                <EducationCard education={education} key={education.id} />
              ))
            ) : (
              <p className="text-sm text-slate-500">No education listed yet.</p>
            )}
          </div>
        </ProfilePanel>
      </section>

      <aside className="space-y-5">
        <ProfilePanel title="Profile signals" loading={profileQuery.isFetching}>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              {profile.profile?.location || "No location yet"}
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              {profile.profile?.college?.name || "No college selected"}
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-slate-400" />
              {profile.profile?.department?.name || "No department selected"}
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-slate-400" />
              {profile.profile?.portfolioUrl || profile.profile?.githubUrl || "No links yet"}
            </div>
          </div>
        </ProfilePanel>

        <ProfilePanel title="Availability" loading={false}>
          <div className="flex flex-wrap gap-2">
            {profile.openToWork && <span className="chip">Open to work</span>}
            {profile.openToInternship && <span className="chip">Internships</span>}
            {profile.acceptingCollaborators && <span className="chip">Collaborators</span>}
            {profile.acceptingReferrals && <span className="chip">Referrals</span>}
            {profile.acceptingMentorship && <span className="chip">Mentorship</span>}
            {!profile.openToWork &&
              !profile.openToInternship &&
              !profile.acceptingCollaborators &&
              !profile.acceptingReferrals &&
              !profile.acceptingMentorship && (
                <p className="text-sm text-slate-500">No availability preferences listed.</p>
              )}
          </div>
        </ProfilePanel>

        <ProfilePanel title="Counts" loading={false}>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Posts" value={formatCount(profile.postCount)} />
            <Metric label="Following" value={formatCount(profile.followingCount)} />
            <Metric label="Skills" value={profile._count?.skills || 0} />
            <Metric label="Trust" value={titleCase(profile.trustLevel || "BEGINNER")} />
          </div>
        </ProfilePanel>
      </aside>
      {showReferralModal && (
        <RequestReferralModal
          targetUser={profile}
          onClose={() => setShowReferralModal(false)}
        />
      )}
    </div>
  );
}

function ProfilePanel({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {loading && <Loader2 className="animate-spin text-slate-400" size={15} />}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
