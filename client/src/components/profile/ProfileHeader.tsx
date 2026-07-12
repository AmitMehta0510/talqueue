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
  Code2,
  Flame,
  Trophy,
  FileText,
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

// Role badge config — color-coded per role type
const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  STUDENT:              { label: "Student",              className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  PROFESSIONAL:         { label: "Professional",         className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  WORKING_PROFESSIONAL: { label: "Working Professional", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  RECRUITER:            { label: "Recruiter",            className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  TPO:                  { label: "TPO Officer",          className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  MENTOR:               { label: "Mentor",               className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  COLLEGE_ADMIN:        { label: "Institution Admin",    className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
};

export function ProfileHeader({
  profile,
  loading,
}: ProfileHeaderProps) {
  const links = [
    { icon: Github,   label: "GitHub",    href: profile.profile?.githubUrl },
    { icon: Linkedin, label: "LinkedIn",  href: profile.profile?.linkedinUrl },
    { icon: Globe,    label: "Portfolio", href: profile.profile?.portfolioUrl },
    { icon: FileText, label: "Resume",    href: profile.profile?.resumeUrl },
  ].filter((l) => l.href);

  // Structured availability signals with per-signal styling
  const availabilitySignals = [
    profile.openToWork             && { label: "Open to Work",        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",  dot: "bg-emerald-500" },
    profile.openToInternship       && { label: "Internships",          color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             dot: "bg-sky-500" },
    profile.acceptingReferrals     && { label: "Accepting Referrals",  color: "bg-amber-500/10 text-amber-400 border-amber-500/30",       dot: "bg-amber-500" },
    profile.acceptingCollaborators && { label: "Collaborators",         color: "bg-violet-500/10 text-violet-400 border-violet-500/30",    dot: "bg-violet-500" },
    profile.acceptingMentorship    && { label: "Mentoring",             color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          dot: "bg-rose-500" },
  ].filter(Boolean) as { label: string; color: string; dot: string }[];

  const isAvailable = availabilitySignals.length > 0;

  const roleBadge = ROLE_BADGE[profile.primaryRole || "STUDENT"] ?? ROLE_BADGE["STUDENT"];

  const stats = [
    { icon: <Flame size={14} className="text-amber-400" />,   label: "Reputation",    value: formatCount(profile.reputationScore),            glow: "shadow-amber-500/20" },
    { icon: <Code2 size={14} className="text-indigo-400" />,  label: "Eng. Score",    value: Math.round(profile.engineeringScore || 0),        glow: "shadow-indigo-500/20" },
    { icon: <Trophy size={14} className="text-emerald-400" />,label: "Followers",      value: formatCount(profile.followersCount),              glow: "shadow-emerald-500/20" },
    { icon: <Zap size={14} className="text-sky-400" />,       label: "Connections",   value: formatCount(profile.connectionCount),             glow: "shadow-sky-500/20" },
    { icon: <FileText size={14} className="text-rose-400" />, label: "Posts",         value: formatCount(profile.postCount),                  glow: "shadow-rose-500/20" },
  ];

  return (
    <div
      className="overflow-hidden rounded-t-xl border shadow-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* ── Engineering-themed Banner ─────────────────────────────── */}
      <div
        className="relative h-44 overflow-hidden"
        style={
          profile.profile?.bannerUrl
            ? { backgroundImage: `url(${profile.profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : {
                background: "linear-gradient(135deg, #0f0f1a 0%, #1a1040 40%, #0d1b3e 70%, #0f0f1a 100%)",
              }
        }
      >
        {/* Decorative code symbols — only on default banner */}
        {!profile.profile?.bannerUrl && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden>
            {[
              { text: "< />",  top: "12%",  left: "6%",   size: "text-5xl", opacity: "0.07" },
              { text: "{ }",   top: "55%",  left: "20%",  size: "text-3xl", opacity: "0.05" },
              { text: "=>",    top: "20%",  left: "50%",  size: "text-4xl", opacity: "0.06" },
              { text: "&&",    top: "65%",  left: "60%",  size: "text-2xl", opacity: "0.05" },
              { text: "//",    top: "30%",  right: "8%",  size: "text-4xl", opacity: "0.07" },
              { text: "===",   bottom: "15%", right: "22%", size: "text-3xl", opacity: "0.05" },
              { text: "[ ]",   top: "8%",   right: "35%", size: "text-2xl", opacity: "0.06" },
            ].map((sym, i) => (
              <span
                key={i}
                className={`absolute font-mono font-black ${sym.size}`}
                style={{
                  top: sym.top, left: (sym as any).left, right: (sym as any).right,
                  bottom: (sym as any).bottom,
                  color: "#ffffff",
                  opacity: sym.opacity,
                  letterSpacing: "-0.02em",
                }}
              >
                {sym.text}
              </span>
            ))}
            {/* Radial glow accents */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-40 w-40 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)" }} />
            <div className="absolute top-1/3 right-1/4 h-32 w-32 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* ── Avatar + Identity ─────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="-mt-12 flex items-end gap-4">
            {/* Avatar with glowing ring */}
            <div className="relative shrink-0">
              <div
                className="rounded-2xl p-0.5 shadow-xl"
                style={{
                  background: "linear-gradient(135deg, var(--brand), #6366f1, #818cf8)",
                  boxShadow: "0 0 0 3px var(--bg-surface), 0 0 20px rgba(99,102,241,0.3)",
                }}
              >
                <div className="rounded-[13px] overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                  <Avatar user={profile} size="lg" />
                </div>
              </div>
              {profile.verifiedEngineer && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 shadow-lg"
                  style={{ boxShadow: "0 0 0 2px var(--bg-surface)" }}
                >
                  <ShieldCheck size={13} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + handle + role + location */}
            <div className="mb-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {userName(profile)}
                </h1>
                {/* Green available dot */}
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
                {loading && (
                  <Loader2 className="animate-spin shrink-0" size={14} style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              <p className="text-xs font-mono mt-0.5" style={{ color: "var(--brand)" }}>
                @{profile.username}
              </p>
              {userHeadline(profile) && (
                <p className="text-sm mt-1 max-w-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {userHeadline(profile)}
                </p>
              )}
              {profile.profile?.location && (
                <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={11} />
                  {profile.profile.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Role badge + Trust + Availability signals ──────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Colored role badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${roleBadge.className}`}
          >
            <Code2 size={11} />
            {roleBadge.label}
          </span>

          {/* Trust level */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
          >
            <ShieldCheck size={11} className="text-indigo-500" />
            {titleCase(profile.trustLevel || "BEGINNER")}
          </span>

          {/* Color-coded availability signal chips */}
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

        {/* ── External links ──────────────────────────────────────── */}
        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:border-indigo-400"
                style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                <Icon size={13} />
                {label}
                <ExternalLink size={10} className="opacity-40" />
              </a>
            ))}
          </div>
        )}

        {/* ── Glowing Metric Cards ────────────────────────────────── */}
        <div
          className="mt-5 border-t pt-5 grid grid-cols-2 sm:grid-cols-5 gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 px-2 text-center transition-all duration-200 shadow-sm ${stat.glow}`}
              style={{
                background: "var(--bg-surface-2)",
                borderColor: "var(--border)",
              }}
            >
              {stat.icon}
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {stat.value}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
