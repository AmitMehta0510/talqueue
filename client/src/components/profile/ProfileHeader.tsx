import React from "react";
import {
  Github,
  Linkedin,
  Globe,
  Link as LinkIcon,
  ShieldCheck,
  Loader2,
  MapPin,
  Zap,
  ExternalLink,
} from "lucide-react";
import { User as UserType } from "../../lib/api";
import { Avatar } from "../ui";
import {
  formatCount,
  titleCase,
  userHeadline,
  userName,
} from "../../core/utils/format";

export interface ProfileHeaderProps {
  profile: UserType;
  loading: boolean;
  completedTasks: number;
  totalTasks: number;
}

export function ProfileHeader({
  profile,
  loading,
  completedTasks,
  totalTasks,
}: ProfileHeaderProps) {
  const completePct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const links = [
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

  return (
    <div className="overflow-hidden rounded-t-xl border shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      {/* Banner */}
      <div
        className="relative h-40 bg-cover bg-center"
        style={
          profile.profile?.bannerUrl
            ? { backgroundImage: `url(${profile.profile.bannerUrl})` }
            : { background: "linear-gradient(135deg, var(--brand-light) 0%, var(--brand-glow) 50%, rgba(99,102,241,0.25) 100%)" }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Avatar + info */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative">
              <div className="rounded-full p-1 shadow-lg" style={{ outline: "4px solid var(--bg-surface)", background: "var(--bg-surface)" }}>
                <Avatar user={profile} size="lg" />
              </div>
              {profile.verifiedEngineer && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-white">
                  <ShieldCheck size={13} className="text-white" />
                </div>
              )}
            </div>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{userName(profile)}</h1>
                {loading && <Loader2 className="animate-spin" size={15} style={{ color: "var(--text-muted)" }} />}
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {userHeadline(profile) || `@${profile.username}`}
              </p>
              {profile.profile?.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={11} />
                  {profile.profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Trust + completion */}
          <div className="flex items-center gap-3">
            <CompletionRing pct={completePct} />
            <span className="chip flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
              {titleCase(profile.trustLevel || "BEGINNER")}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 flex flex-wrap gap-6 border-t pt-5 text-center" style={{ borderColor: "var(--border)" }}>
          <QuickStat label="Reputation" value={formatCount(profile.reputationScore)} accent="indigo" />
          <QuickStat label="Engineering" value={Math.round(profile.engineeringScore || 0)} accent="teal" />
          <QuickStat label="Followers" value={formatCount(profile.followersCount)} accent="slate" />
          <QuickStat label="Connections" value={formatCount(profile.connectionCount)} accent="slate" />
          <QuickStat label="Posts" value={formatCount(profile.postCount)} accent="slate" />
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noreferrer"
                className="chip inline-flex items-center gap-1.5 transition hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400"
              >
                <Icon size={13} />
                {label}
                <ExternalLink size={11} className="opacity-40" />
              </a>
            ))}
          </div>
        )}

        {/* Availability */}
        {availability.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {availability.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700"
              >
                <Zap size={11} />
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg width="56" height="56" className="-rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="#6366f1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute text-xs font-bold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
      </div>
      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Profile</span>
    </div>
  );
}

function QuickStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "indigo" | "teal" | "slate";
}) {
  const textClass =
    accent === "indigo"
      ? "text-indigo-600 dark:text-indigo-400"
      : accent === "teal"
        ? "text-teal-600 dark:text-teal-400"
        : "";

  return (
    <div>
      <div className={`text-lg font-bold ${textClass}`} style={!textClass ? { color: "var(--text-primary)" } : {}}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
