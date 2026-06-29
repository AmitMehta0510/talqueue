import { useState, useRef, useEffect } from "react";
import { X, Building2, Search, Loader2, Plus, Calendar, IndianRupee, Briefcase } from "lucide-react";
import { useSendDriveInviteMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../core/contexts/ToastContext";
import { api } from "../../lib/api";

interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  slug?: string;
}

interface TpoInviteCompanyModalProps {
  collegeId: string;
  collegeName: string;
  onClose: () => void;
}

export function TpoInviteCompanyModal({ collegeId, collegeName, onClose }: TpoInviteCompanyModalProps) {
  const sendMutation = useSendDriveInviteMutation();
  const { showToast } = useToast();

  // Company search
  const [companyQuery, setCompanyQuery] = useState("");
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [form, setForm] = useState({
    driveTitle: "",
    driveDate: "",
    applyDeadline: "",
    description: "",
    message: "",
    stipendMin: "",
    stipendMax: "",
    salaryMin: "",
    salaryMax: "",
    minCgpa: "",
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");

  useEffect(() => {
    if (companyQuery.trim().length < 2) {
      setCompanySuggestions([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setCompanyLoading(true);
      try {
        const res = await api.companies({ q: companyQuery, limit: 10 });
        setCompanySuggestions((res.data?.companies || []) as Company[]);
      } catch {
        /* ignore */
      } finally {
        setCompanyLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [companyQuery]);

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !roles.includes(trimmed)) setRoles((prev) => [...prev, trimmed]);
    setRoleInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) {
      showToast("error", "Please select a company");
      return;
    }
    if (!form.driveTitle.trim()) {
      showToast("error", "Drive title is required");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        companyId: selectedCompany.id,
        collegeId,
        initiatedBy: "COLLEGE_TO_COMPANY",
        driveTitle: form.driveTitle.trim(),
        driveDate: form.driveDate || undefined,
        applyDeadline: form.applyDeadline || undefined,
        description: form.description || undefined,
        message: form.message || undefined,
        roles,
        stipendMin: form.stipendMin ? Number(form.stipendMin) : undefined,
        stipendMax: form.stipendMax ? Number(form.stipendMax) : undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        minCgpa: form.minCgpa ? Number(form.minCgpa) : undefined,
        currency: "INR",
      });
      showToast("success", `Placement drive invitation sent to ${selectedCompany.name}`);
      onClose();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to send invitation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-xl max-h-[95vh] glass rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base bg-surface-2 shrink-0">
          <div>
            <h2 className="text-base font-bold text-primary">Invite a Company</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              Send a campus placement invitation on behalf of <span className="font-semibold text-indigo-600 dark:text-indigo-400">{collegeName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-3 text-muted-fg hover:text-primary transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Company Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              <Building2 size={11} className="inline mr-1" />Target Company *
            </label>
            {selectedCompany ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  {selectedCompany.logoUrl ? (
                    <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="h-7 w-7 rounded-lg border object-cover bg-white" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-muted-fg border">
                      <Building2 size={12} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">{selectedCompany.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setCompanyQuery("");
                  }}
                  className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-755 dark:hover:text-indigo-300"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
                <input
                  type="text"
                  placeholder="Search companies by name…"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  className="field pl-9"
                />
                {companyLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg animate-spin" />}
                {companySuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-xl border border-base bg-surface shadow-lg max-h-40 overflow-y-auto">
                    {companySuggestions.map((comp) => (
                      <li key={comp.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(comp);
                            setCompanyQuery("");
                            setCompanySuggestions([]);
                          }}
                          className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-surface-2 text-sm text-left transition"
                        >
                          {comp.logoUrl ? (
                            <img src={comp.logoUrl} alt={comp.name} className="h-6 w-6 rounded-md border object-cover bg-white mt-0.5 shrink-0" />
                          ) : (
                            <Building2 size={13} className="text-muted-fg mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-primary">{comp.name}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Drive Title */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Drive Title *</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer Placement Drive 2026"
              value={form.driveTitle}
              onChange={(e) => setForm((f) => ({ ...f, driveTitle: e.target.value }))}
              className="field"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                <Calendar size={11} className="inline mr-1" />Drive Date
              </label>
              <input
                type="date"
                value={form.driveDate}
                onChange={(e) => setForm((f) => ({ ...f, driveDate: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                <Calendar size={11} className="inline mr-1" />Apply Deadline
              </label>
              <input
                type="date"
                value={form.applyDeadline}
                onChange={(e) => setForm((f) => ({ ...f, applyDeadline: e.target.value }))}
                className="field"
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Roles Offered</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add role…"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
                className="field flex-1"
              />
              <button
                type="button"
                onClick={addRole}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition"
              >
                <Plus size={16} />
              </button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => setRoles((p) => p.filter((x) => x !== r))}
                      className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-750 dark:hover:text-indigo-350"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stipend/CTC */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              <IndianRupee size={11} className="inline mr-1" />Compensation
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-fg mb-1">Stipend ₹/mo</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.stipendMin}
                    onChange={(e) => setForm((f) => ({ ...f, stipendMin: e.target.value }))}
                    className="field py-2 px-3 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.stipendMax}
                    onChange={(e) => setForm((f) => ({ ...f, stipendMax: e.target.value }))}
                    className="field py-2 px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-fg mb-1">CTC ₹/yr</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={form.salaryMin}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                    className="field py-2 px-3 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={form.salaryMax}
                    onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                    className="field py-2 px-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CGPA */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Minimum CGPA Criteria</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 7.5 (optional)"
              value={form.minCgpa}
              onChange={(e) => setForm((f) => ({ ...f, minCgpa: e.target.value }))}
              className="field"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Description (optional)</label>
            <textarea
              placeholder="Roles description, branch restrictions, special instructions..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="field resize-none"
            />
          </div>

          {/* Message to Recruiter */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Message to Recruiter (optional)</label>
            <textarea
              placeholder="Brief invitation pitch or message to the company recruiter..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={2}
              className="field resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base flex items-center gap-3 shrink-0 bg-surface">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sendMutation.isPending}
            className="btn-primary flex-1 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white disabled:opacity-60 transition shadow-sm flex items-center justify-center gap-2"
          >
            {sendMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Briefcase size={14} />}
            Invite Company
          </button>
        </div>
      </div>
    </div>
  );
}
