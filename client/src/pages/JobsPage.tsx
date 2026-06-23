import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  BriefcaseBusiness,
  Search,
  Filter,
  Plus,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Eye,
  Settings,
  MapPin,
  Clock,
  IndianRupee,
  X,
  Star,
  Building2,
  Zap,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Job, User } from "../lib/api";
import {
  useJobsQuery,
  useRecommendedJobsQuery,
  useSavedJobsQuery,
  useMyJobApplicationsQuery,
  useMyExternalApplicationsQuery,
  useRecruiterJobsQuery,
  useSaveJobMutation,
  useMyFullProfileQuery,
  useCompanyEmployeesQuery,
} from "../hooks/usePlatformQueries";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState, Avatar } from "../components/ui";
import { JobDetailModal } from "../components/cards/JobDetailModal";
import { JobPostModal } from "../components/forms/JobPostModal";
import { ExternalApplyModal } from "../components/forms/ExternalApplyModal";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { ApplicationKanbanBoard } from "../components/jobs/ApplicationKanbanBoard";
import { PlacementDrivesTab } from "../components/jobs/PlacementDrivesTab";
import { formatCount, formatDate, titleCase, cleanLogoUrl, userName, userHeadline } from "../lib/format";

type TabType = "explore" | "recommended" | "applications" | "saved" | "recruiter" | "campus-drives";
type SubViewType = { type: "dashboard" } | { type: "pipeline"; jobId: string };

// ---------------------------------------------------------------------------
// Salary formatter (Indian-style ₹ LPA)
// ---------------------------------------------------------------------------
function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} LPA`
      : `₹${formatCount(n)}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

// ---------------------------------------------------------------------------
// Role keywords mappings
// ---------------------------------------------------------------------------
const ROLE_MAPPINGS: Record<string, string[]> = {
  "Frontend Developer": ["frontend", "front-end", "ui", "react", "angular", "vue", "javascript"],
  "Backend Developer": ["backend", "back-end", "node", "django", "spring", "golang", "python developer", "java developer", "c#", "net developer", "ruby"],
  "Fullstack Developer": ["fullstack", "full-stack", "full stack"],
  "Mobile Engineer": ["mobile", "ios", "android", "flutter", "react native", "swift"],
  "DevOps & SRE": ["devops", "sre", "cloud", "infrastructure", "aws", "kubernetes", "platform engineer", "docker", "ci/cd"],
  "Data & AI / ML": ["data", "machine learning", "ml", "ai", "artificial intelligence", "data scientist", "data engineer", "deep learning", "nlp"],
  "Product Management": ["product manager", "pm", "product management", "product owner"],
  "QA & Testing": ["qa", "quality assurance", "test", "testing", "automation engineer", "sdet", "selenium"],
  "Software Engineering / General": ["software engineer", "software developer", "engineer", "developer", "programmer", "architect"]
};

