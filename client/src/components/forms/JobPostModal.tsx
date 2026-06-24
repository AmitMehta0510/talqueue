import { FormEvent, useEffect, useState } from "react";
import { X, BriefcaseBusiness, Save, Building2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCreateJobMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
import { compactPayload, splitCsv } from "../../lib/format";
import { api } from "../../lib/api";

interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface JobPostModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function JobPostModal({ onClose, onSuccess }: JobPostModalProps) {
  const { showToast } = useToast();
  const createJobMutation = useCreateJobMutation();

  // Companies list for dropdown
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // "other" company input
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isOtherCompany, setIsOtherCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");

  // Pending state — shown after admin approval flow triggered
  const [pendingResult, setPendingResult] = useState<{ message: string } | null>(null);

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

  // Load companies on mount
  useEffect(() => {
    api.companies({ page: 1, limit: 100 })
      .then((res) => {
        setCompanies((res.data?.companies || []) as Company[]);
      })
      .catch(() => {
        setCompanies([]);
      })
      .finally(() => setCompaniesLoading(false));
  }, []);

  const handleCompanySelect = (value: string) => {
    if (value === "__other__") {
      setIsOtherCompany(true);
      setSelectedCompanyId("");
    } else {
      setIsOtherCompany(false);
      setSelectedCompanyId(value);
      setCompanyName("");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedCompanyId && !companyName.trim()) {
      showToast("error", "Please select a company or enter a new company name.");
      return;
    }

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

    const payload = compactPayload({
      ...(selectedCompanyId ? { companyId: selectedCompanyId } : { companyName: companyName.trim() }),
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
    }) as any;


    try {
      const result = await createJobMutation.mutateAsync(payload);
      const data = (result as any)?.data ?? result;

      // 202 pending approval
      if (data?.pending) {
        setPendingResult({ message: data.message });
        return;
      }

      // Direct success
      showToast("success", "Job posted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      // Mutation handles error toast
    }
  };

  // Pending state screen
  if (pendingResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative w-full max-w-md p-8 text-center z-10 glass animate-scale-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
            <AlertCircle size={28} className="text-amber-500 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">Company Verification Pending</h3>
          <p className="text-sm leading-relaxed text-muted-fg mb-6">{pendingResult.message}</p>
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 text-left mb-6">
            <CheckCircle2 size={16} className="shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">What happens next?</p>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-300">
                A platform admin will review your company request. Once approved, your job will automatically go live and you'll receive a notification.
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      {/* Backdrop click dismisses modal */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl flex flex-col max-h-[90vh] z-10 glass animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base px-6 py-4">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={20} className="text-blue-600" />
            <h3 className="text-base font-semibold text-primary">Post a New Job</h3>
          </div>
          <button
            className="rounded-full p-1.5 text-muted-fg hover:bg-surface-2 hover:text-primary transition"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">

          {/* Company selector — the core fix */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-fg">
              Company <span className="text-rose-500">*</span>
            </label>
            {companiesLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-fg py-2">
                <Loader2 size={14} className="animate-spin" /> Loading companies…
              </div>
            ) : (
              <select
                className="field"
                value={isOtherCompany ? "__other__" : selectedCompanyId}
                onChange={(e) => handleCompanySelect(e.target.value)}
                required={!isOtherCompany}
              >
                <option value="">— Select a company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__other__">➕ Other – request new company</option>
              </select>
            )}

            {/* Custom company name input (when "Other" selected) */}
            {isOtherCompany && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This company will need admin approval before your job is published. You'll get a notification once it's approved.
                  </p>
                </div>
                <input
                  className="field"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter the company name exactly"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">
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
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Work Mode</span>
              <select
                className="field"
                value={form.workMode}
                onChange={(e) => setForm((c) => ({ ...c, workMode: e.target.value }))}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Job Type</span>
              <select
                className="field"
                value={form.type}
                onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="ENTRY_LEVEL">Entry Level</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Location</span>
              <input
                className="field"
                value={form.location}
                onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                placeholder="e.g. Bangalore, India (or Remote)"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Experience Level</span>
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
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Skills Required (Comma separated)</span>
              <input
                className="field"
                value={form.skillsRequired}
                onChange={(e) => setForm((c) => ({ ...c, skillsRequired: e.target.value }))}
                placeholder="e.g. Node.js, TypeScript, PostgreSQL, Docker"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Currency</span>
              <input
                className="field"
                value={form.currency}
                onChange={(e) => setForm((c) => ({ ...c, currency: e.target.value }))}
                placeholder="e.g. INR, USD"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Min Salary</span>
                <input
                  className="field"
                  value={form.salaryMin}
                  onChange={(e) => setForm((c) => ({ ...c, salaryMin: e.target.value }))}
                  placeholder="Min"
                  type="number"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-fg">Max Salary</span>
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
              <span className="mb-1.5 block text-xs font-semibold text-muted-fg">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-base">
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
              ) : isOtherCompany ? (
                <AlertCircle size={15} />
              ) : (
                <Save size={15} />
              )}
              {isOtherCompany ? "Submit for Approval" : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
