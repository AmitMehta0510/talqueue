import { FormEvent, useState, useMemo } from "react";
import { BriefcaseBusiness, DollarSign, Globe, Award, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Job, JobApplicationPayload } from "../../lib/api";
import { formatCount, titleCase } from "../../core/utils/format";
import { useAuth } from "../../core/contexts/AuthContext";
import { useApplyToJobMutation, useMyFullProfileQuery } from "../../hooks/usePlatformQueries";
import { Modal } from "../ui";

// Helper to render plain text lists as neat bulleted list items in premium UI/UX
function renderDynamicList(text: string | null | undefined) {
  if (!text) return null;
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

interface JobDetailModalProps {
  /** The job record to display details for. */
  job: Job;
  /** Callback fired when closing the modal. */
  onClose: () => void;
  /** Optional flag indicating if the user has already applied to this job. */
  hasAppliedAlready?: boolean;
}

/**
 * Renders a detailed overlay containing extensive job information, skill checklist matches,
 * salary ranges, requirements, description tabs, and an application form for candidates.
 * Uses the reusable Modal component.
 */
export function JobDetailModal({ job, onClose, hasAppliedAlready = false }: JobDetailModalProps) {
  const { user } = useAuth();
  const applyMutation = useApplyToJobMutation(job.id);
  const [applied, setApplied] = useState(hasAppliedAlready);

  // Fetch full user profile for skills checklist match
  const profileQuery = useMyFullProfileQuery();
  const userSkillNames = useMemo(() => {
    return new Set(
      (profileQuery.data?.skills || [])
        .map((s) => s.skill?.name?.toLowerCase().trim())
        .filter((name): name is string => Boolean(name))
    );
  }, [profileQuery.data?.skills]);

  const jobSkills = (job.skillsRequired || []) as string[];
  const matchingSkills = jobSkills.filter((s) => userSkillNames.has(s.toLowerCase().trim()));
  const missingSkills = jobSkills.filter((s) => !userSkillNames.has(s.toLowerCase().trim()));

  const [form, setForm] = useState<JobApplicationPayload>({
    resumeUrl: user?.profile?.resumeUrl || "",
    coverLetter: "",
    githubUrl: user?.profile?.githubUrl || "",
    portfolioUrl: user?.profile?.portfolioUrl || "",
    linkedinUrl: user?.profile?.linkedinUrl || "",
  });

  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency || "INR"} ${formatCount(job.salaryMin || 0)} - ${formatCount(job.salaryMax || 0)}`
      : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.resumeUrl) return;

    try {
      await applyMutation.mutateAsync(form);
      setApplied(true);
    } catch {
      // Hook handles the error toast
    }
  };

  const isRecruiter = user?.primaryRole === "RECRUITER";

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <div className="p-6 space-y-6">
        {/* Top Job Info */}
        <div className="flex items-start gap-4 pr-6">
          <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
            <BriefcaseBusiness size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-primary">{job.title || "Open Role"}</h2>
              {job.featured && <span className="chip text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">Featured</span>}
            </div>
            <p className="text-sm font-medium text-secondary mt-1">
              {job.company?.name || "Company"} &bull; {job.location || "Remote"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-fg">
              <span className="flex items-center gap-1">
                <Globe size={13} />
                {titleCase(job.workMode || "Remote")}
              </span>
              <span className="flex items-center gap-1">
                <BriefcaseBusiness size={13} />
                {titleCase(job.type || "Full Time")}
              </span>
              {salary && (
                <span className="flex items-center gap-1 text-brand font-medium">
                  <DollarSign size={13} />
                  {salary}
                </span>
              )}
            </div>
          </div>
        </div>

        <hr className="border-base" />

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

        {/* Description Section */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-2">Job Description</h3>
          {renderDynamicList(job.description)}
        </div>

        {job.responsibilities && (
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Responsibilities</h3>
            {renderDynamicList(job.responsibilities)}
          </div>
        )}

        {job.requirements && (
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Requirements</h3>
            {renderDynamicList(job.requirements)}
          </div>
        )}

        {job.perks && (
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">Perks & Benefits</h3>
            {renderDynamicList(job.perks)}
          </div>
        )}

        <hr className="border-base" />

        {/* Apply Form / Status Section / External Apply */}
        <div className="bg-surface-2 rounded-lg p-5 border border-base">
          {job.applyUrl ? (
            <div className="text-center py-4 space-y-3">
              <Globe size={24} className="mx-auto text-brand animate-pulse" />
              <div>
                <h4 className="font-semibold text-sm text-primary">External Job Application</h4>
                <p className="text-xs text-muted-fg mt-1 max-w-md mx-auto">
                  This job listing is sourced externally. Applications are processed directly on the company's hiring portal.
                </p>
              </div>
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-1.5 mt-2"
              >
                Apply on Company Portal <Globe size={13} />
              </a>
            </div>
          ) : applied ? (
            <div className="flex items-center gap-3 text-brand">
              <CheckCircle2 size={24} className="shrink-0 text-brand" />
              <div>
                <h4 className="font-semibold text-sm">Application Submitted!</h4>
                <p className="text-xs text-brand/80 mt-0.5">
                  You have successfully applied for this position. The recruiter will review your profile shortly.
                </p>
              </div>
            </div>
          ) : isRecruiter ? (
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-400">
              <Award size={24} className="shrink-0 text-amber-600" />
              <div>
                <h4 className="font-semibold text-sm">Recruiter Account</h4>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                  As a recruiter, you can manage this pipeline via your dashboard, but you cannot apply for jobs.
                </p>
              </div>
            </div>
          ) : !user ? (
            <div className="text-center py-2">
              <p className="text-sm text-secondary mb-3">You must login to apply for this job.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-sm mb-3">
                <Sparkles size={16} className="text-brand" />
                <h4>Apply for this Job</h4>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-fg">
                    Resume URL <span className="text-rose-500">*</span>
                  </span>
                  <input
                    className="field"
                    value={form.resumeUrl}
                    onChange={(e) => setForm((c) => ({ ...c, resumeUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    type="url"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-fg">GitHub URL (Optional)</span>
                  <input
                    className="field"
                    value={form.githubUrl}
                    onChange={(e) => setForm((c) => ({ ...c, githubUrl: e.target.value }))}
                    placeholder="https://github.com/..."
                    type="url"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-fg">LinkedIn URL (Optional)</span>
                  <input
                    className="field"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm((c) => ({ ...c, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    type="url"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Portfolio URL (Optional)</span>
                  <input
                    className="field"
                    value={form.portfolioUrl}
                    onChange={(e) => setForm((c) => ({ ...c, portfolioUrl: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Cover Letter (Optional)</span>
                  <textarea
                    className="field min-h-24"
                    value={form.coverLetter}
                    onChange={(e) => setForm((c) => ({ ...c, coverLetter: e.target.value }))}
                    placeholder="Pitch yourself! Why are you a great match for this role?"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send size={15} />
                  )}
                  Submit Application
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
