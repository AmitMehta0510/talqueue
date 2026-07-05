import { Link } from "react-router-dom";
import {
  MapPin,
  Briefcase,
  IndianRupee,
  Clock,
  Star,
  Zap,
  ExternalLink,
  X,
  Loader2,
  Building2,
  CheckCircle,
} from "lucide-react";
import { Job, User, CompanyEmployee } from "../../lib/api";
import { Avatar } from "../ui";
import { formatSalary } from "./JobShared";
import { cleanLogoUrl, formatDate, formatCount, titleCase, userName, userHeadline, parseJobTitle } from "../../core/utils/format";

export interface JobDetailDrawerProps {
  job: Job;
  hasApplied: boolean;
  onClose: () => void;
  onApply: () => void;
  onExternalApply?: () => void;
  userSkillNames?: Set<string>;
  onRequestReferral: (user: User) => void;
  employees: CompanyEmployee[];
  isEmployeesLoading: boolean;
  isEmployeesFetching: boolean;
}

// Detect if a string contains HTML tags
function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// Render rich HTML job descriptions (from ATS scrapers)
function renderHtmlContent(text: string | null | undefined) {
  if (!text) return null;
  return (
    <div
      className="prose prose-sm max-w-none text-sm leading-relaxed job-description-html"
      style={{ color: "var(--text-secondary)" }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

// Helper to render plain text lists as neat bulleted list items in premium UI/UX
function renderDynamicList(text: string | null | undefined) {
  if (!text) return null;

  // If the content contains HTML, render it as HTML
  if (isHtmlContent(text)) {
    return renderHtmlContent(text);
  }

  // Split lines, remove bullet markers, and clean whitespace
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•\d.]+\s*/, ""))
    .filter(Boolean);

  if (lines.length > 1) {
    return (
      <ul className="space-y-2.5 mt-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{text}</p>;
}

export function JobDetailDrawer({
  job,
  hasApplied,
  onClose,
  onApply,
  onExternalApply,
  userSkillNames,
  onRequestReferral,
  employees,
  isEmployeesLoading,
  isEmployeesFetching,
}: JobDetailDrawerProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const { cleanTitle, tags } = parseJobTitle(job.title || "");
  const referralFriendlyEmployees = employees.filter((emp) => emp.user?.acceptingReferrals);

  const jobSkills = (job.skillsRequired || []) as string[];
  const matchingSkills = jobSkills.filter((s) => userSkillNames?.has(s.toLowerCase().trim()));
  const missingSkills = jobSkills.filter((s) => !userSkillNames?.has(s.toLowerCase().trim()));

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
                {cleanTitle}
              </h2>
              {tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
          {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
          {salary && <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--text-primary)" }}><IndianRupee size={11} />{salary}</span>}
          {job.workMode && <span className="flex items-center gap-1"><Briefcase size={11} />{titleCase(job.workMode)}</span>}
          {job.type && <span className="flex items-center gap-1"><Clock size={11} />{titleCase(job.type)}</span>}
          {job.experienceLevel && <span className="flex items-center gap-1"><Star size={11} />{titleCase(job.experienceLevel)}</span>}
        </div>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          {hasApplied ? (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
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
            {isEmployeesFetching && <Loader2 className="animate-spin" size={14} style={{ color: "var(--text-muted)" }} />}
          </div>

          {isEmployeesLoading ? (
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
          <div className="panel p-5 space-y-4 bg-gradient-to-br from-surface to-surface-2 border border-base rounded-xl shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-base">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Skill Checklist Match
                </h4>
                <p className="text-[11px] text-muted-fg mt-0.5">
                  How well does your profile match this role's stack?
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  matchingSkills.length === jobSkills.length
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                    : matchingSkills.length > 0
                    ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-base"
                }`}>
                  {Math.round((matchingSkills.length / jobSkills.length) * 100)}% Match
                </span>
              </div>
            </div>
            
            {/* Visual match progress bar */}
            <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  matchingSkills.length === jobSkills.length
                    ? "bg-emerald-500"
                    : matchingSkills.length > 0
                    ? "bg-indigo-500"
                    : "bg-slate-300"
                }`}
                style={{ width: `${(matchingSkills.length / jobSkills.length) * 100}%` }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  ✓ Matches ({matchingSkills.length})
                </h5>
                {matchingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchingSkills.map((s, i) => (
                      <span key={i} className="rounded-md px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-muted-fg">No matching skills yet.</p>
                )}
              </div>
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 text-amber-600 dark:text-amber-500">
                  ⚠ Missing ({missingSkills.length})
                </h5>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((s, i) => (
                      <span key={i} className="rounded-md px-2.5 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-base text-secondary">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-emerald-600">All matching! Zero missing skills.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job description */}
        {job.description && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Job Description</h3>
            {renderDynamicList(job.description)}
          </div>
        )}
        {job.responsibilities && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Responsibilities</h3>
            {renderDynamicList(job.responsibilities)}
          </div>
        )}
        {job.requirements && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Requirements</h3>
            {renderDynamicList(job.requirements)}
          </div>
        )}
        {job.perks && (
          <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Perks & Benefits</h3>
            {renderDynamicList(job.perks)}
          </div>
        )}
        {(job.postedAt || job.createdAt) && (
          <p className="text-xs border-t pt-3" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
            Posted {formatDate(job.postedAt ?? job.createdAt!)} · {formatCount(job.applicationsCount ?? 0)} applicants
          </p>
        )}
      </div>
    </div>
  );
}