// ---------------------------------------------------------------------------
// Active filter chips — dark mode aware
// ---------------------------------------------------------------------------
function ActiveFilters({
  workModes,
  jobTypes,
  salaryRange,
  roles,
  skills,
  locations,
  onRemoveWorkMode,
  onRemoveJobType,
  onClearSalary,
  onRemoveRole,
  onRemoveSkill,
  onRemoveLocation,
  onClearAll,
}: {
  workModes: string[];
  jobTypes: string[];
  salaryRange: [number, number];
  roles: string[];
  skills: string[];
  locations: string[];
  onRemoveWorkMode: (m: string) => void;
  onRemoveJobType: (t: string) => void;
  onClearSalary: () => void;
  onRemoveRole: (r: string) => void;
  onRemoveSkill: (s: string) => void;
  onRemoveLocation: (l: string) => void;
  onClearAll: () => void;
}) {
  const isSalaryActive = salaryRange[0] > 0 || salaryRange[1] < 50;
  const hasAny = workModes.length > 0 || jobTypes.length > 0 || isSalaryActive || roles.length > 0 || skills.length > 0 || locations.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Applied:</span>
      {workModes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onRemoveWorkMode(m)}
          className="flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
        >
          {titleCase(m)} <X size={10} />
        </button>
      ))}
      {jobTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onRemoveJobType(t)}
          className="flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
        >
          {titleCase(t)} <X size={10} />
        </button>
      ))}
      {isSalaryActive && (
        <button
          type="button"
          onClick={onClearSalary}
          className="flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
        >
          {salaryRange[0]} – {salaryRange[1] >= 50 ? "50+ LPA" : `${salaryRange[1]} LPA`} <X size={10} />
        </button>
      )}
      {roles.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRemoveRole(r)}
          className="flex items-center gap-1 rounded-full border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition"
        >
          {r} <X size={10} />
        </button>
      ))}
      {skills.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onRemoveSkill(s)}
          className="flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
        >
          {s} <X size={10} />
        </button>
      ))}
      {locations.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onRemoveLocation(l)}
          className="flex items-center gap-1 rounded-full border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
        >
          {l} <X size={10} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold ml-1 hover:text-rose-500 transition"
        style={{ color: "var(--text-muted)" }}
      >
        Clear all
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Row Card — dark mode aware
// ---------------------------------------------------------------------------
function JobRowCard({
  job,
  isSelected,
  hasApplied,
  isSaved,
  onSelect,
  onSaveToggle,
  isRecruiter,
  userSkillNames,
}: {
  job: Job;
  isSelected: boolean;
  hasApplied: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onSaveToggle: (e: React.MouseEvent) => void;
  isRecruiter: boolean;
  userSkillNames?: Set<string>;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const WORK_MODE_COLOR: Record<string, string> = {
    REMOTE: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700",
    HYBRID: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    ONSITE: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  };

  const jobSkills      = (job.skillsRequired || []) as string[];
  const matchingSkills = jobSkills.filter((s) => userSkillNames?.has(s.toLowerCase().trim()));
  const matchPercentage= jobSkills.length
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 100;
  const showMatchScore = userSkillNames && userSkillNames.size > 0 && jobSkills.length > 0;

  const isNew = job.createdAt && (new Date().getTime() - new Date(job.createdAt).getTime()) < 48 * 60 * 60 * 1000;
  const isHot = job.applicationsCount != null && job.applicationsCount >= 5;

  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:shadow-lg relative overflow-hidden ${
        isSelected
          ? "border-blue-500 dark:border-blue-400 shadow-sm"
          : "hover:border-blue-400 dark:hover:border-blue-500"
      }`}
      style={
        isSelected
          ? { background: "linear-gradient(to right, rgba(59,130,246,0.06), rgba(99,102,241,0.04))" }
          : { background: "var(--bg-surface)", borderColor: "var(--border)" }
      }
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-r" />
      )}

      <div className="flex items-start gap-3.5">
        <div className="shrink-0 relative group-hover:scale-105 transition-transform duration-200">
          {cleanLogoUrl(job.company?.logoUrl) ? (
            <img
              src={cleanLogoUrl(job.company?.logoUrl)!}
              alt={job.company?.name}
              className="h-11 w-11 rounded-xl object-cover shadow-sm"
              style={{ border: "1px solid var(--border)" }}
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              <Building2 size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className="text-sm font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {job.title}
              </h3>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {job.company?.name || "Company"}
              </p>
            </div>

            {!isRecruiter && (
              <button
                type="button"
                onClick={onSaveToggle}
                className="shrink-0 rounded-full p-1.5 transition-all hover:text-blue-600 dark:hover:text-blue-400"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title={isSaved ? "Remove saved" : "Save job"}
              >
                {isSaved ? (
                  <BookmarkCheck size={16} className="text-blue-600 dark:text-blue-400 scale-110 transition-transform" />
                ) : (
                  <Bookmark size={16} className="hover:scale-110 transition-transform" />
                )}
              </button>
            )}
          </div>

          {/* Status badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              Active Hiring
            </span>
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                <span className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />
                New
              </span>
            )}
            {isHot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                Hot Job
              </span>
            )}
            {showMatchScore && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                matchPercentage >= 75
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                  : matchPercentage >= 40
                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                  : "border-[color:var(--border)]"
              }`} style={matchPercentage < 40 ? { background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}>
                {matchPercentage}% Skill Match
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {job.location}
              </span>
            )}
            {job.experienceLevel && (
              <span className="flex items-center gap-1">
                <Briefcase size={11} />
                {titleCase(job.experienceLevel)}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--text-primary)" }}>
                <IndianRupee size={11} />
                {salary}
              </span>
            )}
            {job.createdAt && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatDate(job.createdAt)}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {job.workMode && (
              <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${WORK_MODE_COLOR[job.workMode] ?? "border-[color:var(--border)]"}`}
                style={!WORK_MODE_COLOR[job.workMode] ? { background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}>
                {titleCase(job.workMode)}
              </span>
            )}
            {job.type && (
              <span className="rounded-lg border px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {titleCase(job.type)}
              </span>
            )}
            {hasApplied && (
              <span className="flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle size={10} /> Applied
              </span>
            )}
            {job.applicationsCount != null && (
              <span className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>
                {formatCount(job.applicationsCount)} {job.applicationsCount === 1 ? "applicant" : "applicants"}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Job Detail Drawer — dark mode aware
// ---------------------------------------------------------------------------
function JobDetailDrawer({
  job,
  hasApplied,
  onClose,
  onApply,
  onExternalApply,
  userSkillNames,
  onRequestReferral,
}: {
  job: Job;
  hasApplied: boolean;
  onClose: () => void;
  onApply: () => void;
  onExternalApply?: () => void;
  userSkillNames?: Set<string>;
  onRequestReferral: (user: User) => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const employeesQuery  = useCompanyEmployeesQuery(job.companyId || job.company?.id);
  const employees       = employeesQuery.data?.employees || [];
  const referralFriendlyEmployees = employees.filter((emp) => emp.user?.acceptingReferrals);

  const jobSkills      = (job.skillsRequired || []) as string[];
  const matchingSkills = jobSkills.filter((s) => userSkillNames?.has(s.toLowerCase().trim()));
  const missingSkills  = jobSkills.filter((s) => !userSkillNames?.has(s.toLowerCase().trim()));

  return (
    <div
      className="flex flex-col panel overflow-hidden h-[calc(100vh-120px)]"
    >
      {/* Header */}
      <div className="border-b flex-shrink-0 px-5 py-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {cleanLogoUrl(job.company?.logoUrl) ? (
              <img
                src={cleanLogoUrl(job.company?.logoUrl)!}
                alt={job.company?.name}
                className="h-12 w-12 rounded-xl object-cover shadow-sm"
                style={{ border: "1px solid var(--border)" }}
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                <Building2 size={22} />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                {job.title}
              </h2>
              {job.company?.slug ? (
                <Link
                  to={`/companies/${job.company.slug}`}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5 hover:underline block"
                >
                  {job.company.name}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {job.company?.name || "Company"}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick facts */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {job.location    && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
          {salary          && <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--text-primary)" }}><IndianRupee size={11} />{salary}</span>}
          {job.workMode    && <span className="flex items-center gap-1"><Briefcase size={11} />{titleCase(job.workMode)}</span>}
          {job.type        && <span className="flex items-center gap-1"><Clock size={11} />{titleCase(job.type)}</span>}
          {job.experienceLevel && <span className="flex items-center gap-1"><Star size={11} />{titleCase(job.experienceLevel)}</span>}
        </div>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          {hasApplied ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
              <CheckCircle size={15} /> Already Applied
            </div>
          ) : job.applyUrl ? (
            <button
              type="button"
              onClick={() => onExternalApply ? onExternalApply() : window.open(job.applyUrl!, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 shadow-sm"
            >
              <Zap size={14} /> Apply on Company Website <ExternalLink size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onApply}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Zap size={14} /> Apply Now
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Referrals Hub */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Referrals Hub
              </h4>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Ask an employee for a referral to stand out
              </p>
            </div>
            {employeesQuery.isFetching && <Loader2 className="animate-spin" size={14} style={{ color: "var(--text-muted)" }} />}
          </div>

          {employeesQuery.isLoading ? (
            <div className="flex items-center justify-center py-6 text-xs gap-2" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="animate-spin" size={14} /> Loading company network...
            </div>
          ) : referralFriendlyEmployees.length > 0 ? (
            <div className="space-y-3">
              {referralFriendlyEmployees.slice(0, 4).map((emp) => (
                <div key={emp.id} className="panel flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar user={emp.user} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                        {userName(emp.user)}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                        {emp.title || userHeadline(emp.user)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => emp.user && onRequestReferral(emp.user)}
                    className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 border border-blue-200 dark:border-blue-700 hover:border-blue-600 px-2.5 py-1 rounded transition-all duration-200"
                    style={{ background: "var(--brand-light)" }}
                  >
                    Ask for Referral
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
              No employees offering referrals yet. Check back later!
            </p>
          )}
        </div>

        {/* Skill checklist matching */}
        {jobSkills.length > 0 && (
          <div className="panel p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Skill Checklist Match
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Matches ({matchingSkills.length})
                </h5>
                {matchingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {matchingSkills.map((s, i) => (
                      <span key={i} className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No matching skills yet.</p>
                )}
              </div>
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  ⚠ Missing ({missingSkills.length})
                </h5>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {missingSkills.map((s, i) => (
                      <span key={i} className="rounded-md px-2 py-0.5 text-[10px] font-medium chip">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No missing skills!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job description */}
        {job.description && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Job Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{job.description}</p>
          </div>
        )}
        {job.responsibilities && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Responsibilities</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{job.responsibilities}</p>
          </div>
        )}
        {job.requirements && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Requirements</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{job.requirements}</p>
          </div>
        )}
        {job.perks && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Perks & Benefits</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{job.perks}</p>
          </div>
        )}
        {job.createdAt && (
          <p className="text-xs border-t pt-3" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
            Posted {formatDate(job.createdAt)} · {formatCount(job.applicationsCount ?? 0)} applicants
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main JobsPage
// ---------------------------------------------------------------------------

export function JobsPage() {
  const { user } = useAuth();
  const [activeTab,      setActiveTab]      = useState<TabType>("explore");
  const [recruiterView,  setRecruiterView]  = useState<SubViewType>({ type: "dashboard" });
  const [selectedJob,    setSelectedJob]    = useState<Job | null>(null);
  const [applyModalJob,  setApplyModalJob]  = useState<Job | null>(null);
  const [showPostModal,  setShowPostModal]  = useState(false);
  const [referralUser,   setReferralUser]   = useState<User | null>(null);
  const [externalApplyJob, setExternalApplyJob] = useState<Job | null>(null);

  // Pagination
  const [jobPage, setJobPage] = useState(1);
  const jobsPerPage = 20;

  // Filters
  const [searchVal,          setSearchVal]          = useState("");
  const [selectedWorkModes,  setSelectedWorkModes]  = useState<string[]>([]);
  const [selectedJobTypes,   setSelectedJobTypes]   = useState<string[]>([]);
  const [salaryRange,        setSalaryRange]        = useState<[number, number]>([0, 50]);
  const [selectedRoles,      setSelectedRoles]      = useState<string[]>([]);
  const [selectedSkills,     setSelectedSkills]     = useState<string[]>([]);
  const [selectedLocations,  setSelectedLocations]  = useState<string[]>([]);
  const [searchSkillQ,       setSearchSkillQ]       = useState("");
  const [searchLocationQ,    setSearchLocationQ]    = useState("");
  const [stipendRange,       setStipendRange]       = useState<[number, number]>([0, 50]);
  const [internDuration,     setInternDuration]     = useState<string | null>(null);
  const [ppoOnly,            setPpoOnly]            = useState(false);

  useEffect(() => { setJobPage(1); }, [activeTab]);

  // Queries
  const jobsQuery        = useJobsQuery(activeTab === "explore" ? { page: jobPage, limit: jobsPerPage } : undefined);
  const recommendedQuery = useRecommendedJobsQuery();
  const savedQuery       = useSavedJobsQuery();
  const applicationsQuery= useMyJobApplicationsQuery();
  const externalAppsQuery= useMyExternalApplicationsQuery();
  const recruiterJobsQuery=useRecruiterJobsQuery();
  const saveMutation     = useSaveJobMutation();
  const profileQuery     = useMyFullProfileQuery();

  const collegeId   = profileQuery.data?.profile?.collegeId;
  const isRecruiter = user?.primaryRole === "RECRUITER";

  const userSkillNames = useMemo(() => {
    return new Set(
      (profileQuery.data?.skills || [])
        .map((s) => s.skill?.name?.toLowerCase().trim())
        .filter((name): name is string => Boolean(name))
    );
  }, [profileQuery.data?.skills]);

  const appliedJobIds = useMemo(
    () => new Set((applicationsQuery.data || []).map((app) => app.jobId)),
    [applicationsQuery.data]
  );
  const savedJobIds = useMemo(
    () => new Set((savedQuery.data || []).map((job) => job.id)),
    [savedQuery.data]
  );

  const handleSaveToggle = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try { await saveMutation.mutateAsync(jobId); } catch { /* toasted */ }
  };

  const toggleWorkMode  = (m: string) => setSelectedWorkModes((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
  const toggleJobType   = (t: string) => setSelectedJobTypes((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  const toggleRole      = (r: string) => setSelectedRoles((cur) => cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);
  const toggleSkill     = (s: string) => setSelectedSkills((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const toggleLocation  = (l: string) => setSelectedLocations((cur) => cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);

  const clearFilters = () => {
    setSearchVal(""); setSelectedWorkModes([]); setSelectedJobTypes([]);
    setSalaryRange([0, 50]); setSelectedRoles([]); setSelectedSkills([]);
    setSelectedLocations([]); setSearchSkillQ(""); setSearchLocationQ("");
    setJobPage(1); setStipendRange([0, 50]); setInternDuration(null); setPpoOnly(false);
  };

  const getSource = () => {
    switch (activeTab) {
      case "explore":      return { list: jobsQuery.data?.jobs || [],                                            loading: jobsQuery.isLoading,        error: jobsQuery.isError,        refetch: jobsQuery.refetch };
      case "recommended":  return { list: recommendedQuery.data || [],                                           loading: recommendedQuery.isLoading,  error: recommendedQuery.isError,  refetch: recommendedQuery.refetch };
      case "saved":        return { list: savedQuery.data || [],                                                  loading: savedQuery.isLoading,        error: savedQuery.isError,        refetch: savedQuery.refetch };
      case "applications": return { list: (applicationsQuery.data || []).map((a) => a.job).filter(Boolean) as Job[], loading: applicationsQuery.isLoading, error: applicationsQuery.isError, refetch: applicationsQuery.refetch };
      default:             return { list: [], loading: false, error: false, refetch: () => {} };
    }
  };

  const source = getSource();

  const uniqueSkills = useMemo(() => {
    const skills = new Set<string>();
    source.list.forEach((job) => { (job.skillsRequired || []).forEach((skill) => { const c = skill.trim(); if (c) skills.add(c); }); });
    return Array.from(skills).sort();
  }, [source.list]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    source.list.forEach((job) => { const c = job.location?.trim(); if (c) locations.add(c); });
    return Array.from(locations).sort();
  }, [source.list]);

  const filteredJobs = useMemo(() =>
    source.list.filter((job) => {
      const q      = searchVal.trim().toLowerCase();
      const matchQ = !q || [job.title, job.description, job.company?.name].join(" ").toLowerCase().includes(q);
      const matchW = !selectedWorkModes.length || selectedWorkModes.includes(job.workMode || "");
      const matchT = !selectedJobTypes.length  || selectedJobTypes.includes(job.type || "");
      const minSalaryLpa = salaryRange[0] * 100000;
      const maxSalaryLpa = salaryRange[1] * 100000;
      const hasNoSalaryDetails = job.salaryMin == null && job.salaryMax == null;
      const matchS =
        hasNoSalaryDetails || (
          (!minSalaryLpa || (job.salaryMax != null && job.salaryMax >= minSalaryLpa)) &&
          (salaryRange[1] >= 50 || (job.salaryMin != null && job.salaryMin <= maxSalaryLpa))
        );
      const matchR = !selectedRoles.length || selectedRoles.some((roleName) => {
        const keywords = ROLE_MAPPINGS[roleName] || [];
        const titleLower = (job.title || "").toLowerCase();
        return keywords.some((kw) => titleLower.includes(kw));
      });
      const matchSkills = !selectedSkills.length || (job.skillsRequired || []).some((jobSkill) =>
        selectedSkills.some((selected) => selected.toLowerCase().trim() === jobSkill.toLowerCase().trim())
      );
      const matchLoc = !selectedLocations.length || (job.location && selectedLocations.includes(job.location.trim()));
      const isInternshipTab = selectedJobTypes.includes("INTERNSHIP") || (selectedJobTypes.length === 0 && false);
      const matchStipend = !isInternshipTab || (() => {
        if (stipendRange[0] === 0 && stipendRange[1] >= 50) return true;
        const minStipend = stipendRange[0] * 1000;
        const maxStipend = stipendRange[1] * 1000;
        if (job.salaryMin == null && job.salaryMax == null) return true;
        return (!minStipend || (job.salaryMax != null && job.salaryMax >= minStipend)) &&
          (stipendRange[1] >= 50 || (job.salaryMin != null && job.salaryMin <= maxStipend));
      })();
      const matchPpo = !ppoOnly || (job as any).ppoOffered === true;
      return matchQ && matchW && matchT && matchS && matchR && matchSkills && matchLoc && matchStipend && matchPpo;
    }),
    [source.list, searchVal, selectedWorkModes, selectedJobTypes, salaryRange, selectedRoles, selectedSkills, selectedLocations, stipendRange, ppoOnly]
  );

  useEffect(() => {
    if (filteredJobs.length > 0) {
      const isStillInList = filteredJobs.some((j) => j.id === selectedJob?.id);
      if (!isStillInList) setSelectedJob(filteredJobs[0]);
    } else {
      setSelectedJob(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobs]);

  if (activeTab === "recruiter" && recruiterView.type === "pipeline") {
    return (
      <KanbanPipeline
        jobId={recruiterView.jobId}
        onBack={() => setRecruiterView({ type: "dashboard" })}
      />
    );
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "explore", label: "Explore Jobs" },
    ...(user ? [
      { key: "recommended" as TabType, label: "Recommended" },
      { key: "applications" as TabType, label: "My Applications" },
      { key: "saved" as TabType, label: "Saved" },
      { key: "campus-drives" as TabType, label: "Campus Drives" },
    ] : []),
    ...(isRecruiter ? [{ key: "recruiter" as TabType, label: "Recruiter" }] : []),
  ];

  return (
    <div className="space-y-0">

      {/* ── Tab nav bar ── */}
      <div className="mb-4 panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                activeTab === key
                  ? "bg-blue-600 text-white"
                  : "hover:bg-[color:var(--bg-surface-2)]"
              }`}
              style={activeTab !== key ? { color: "var(--text-secondary)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "recruiter" && (
          <button type="button" className="btn-primary" onClick={() => setShowPostModal(true)}>
            <Plus size={15} /> Post a Job
          </button>
        )}
      </div>

      {/* ── Campus Drives tab ── */}
      {activeTab === "campus-drives" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Campus Placement Drives</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Exclusive placement drives targeted at your college
              </p>
            </div>
          </div>
          <PlacementDrivesTab collegeId={collegeId} />
        </div>
      )}

      {/* ── Recruiter dashboard ── */}
      {activeTab === "recruiter" ? (
        recruiterJobsQuery.isLoading ? (
          <div className="flex justify-center py-12"><InlineLoader label="Loading your jobs…" /></div>
        ) : recruiterJobsQuery.isError ? (
          <ErrorState title="Couldn't load your posted jobs" text="Please try again." onRetry={() => recruiterJobsQuery.refetch()} />
        ) : (recruiterJobsQuery.data || []).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(recruiterJobsQuery.data || []).map((job) => (
              <article key={job.id} className="panel p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
                  >
                    <BriefcaseBusiness size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{job.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {[job.location, titleCase(job.workMode), titleCase(job.type)].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{job.applicationsCount || 0} applicants</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <button type="button" className="btn-secondary py-1 px-3 text-xs"
                    onClick={() => setRecruiterView({ type: "pipeline", jobId: job.id })}>
                    <Settings size={12} /> Pipeline
                  </button>
                  <button type="button" className="btn-primary py-1 px-3 text-xs"
                    onClick={() => setApplyModalJob(job)}>
                    <Eye size={12} /> Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={BriefcaseBusiness} title="No jobs posted yet" text="Click 'Post a Job' to start finding talent." />
        )
      ) : activeTab === "applications" ? (
        /* ── My Applications Kanban Board ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>My Application Tracker</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Platform applications (recruiter-tracked) + external applications (self-tracked)
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                Platform
              </span>
              <span className="flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                External
              </span>
            </div>
          </div>
          {applicationsQuery.isLoading || externalAppsQuery.isLoading ? (
            <div className="flex justify-center py-16"><InlineLoader label="Loading applications…" /></div>
          ) : (
            <ApplicationKanbanBoard
              platformApps={(applicationsQuery.data || []).map((a) => ({
                id: a.id,
                jobId: a.jobId,
                status: a.status ?? "APPLIED",
                createdAt: a.createdAt || new Date().toISOString(),
                job: a.job,
              }))}
              externalApps={externalAppsQuery.data || []}
            />
          )}
        </div>
      ) : (
        /* ── 3-column candidate split layout ── */
        <div className="grid gap-4 lg:grid-cols-[18rem_1.25fr_1.5fr]">

          {/* ── Filters sidebar ── */}
          <aside className="panel h-[calc(100vh-120px)] p-5 space-y-5 lg:sticky lg:top-[90px] overflow-y-auto pr-2 no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                <Filter size={14} style={{ color: "var(--text-muted)" }} /> Filters
              </span>
              <button type="button" onClick={clearFilters} className="text-xs font-semibold hover:text-rose-500 transition" style={{ color: "var(--text-muted)" }}>
                Clear all
              </button>
            </div>

            {/* Work mode */}
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Work Mode</p>
              <div className="space-y-2">
                {["REMOTE", "HYBRID", "ON_SITE"].map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      className="rounded accent-blue-600 focus:ring-0"
                      style={{ borderColor: "var(--border-strong)" }}
                      checked={selectedWorkModes.includes(m)}
                      onChange={() => toggleWorkMode(m)}
                    />
                    {titleCase(m)}
                  </label>
                ))}
              </div>
            </div>

            {/* Job type */}
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Job Type</p>
              <div className="space-y-2">
                {["FULL_TIME", "PART_TIME", "INTERNSHIP", "ENTRY_LEVEL", "CONTRACT"].map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      className="rounded accent-blue-600 focus:ring-0"
                      checked={selectedJobTypes.includes(t)}
                      onChange={() => toggleJobType(t)}
                    />
                    {titleCase(t)}
                  </label>
                ))}
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Salary Range (LPA)</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                  <span>{salaryRange[0]} LPA</span>
                  <span>{salaryRange[1] >= 50 ? "50+ LPA" : `${salaryRange[1]} LPA`}</span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Min Salary</label>
                    <input
                      type="range" min="0" max="50" step="2"
                      value={salaryRange[0]}
                      onChange={(e) => setSalaryRange([Math.min(Number(e.target.value), salaryRange[1] - 2), salaryRange[1]])}
                      className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      style={{ background: "var(--bg-surface-3)" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Max Salary</label>
                    <input
                      type="range" min="0" max="50" step="2"
                      value={salaryRange[1]}
                      onChange={(e) => setSalaryRange([salaryRange[0], Math.max(Number(e.target.value), salaryRange[0] + 2)])}
                      className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      style={{ background: "var(--bg-surface-3)" }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {[
                    { label: "Any", range: [0, 50] },
                    { label: "10-25 LPA", range: [10, 25] },
                    { label: "25-40 LPA", range: [25, 40] },
                    { label: "40+ LPA", range: [40, 50] },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSalaryRange(preset.range as [number, number])}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold border transition-all duration-200 ${
                        salaryRange[0] === preset.range[0] && salaryRange[1] === preset.range[1]
                          ? "bg-blue-600 text-white border-blue-600"
                          : ""
                      }`}
                      style={salaryRange[0] !== preset.range[0] || salaryRange[1] !== preset.range[1]
                        ? { background: "var(--bg-surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }
                        : {}}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Internship-specific filters */}
            {selectedJobTypes.includes("INTERNSHIP") && (
              <div className="border-t border-indigo-200 dark:border-indigo-800 pt-4 space-y-4 bg-indigo-50/40 dark:bg-indigo-900/20 rounded-xl px-3 py-3 -mx-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                  🎓 Internship Filters
                </p>

                <div>
                  <p className="mb-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Stipend (₹K/month)</p>
                  <div className="flex items-center justify-between text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    <span>₹{stipendRange[0]}K</span>
                    <span>{stipendRange[1] >= 50 ? "₹50K+" : `₹${stipendRange[1]}K`}</span>
                  </div>
                  <input
                    type="range" min="0" max="50" step="2"
                    value={stipendRange[1]}
                    onChange={(e) => setStipendRange([stipendRange[0], Math.max(Number(e.target.value), stipendRange[0] + 2)])}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-indigo-100 dark:bg-indigo-900"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[{ label: "Any", range: [0, 50] as [number, number] }, { label: "5K+", range: [5, 50] as [number, number] }, { label: "10K+", range: [10, 50] as [number, number] }, { label: "20K+", range: [20, 50] as [number, number] }].map((p) => (
                      <button key={p.label} type="button"
                        onClick={() => setStipendRange(p.range)}
                        className={`rounded px-2 py-0.5 text-[9px] font-bold border transition ${stipendRange[0] === p.range[0] && stipendRange[1] === p.range[1] ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
                        style={stipendRange[0] !== p.range[0] || stipendRange[1] !== p.range[1] ? { background: "var(--bg-surface)", color: "var(--text-muted)", borderColor: "var(--border)" } : {}}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Duration</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Any", "1m", "2m", "3m", "6m"].map((d) => (
                      <button key={d} type="button"
                        onClick={() => setInternDuration(d === "Any" ? null : d)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${(d === "Any" ? !internDuration : internDuration === d) ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
                        style={(d === "Any" ? !internDuration : internDuration === d) ? {} : { background: "var(--bg-surface)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
                  <input type="checkbox" className="rounded border-indigo-300 accent-indigo-600" checked={ppoOnly} onChange={(e) => setPpoOnly(e.target.checked)} />
                  PPO Available (Pre-Placement Offer)
                </label>
              </div>
            )}

            {/* Role Filter */}
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                {Object.keys(ROLE_MAPPINGS).map((roleName) => (
                  <label key={roleName} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      className="rounded accent-blue-600 focus:ring-0"
                      checked={selectedRoles.includes(roleName)}
                      onChange={() => toggleRole(roleName)}
                    />
                    {roleName}
                  </label>
                ))}
              </div>
            </div>

            {/* Skills Filter */}
            <div className="border-t pt-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Skills</p>
              {uniqueSkills.length > 5 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="field w-full py-1 pl-7 text-xs"
                    placeholder="Search skills..."
                    value={searchSkillQ}
                    onChange={(e) => setSearchSkillQ(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                {uniqueSkills
                  .filter((s) => s.toLowerCase().includes(searchSkillQ.toLowerCase()))
                  .map((skill) => (
                    <label key={skill} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        className="rounded accent-blue-600 focus:ring-0"
                        checked={selectedSkills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                      />
                      {skill}
                    </label>
                  ))}
                {uniqueSkills.length === 0 && (
                  <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No skills available</p>
                )}
              </div>
            </div>

            {/* Location Filter */}
            <div className="border-t pt-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Location</p>
              {uniqueLocations.length > 5 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="field w-full py-1 pl-7 text-xs"
                    placeholder="Search locations..."
                    value={searchLocationQ}
                    onChange={(e) => setSearchLocationQ(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                {uniqueLocations
                  .filter((l) => l.toLowerCase().includes(searchLocationQ.toLowerCase()))
                  .map((location) => (
                    <label key={location} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium transition-colors" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        className="rounded accent-blue-600 focus:ring-0"
                        checked={selectedLocations.includes(location)}
                        onChange={() => toggleLocation(location)}
                      />
                      {location}
                    </label>
                  ))}
                {uniqueLocations.length === 0 && (
                  <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No locations available</p>
                )}
              </div>
            </div>
          </aside>

          {/* ── Job list ── */}
          <div className="space-y-3 min-w-0">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3" size={16} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                className="field w-full py-2.5 pl-10 text-sm"
                placeholder="Search jobs by title, company, skills…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>

            {/* Active filter chips */}
            <ActiveFilters
              workModes={selectedWorkModes}
              jobTypes={selectedJobTypes}
              salaryRange={salaryRange}
              roles={selectedRoles}
              skills={selectedSkills}
              locations={selectedLocations}
              onRemoveWorkMode={(m) => toggleWorkMode(m)}
              onRemoveJobType={(t) => toggleJobType(t)}
              onClearSalary={() => setSalaryRange([0, 50])}
              onRemoveRole={(r) => toggleRole(r)}
              onRemoveSkill={(s) => toggleSkill(s)}
              onRemoveLocation={(l) => toggleLocation(l)}
              onClearAll={clearFilters}
            />

            {/* Results count */}
            {!source.loading && (
              <p className="text-xs font-semibold px-1" style={{ color: "var(--text-muted)" }}>
                {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
              </p>
            )}

            {source.loading ? (
              <div className="flex justify-center py-10"><InlineLoader label="Searching jobs…" /></div>
            ) : source.error ? (
              <ErrorState title="Couldn't load jobs" text="Check your connection and try again." onRetry={source.refetch} />
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-2.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
                {filteredJobs.map((job) => (
                  <JobRowCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    hasApplied={appliedJobIds.has(job.id)}
                    isSaved={savedJobIds.has(job.id)}
                    onSelect={() => setSelectedJob(job)}
                    onSaveToggle={(e) => handleSaveToggle(e, job.id)}
                    isRecruiter={!!isRecruiter}
                    userSkillNames={userSkillNames}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs match your filters"
                text="Try adjusting the filters on the left or changing your search term."
              />
            )}

            {/* Pagination */}
            {activeTab === "explore" && filteredJobs.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4 mt-2 px-1 shrink-0" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  disabled={jobPage <= 1}
                  onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Page {jobPage}</span>
                <button
                  type="button"
                  disabled={filteredJobs.length < jobsPerPage}
                  onClick={() => setJobPage((p) => p + 1)}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* ── Job detail drawer (right col) ── */}
          <div className="min-w-0">
            {selectedJob ? (
              <div className="lg:sticky lg:top-[90px]">
                <JobDetailDrawer
                  job={selectedJob}
                  hasApplied={appliedJobIds.has(selectedJob.id)}
                  onClose={() => setSelectedJob(null)}
                  onApply={() => setApplyModalJob(selectedJob)}
                  onExternalApply={() => setExternalApplyJob(selectedJob)}
                  userSkillNames={userSkillNames}
                  onRequestReferral={(u) => setReferralUser(u)}
                />
              </div>
            ) : (
              <div
                className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center px-6 lg:sticky lg:top-[90px]"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-strong)" }}
              >
                <BriefcaseBusiness size={28} className="mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Select a job to view details</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Click any job card on the left</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {applyModalJob && (
        <JobDetailModal
          job={applyModalJob}
          onClose={() => setApplyModalJob(null)}
          hasAppliedAlready={appliedJobIds.has(applyModalJob.id)}
        />
      )}
      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => recruiterJobsQuery.refetch()}
        />
      )}
      {referralUser && (
        <RequestReferralModal
          targetUser={referralUser}
          companyNameDefault={selectedJob?.company?.name || ""}
          onClose={() => setReferralUser(null)}
        />
      )}
      {externalApplyJob && (
        <ExternalApplyModal
          job={externalApplyJob}
          onClose={() => setExternalApplyJob(null)}
        />
      )}
    </div>
  );
}
