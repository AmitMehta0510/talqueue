import { useState, useRef, useEffect } from "react";
import {
  X,
  Building2,
  Calendar,
  Clock,
  IndianRupee,
  GraduationCap,
  FileText,
  Plus,
  Loader2,
  Search,
} from "lucide-react";
import { useCreatePlacementDriveMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../lib/api";

interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  slug?: string;
}

interface CreateDriveModalProps {
  collegeId: string;
  onClose: () => void;
}

const YEAR_OPTIONS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "Final Year" },
];

export function CreateDriveModal({ collegeId, onClose }: CreateDriveModalProps) {
  const createMutation = useCreatePlacementDriveMutation();
  const { showToast } = useToast();

  // Company search
  const [companyQuery, setCompanyQuery] = useState("");
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [form, setForm] = useState({
    driveTitle: "",
    driveDate: "",
    applyDeadline: "",
    description: "",
    stipendMin: "",
    stipendMax: "",
    salaryMin: "",
    salaryMax: "",
    minCgpa: "",
    currency: "INR",
    driveType: "PLACEMENT" as "PLACEMENT" | "INTERNSHIP",
    internshipDurationMonths: "6",
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [eligibleYears, setEligibleYears] = useState<number[]>([]);
  const [eligibleBranches, setEligibleBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("");

  // Company search
  useEffect(() => {
    if (companyQuery.trim().length < 2) {
      setCompanySuggestions([]);
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setCompanyLoading(true);
      try {
        const res = await api.companies({ q: companyQuery, limit: 8 });
        setCompanySuggestions((res.data?.companies || res.data || []) as Company[]);
      } catch {
        /* ignore */
      } finally {
        setCompanyLoading(false);
      }
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [companyQuery]);

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !roles.includes(trimmed)) setRoles((prev) => [...prev, trimmed]);
    setRoleInput("");
  };

  const addBranch = () => {
    const trimmed = branchInput.trim();
    if (trimmed && !eligibleBranches.includes(trimmed)) setEligibleBranches((prev) => [...prev, trimmed]);
    setBranchInput("");
  };

  const toggleYear = (year: number) => {
    setEligibleYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) { showToast("error", "Please select a company"); return; }
    if (!form.driveTitle.trim()) { showToast("error", "Drive title is required"); return; }

    await createMutation.mutateAsync({
      driveTitle: form.driveTitle.trim(),
      companyId: selectedCompany.id,
      targetCollegeId: collegeId,
      driveDate: form.driveDate || undefined,
      applyDeadline: form.applyDeadline || undefined,
      description: form.description || undefined,
      roles,
      stipendMin: form.stipendMin ? Number(form.stipendMin) : undefined,
      stipendMax: form.stipendMax ? Number(form.stipendMax) : undefined,
      salaryMin: form.driveType === "PLACEMENT" && form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.driveType === "PLACEMENT" && form.salaryMax ? Number(form.salaryMax) : undefined,
      minCgpa: form.minCgpa ? Number(form.minCgpa) : undefined,
      eligibleBranches,
      eligibleYears,
      currency: form.currency,
      driveType: form.driveType,
      internshipDurationMonths: form.driveType === "INTERNSHIP" ? Number(form.internshipDurationMonths) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-2xl max-h-[95vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Placement Drive</h2>
            <p className="text-xs text-slate-500 mt-0.5">Post a new campus placement opportunity</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/70 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Drive Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drive Title *</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer Campus Drive 2025"
              value={form.driveTitle}
              onChange={(e) => setForm((f) => ({ ...f, driveTitle: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          {/* Drive Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drive Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, driveType: "PLACEMENT" }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition ${
                  form.driveType === "PLACEMENT"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}
              >
                Full-Time Placement
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, driveType: "INTERNSHIP" }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition ${
                  form.driveType === "INTERNSHIP"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}
              >
                Internship
              </button>
            </div>
          </div>

          {form.driveType === "INTERNSHIP" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internship Duration (Months)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.internshipDurationMonths}
                onChange={(e) => setForm((f) => ({ ...f, internshipDurationMonths: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>
          )}

          {/* Company Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <Building2 size={11} className="inline mr-1" />
              Company *
            </label>
            {selectedCompany ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5">
                <span className="text-sm font-semibold text-indigo-800">{selectedCompany.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedCompany(null); setCompanyQuery(""); }}
                  className="text-indigo-400 hover:text-indigo-700 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search companies…"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {companyLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                {companySuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {companySuggestions.map((co) => (
                      <li key={co.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedCompany(co); setCompanyQuery(""); setCompanySuggestions([]); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-indigo-50 text-sm text-left transition"
                        >
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          {co.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <Calendar size={11} className="inline mr-1" />Drive Date
              </label>
              <input
                type="date"
                value={form.driveDate}
                onChange={(e) => setForm((f) => ({ ...f, driveDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <Clock size={11} className="inline mr-1" />Apply Deadline
              </label>
              <input
                type="date"
                value={form.applyDeadline}
                onChange={(e) => setForm((f) => ({ ...f, applyDeadline: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Roles Offered</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SDE, Data Analyst…"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button type="button" onClick={addRole} className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
                <Plus size={16} />
              </button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {r}
                    <button type="button" onClick={() => setRoles((prev) => prev.filter((x) => x !== r))} className="text-indigo-400 hover:text-indigo-700">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Compensation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <IndianRupee size={11} className="inline mr-1" />Compensation (optional)
            </label>
            <div className={form.driveType === "INTERNSHIP" ? "block" : "grid grid-cols-2 gap-3"}>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Stipend (₹/mo)</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={form.stipendMin} onChange={(e) => setForm((f) => ({ ...f, stipendMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" placeholder="Max" value={form.stipendMax} onChange={(e) => setForm((f) => ({ ...f, stipendMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              {form.driveType === "PLACEMENT" && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">CTC (₹/yr)</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="number" placeholder="Max" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Eligibility */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap size={12} />Eligibility Criteria
            </p>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Min CGPA</label>
              <input type="number" step="0.1" min="0" max="10" placeholder="e.g. 7.5" value={form.minCgpa} onChange={(e) => setForm((f) => ({ ...f, minCgpa: e.target.value }))} className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5">Eligible Years</label>
              <div className="flex flex-wrap gap-2">
                {YEAR_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleYear(value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${eligibleYears.includes(value) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Eligible Branches</label>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. CSE, ECE…" value={branchInput} onChange={(e) => setBranchInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBranch(); } }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" onClick={addBranch} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition">
                  <Plus size={14} />
                </button>
              </div>
              {eligibleBranches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {eligibleBranches.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {b}<button type="button" onClick={() => setEligibleBranches((prev) => prev.filter((x) => x !== b))}><X size={9} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <FileText size={11} className="inline mr-1" />Description (optional)
            </label>
            <textarea
              placeholder="Describe the drive, selection process, rounds, etc."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0 bg-white">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            type="submit"
            form="create-drive-form"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
          >
            {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
            Create Drive
          </button>
        </div>
      </div>
    </div>
  );
}
