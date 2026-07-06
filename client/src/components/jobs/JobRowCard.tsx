import React from "react";
import {
  Briefcase,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  MapPin,
  Clock,
  IndianRupee,
  Building2,
  Loader2,
} from "lucide-react";
import { Job } from "../../lib/api";
import { formatSalary } from "./JobShared";
import { cleanLogoUrl, formatCount, formatDate, titleCase, parseJobTitle } from "../../core/utils/format";

export interface JobRowCardProps {
  job: Job;
  isSelected: boolean;
  hasApplied: boolean;
  isSaved: boolean;
  isSaveLoading: boolean;
  onSelect: () => void;
  onSaveToggle: (e: React.MouseEvent) => void;
  isRecruiter: boolean;
  userSkillNames?: Set<string>;
}

export function JobRowCard({
  job,
  isSelected,
  hasApplied,
  isSaved,
  isSaveLoading,
  onSelect,
  onSaveToggle,
  isRecruiter,
  userSkillNames,
}: JobRowCardProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const { cleanTitle, tags } = parseJobTitle(job.title || "");
  const WORK_MODE_COLOR: Record<string, string> = {
    REMOTE: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700",
    HYBRID: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    ONSITE: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  };

  const jobSkills = [...new Set((job.skillsRequired || []) as string[])];
  const matchingSkills = jobSkills.filter((s) => userSkillNames?.has(s.toLowerCase().trim()));
  const matchPercentage = jobSkills.length
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 100;
  const showMatchScore = userSkillNames && userSkillNames.size > 0 && jobSkills.length > 0;

  const isHot = job.applicationsCount != null && job.applicationsCount >= 5;

  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:shadow-lg relative overflow-hidden ${isSelected
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
                {cleanTitle}
              </h3>
              {tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {job.company?.name || "Company"}
              </p>
            </div>

            {!isRecruiter && (
              <button
                type="button"
                disabled={isSaveLoading}
                onClick={onSaveToggle}
                className={`shrink-0 rounded-full p-1.5 transition-all hover:text-blue-600 dark:hover:text-blue-400 ${isSaveLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { if (!isSaveLoading) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                title={isSaved ? "Remove saved" : "Save job"}
              >
                {isSaveLoading ? (
                  <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                ) : isSaved ? (
                  <BookmarkCheck size={16} className="text-blue-600 dark:text-blue-400 scale-110 transition-transform" />
                ) : (
                  <Bookmark size={16} className="hover:scale-110 transition-transform" />
                )}
              </button>
            )}
          </div>

          {/* Status badges & Skills */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isHot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                Hot Job
              </span>
            )}
            {showMatchScore && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${matchPercentage >= 75
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
                  : matchPercentage >= 40
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                    : "border-[color:var(--border)]"
                }`} style={matchPercentage < 40 ? { background: "var(--bg-surface-2)", color: "var(--text-muted)" } : {}}>
                {matchPercentage}% Skill Match
              </span>
            )}
            {jobSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {jobSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold border"
                    style={{
                      background: "var(--bg-surface-2)",
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {skill}
                  </span>
                ))}
                {jobSkills.length > 4 && (
                  <span className="text-[9px] font-medium pl-0.5" style={{ color: "var(--text-muted)" }}>
                    +{jobSkills.length - 4}
                  </span>
                )}
              </div>
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
            {(job.postedAt || job.createdAt) && (
              <span className="flex items-center gap-1" title={job.postedAt ? `Posted on: ${formatDate(job.postedAt)}` : undefined}>
                <Clock size={11} />
                Posted {formatDate(job.postedAt ?? job.createdAt!)}
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
              <span className="flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
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
