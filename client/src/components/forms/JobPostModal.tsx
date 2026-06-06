import { FormEvent, useState } from "react";
import { X, BriefcaseBusiness, Save } from "lucide-react";
import { useCreateJobMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
import { compactPayload, splitCsv } from "../../lib/format";

interface JobPostModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function JobPostModal({ onClose, onSuccess }: JobPostModalProps) {
  const { showToast } = useToast();
  const createJobMutation = useCreateJobMutation();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    workMode: "REMOTE",
    type: "FULL_TIME",
    experienceLevel: "ENTRY",
    currency: "INR",
    salaryMin: "",
    salaryMax: "",
    skillsRequired: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      showToast("error", "Job title and description are required.");
      return;
    }

    const min = form.salaryMin ? Number(form.salaryMin) : undefined;
    const max = form.salaryMax ? Number(form.salaryMax) : undefined;

    if (min !== undefined && max !== undefined && min > max) {
      showToast("error", "Minimum salary cannot exceed maximum salary.");
      return;
    }

    try {
      await createJobMutation.mutateAsync(
        compactPayload({
          title: form.title,
          description: form.description,
          location: form.location || undefined,
          workMode: form.workMode,
          type: form.type,
          experienceLevel: form.experienceLevel,
          currency: form.currency || undefined,
          salaryMin: min,
          salaryMax: max,
          skillsRequired: splitCsv(form.skillsRequired),
        })
      );
      showToast("success", "Job posted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      // Mutation handles error toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Backdrop click dismisses modal */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in duration-200">
        {/* Header Close button */}
        <button
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BriefcaseBusiness size={20} className="text-emerald-700" />
            <h3 className="text-base font-semibold text-slate-950">Post a New Job Role</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Job Title <span className="text-rose-500">*</span>
              </span>
              <input
                className="field"
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="e.g. Senior Backend Engineer"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Work Mode</span>
              <select
                className="field"
                value={form.workMode}
                onChange={(e) => setForm((c) => ({ ...c, workMode: e.target.value }))}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ON_SITE">On-Site</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Job Type</span>
              <select
                className="field"
                value={form.type}
                onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Location</span>
              <input
                className="field"
                value={form.location}
                onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                placeholder="e.g. Bangalore, India (or Remote)"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Experience Level</span>
              <select
                className="field"
                value={form.experienceLevel}
                onChange={(e) => setForm((c) => ({ ...c, experienceLevel: e.target.value }))}
              >
                <option value="ENTRY">Entry Level</option>
                <option value="MID">Mid Level</option>
                <option value="SENIOR">Senior Level</option>
                <option value="LEAD">Lead / Architect</option>
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Skills Required (Comma separated)</span>
              <input
                className="field"
                value={form.skillsRequired}
                onChange={(e) => setForm((c) => ({ ...c, skillsRequired: e.target.value }))}
                placeholder="e.g. Node.js, TypeScript, PostgreSQL, Docker"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Currency</span>
              <input
                className="field"
                value={form.currency}
                onChange={(e) => setForm((c) => ({ ...c, currency: e.target.value }))}
                placeholder="e.g. INR, USD"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Min Salary</span>
                <input
                  className="field"
                  value={form.salaryMin}
                  onChange={(e) => setForm((c) => ({ ...c, salaryMin: e.target.value }))}
                  placeholder="Min"
                  type="number"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Max Salary</span>
                <input
                  className="field"
                  value={form.salaryMax}
                  onChange={(e) => setForm((c) => ({ ...c, salaryMax: e.target.value }))}
                  placeholder="Max"
                  type="number"
                />
              </label>
            </div>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Detailed Description <span className="text-rose-500">*</span>
              </span>
              <textarea
                className="field min-h-32"
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="Responsibilities, requirements, benefit details..."
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              type="submit"
              disabled={createJobMutation.isPending}
            >
              {createJobMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save size={15} />
              )}
              Post Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
