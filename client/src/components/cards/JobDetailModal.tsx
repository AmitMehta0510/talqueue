import { FormEvent, useState } from "react";
import { X, BriefcaseBusiness, DollarSign, Globe, Award, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Job, JobApplicationPayload } from "../../lib/api";
import { formatCount, titleCase } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { useApplyToJobMutation } from "../../hooks/usePlatformQueries";

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  hasAppliedAlready?: boolean;
}

export function JobDetailModal({ job, onClose, hasAppliedAlready = false }: JobDetailModalProps) {
  const { user } = useAuth();
  const applyMutation = useApplyToJobMutation(job.id);
  const [applied, setApplied] = useState(hasAppliedAlready);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Backdrop click dismisses modal */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in duration-200">
        {/* Header Close button */}
        <button
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Top Job Info */}
          <div className="flex items-start gap-4">
            <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <BriefcaseBusiness size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">{job.title || "Open Role"}</h2>
                {job.featured && <span className="chip text-amber-700 bg-amber-50">Featured</span>}
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {job.company?.name || "Company"} &bull; {job.location || "Remote"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Globe size={13} />
                  {titleCase(job.workMode || "Remote")}
                </span>
                <span className="flex items-center gap-1">
                  <BriefcaseBusiness size={13} />
                  {titleCase(job.type || "Full Time")}
                </span>
                {salary && (
                  <span className="flex items-center gap-1 text-emerald-800 font-medium">
                    <DollarSign size={13} />
                    {salary}
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Description Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-950 mb-2">Job Description</h3>
            <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.responsibilities && (
            <div>
              <h3 className="text-sm font-semibold text-slate-950 mb-2">Responsibilities</h3>
              <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{job.responsibilities}</p>
            </div>
          )}

          {job.requirements && (
            <div>
              <h3 className="text-sm font-semibold text-slate-950 mb-2">Requirements</h3>
              <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {job.perks && (
            <div>
              <h3 className="text-sm font-semibold text-slate-950 mb-2">Perks & Benefits</h3>
              <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{job.perks}</p>
            </div>
          )}

          {/* Skills Required */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-950 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill) => (
                  <span className="chip bg-slate-100 text-slate-700 px-3 py-1" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* Apply Form / Status Section / External Apply */}
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
            {job.applyUrl ? (
              <div className="text-center py-4 space-y-3">
                <Globe size={24} className="mx-auto text-blue-600 animate-pulse" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">External Job Application</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
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
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-sm">Application Submitted!</h4>
                  <p className="text-xs text-emerald-700/80 mt-0.5">
                    You have successfully applied for this position. The recruiter will review your profile shortly.
                  </p>
                </div>
              </div>
            ) : isRecruiter ? (
              <div className="flex items-center gap-3 text-amber-800">
                <Award size={24} className="shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-semibold text-sm">Recruiter Account</h4>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    As a recruiter, you can manage this pipeline via your dashboard, but you cannot apply for jobs.
                  </p>
                </div>
              </div>
            ) : !user ? (
              <div className="text-center py-2">
                <p className="text-sm text-slate-600 mb-3">You must login to apply for this job.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-1.5 text-slate-950 font-semibold text-sm mb-3">
                  <Sparkles size={16} className="text-emerald-700" />
                  <h4>Apply for this Job</h4>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">
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
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">GitHub URL (Optional)</span>
                    <input
                      className="field"
                      value={form.githubUrl}
                      onChange={(e) => setForm((c) => ({ ...c, githubUrl: e.target.value }))}
                      placeholder="https://github.com/..."
                      type="url"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">LinkedIn URL (Optional)</span>
                    <input
                      className="field"
                      value={form.linkedinUrl}
                      onChange={(e) => setForm((c) => ({ ...c, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      type="url"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">Portfolio URL (Optional)</span>
                    <input
                      className="field"
                      value={form.portfolioUrl}
                      onChange={(e) => setForm((c) => ({ ...c, portfolioUrl: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500">Cover Letter (Optional)</span>
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
      </div>
    </div>
  );
}
