import React, { ReactNode } from "react";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  MapPin,
  Building2,
  GraduationCap,
  Github,
  Linkedin,
  User,
  Zap,
  Rocket,
  Code2,
  MessageSquare,
  ChevronRight,
  Settings,
  Globe,
  FileText,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { User as UserType } from "../../lib/api";
import { formatCount, titleCase, userName } from "../../core/utils/format";

export interface ProfileOverviewProps {
  profile: UserType;
  completedTasks: number;
  tasks: Array<{ label: string; complete: boolean }>;
}

export function ProfileOverview({
  profile,
  completedTasks,
  tasks,
}: ProfileOverviewProps) {
  const incompletePct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const showCompletion = incompletePct < 80 && tasks.length > 0;

  const skills = (profile.skills || []).slice(0, 12);
  const pinnedProject = (profile.ownedProjects || [])[0];
  const availability = [
    profile.openToWork              && "Open to Work",
    profile.openToInternship        && "Internships",
    profile.acceptingCollaborators  && "Collaborators",
    profile.acceptingReferrals      && "Referrals",
    profile.acceptingMentorship     && "Mentorship",
  ].filter(Boolean) as string[];

  const statsGrid = [
    { icon: <Code2 size={15} className="text-indigo-400" />,   label: "Skills",      value: profile._count?.skills ?? 0 },
    { icon: <Rocket size={15} className="text-violet-400" />,  label: "Projects",    value: profile._count?.roles ?? (profile.ownedProjects || []).length },
    { icon: <Building2 size={15} className="text-sky-400" />,  label: "Experiences", value: profile._count?.experiences ?? 0 },
    { icon: <Trophy size={15} className="text-amber-400" />,   label: "Reputation",  value: formatCount(profile.reputationScore) },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      {/* ── LEFT: Main overview content ─────────────────────────── */}
      <div className="space-y-5">

        {/* Profile completion banner — only < 80% */}
        {showCompletion && (
          <div
            className="flex items-center gap-4 rounded-xl border px-4 py-3"
            style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}
          >
            <Sparkles size={18} className="text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Complete your Forge profile — {incompletePct}% done
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-2)" }}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${incompletePct}%` }}
                />
              </div>
            </div>
            <Link
              to="#"
              onClick={() => {}}
              className="shrink-0 text-xs font-bold flex items-center gap-1"
              style={{ color: "var(--brand)" }}
            >
              <Settings size={12} />
              Edit
            </Link>
          </div>
        )}

        {/* Bio / tagline */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: "var(--brand)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Overview</h3>
          </div>
          {profile.profile?.bio ? (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {profile.profile.bio}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No bio added yet — share your story in the Settings tab.
            </p>
          )}

          {/* Availability signals */}
          {availability.length > 0 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
              {availability.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border"
                  style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)", color: "#10b981" }}
                >
                  <Zap size={10} />
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Availability note */}
          {profile.profile?.availabilityText && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {profile.profile.availabilityText}
            </p>
          )}
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statsGrid.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-4 px-2 text-center"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
            >
              {s.icon}
              <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tech Stack strip — top 12 skills */}
        {skills.length > 0 && (
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-indigo-400" />
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Tech Stack</h3>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {(profile._count?.skills ?? skills.length)} skills total
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 hover:scale-105"
                  style={{
                    background: s.verified ? "rgba(99,102,241,0.10)" : "var(--bg-surface-2)",
                    borderColor: s.verified ? "rgba(99,102,241,0.35)" : "var(--border)",
                    color: s.verified ? "var(--brand)" : "var(--text-secondary)",
                  }}
                >
                  {s.skill?.name}
                  {s.verified && <span className="text-[9px]">✓</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pinned Project */}
        {pinnedProject && (
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Rocket size={15} className="text-violet-400" />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Pinned Project</h3>
            </div>
            <div
              className="rounded-xl border p-4 transition-all duration-150 hover:border-indigo-400/50 group"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate group-hover:text-indigo-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                    {pinnedProject.title}
                  </h4>
                  <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {pinnedProject.shortDescription || pinnedProject.description || "No description"}
                  </p>
                </div>
                <Link
                  to={`/projects/${pinnedProject.slug || pinnedProject.id}`}
                  className="shrink-0 p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                >
                  <ChevronRight size={15} />
                </Link>
              </div>
              {Array.isArray(pinnedProject.techStack) && pinnedProject.techStack.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(pinnedProject.techStack as string[]).slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ──────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Profile foundation checklist — always show on own profile */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Profile Foundation</h3>
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              {completedTasks}/{tasks.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full mb-4" style={{ background: "var(--bg-surface-2)" }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <div className="space-y-2">
            {tasks.map((task) => {
              const Icon = task.complete ? CheckCircle2 : Circle;
              return (
                <div
                  key={task.label}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={
                    task.complete
                      ? { background: "rgba(99,102,241,0.08)", color: "var(--brand)", border: "1px solid rgba(99,102,241,0.2)" }
                      : { background: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                  }
                >
                  <Icon size={13} className={task.complete ? "text-indigo-400" : "text-slate-400"} />
                  <span className="font-medium">{task.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile signals */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Profile Signals</h3>
          <div className="space-y-3">
            {[
              { icon: MapPin,       value: profile.profile?.location || "No location set" },
              { icon: Building2,    value: profile.profile?.college?.name || "No college selected" },
              { icon: GraduationCap,value: profile.profile?.department?.name || "No department" },
            ].map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                <Icon size={13} className="mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                <span className="break-words">{value}</span>
              </div>
            ))}
            {profile.profile?.githubUrl && (
              <div className="flex items-center gap-2.5 text-sm">
                <Github size={13} style={{ color: "var(--text-muted)" }} />
                <a href={profile.profile.githubUrl} target="_blank" rel="noreferrer"
                  className="text-indigo-400 hover:underline truncate">{profile.profile.githubUrl.replace("https://github.com/", "@")}</a>
              </div>
            )}
            {profile.profile?.linkedinUrl && (
              <div className="flex items-center gap-2.5 text-sm">
                <Linkedin size={13} style={{ color: "var(--text-muted)" }} />
                <a href={profile.profile.linkedinUrl} target="_blank" rel="noreferrer"
                  className="text-sky-400 hover:underline truncate">LinkedIn Profile</a>
              </div>
            )}
            {profile.profile?.portfolioUrl && (
              <div className="flex items-center gap-2.5 text-sm">
                <Globe size={13} style={{ color: "var(--text-muted)" }} />
                <a href={profile.profile.portfolioUrl} target="_blank" rel="noreferrer"
                  className="text-emerald-400 hover:underline truncate">Portfolio</a>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity mini preview */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-sky-400" />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Activity</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Skills",      value: profile._count?.skills ?? 0 },
              { label: "Experiences", value: profile._count?.experiences ?? 0 },
              { label: "Educations",  value: profile._count?.educations ?? 0 },
              { label: "Eng. Score",  value: Math.round(profile.engineeringScore || 0) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "var(--bg-surface-2)" }}
              >
                <div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
