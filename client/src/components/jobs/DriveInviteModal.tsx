import { useState, useRef, useEffect } from "react";
import { X, GraduationCap, Search, Loader2, Plus, Building2, Calendar, IndianRupee } from "lucide-react";
import { useSendDriveInviteMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../core/contexts/ToastContext";
import { api } from "../../lib/api";

interface College {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

interface DriveInviteModalProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
}

export function DriveInviteModal({ companyId, companyName, onClose }: DriveInviteModalProps) {
  const sendMutation = useSendDriveInviteMutation();
  const { showToast } = useToast();

  // College search
  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeSuggestions, setCollegeSuggestions] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeLoading, setCollegeLoading] = useState(false);
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
  const [eligibleBranches, setEligibleBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("");
  const [eligibleYears, setEligibleYears] = useState<number[]>([]);

  useEffect(() => {
    if (collegeQuery.trim().length < 2) { setCollegeSuggestions([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setCollegeLoading(true);
      try {
        const res = await api.searchColleges(collegeQuery);
        setCollegeSuggestions((res.data || []) as College[]);
      } catch { /* ignore */ } finally {
        setCollegeLoading(false);
      }
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [collegeQuery]);

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !roles.includes(trimmed)) setRoles((prev) => [...prev, trimmed]);
    setRoleInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege) { showToast("error", "Please select a college"); return; }
    if (!form.driveTitle.trim()) { showToast("error", "Drive title is required"); return; }

    await sendMutation.mutateAsync({
      companyId,
      collegeId: selectedCollege.id,
      initiatedBy: "COMPANY_TO_COLLEGE",
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
      eligibleBranches,
      eligibleYears,
      currency: "INR",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-xl max-h-[95vh] glass rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base bg-surface-2 shrink-0">
          <div>
            <h2 className="text-base font-bold text-primary">Invite a College</h2>
            <p className="text-xs text-muted-fg mt-0.5">Send a campus placement invite on behalf of <span className="font-semibold text-indigo-600 dark:text-indigo-400">{companyName}</span></p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-3 text-muted-fg hover:text-primary transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* College Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              <GraduationCap size={11} className="inline mr-1" />Target College *
            </label>
            {selectedCollege ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">{selectedCollege.name}</p>
                  {selectedCollege.city && <p className="text-xs text-indigo-500 dark:text-indigo-400">{selectedCollege.city}, {selectedCollege.state}</p>}
                </div>
                <button type="button" onClick={() => { setSelectedCollege(null); setCollegeQuery(""); }} className="text-indigo-400 dark:text-indigo-505 hover:text-indigo-705 dark:hover:text-indigo-300">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
                <input
                  type="text"
                  placeholder="Search colleges by name…"
                  value={collegeQuery}
                  onChange={(e) => setCollegeQuery(e.target.value)}
                  className="field pl-9"
                />
                {collegeLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg animate-spin" />}
                {collegeSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-xl border border-base bg-surface shadow-lg max-h-40 overflow-y-auto">
                    {collegeSuggestions.map((col) => (
                      <li key={col.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedCollege(col); setCollegeQuery(""); setCollegeSuggestions([]); }}
                          className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-surface-2 text-sm text-left transition"
                        >
                          <GraduationCap size={13} className="text-muted-fg mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-primary">{col.name}</p>
                            {col.city && <p className="text-xs text-muted-fg">{col.city}, {col.state}</p>}
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
              placeholder="e.g. Graduate Engineer Campus Drive 2025"
              value={form.driveTitle}
              onChange={(e) => setForm((f) => ({ ...f, driveTitle: e.target.value }))}
              className="field"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5"><Calendar size={11} className="inline mr-1" />Drive Date</label>
              <input type="date" value={form.driveDate} onChange={(e) => setForm((f) => ({ ...f, driveDate: e.target.value }))} className="field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5"><Calendar size={11} className="inline mr-1" />Apply Deadline</label>
              <input type="date" value={form.applyDeadline} onChange={(e) => setForm((f) => ({ ...f, applyDeadline: e.target.value }))} className="field" />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Roles Offered</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Add role…" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }} className="field flex-1" />
              <button type="button" onClick={addRole} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition"><Plus size={16} /></button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    {r}<button type="button" onClick={() => setRoles((p) => p.filter((x) => x !== r))} className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-750 dark:hover:text-indigo-350"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stipend/CTC */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5"><IndianRupee size={11} className="inline mr-1" />Compensation</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-fg mb-1">Stipend ₹/mo</p>
                <div className="flex gap-1.5">
                  <input type="number" placeholder="Min" value={form.stipendMin} onChange={(e) => setForm((f) => ({ ...f, stipendMin: e.target.value }))} className="field py-2 px-3 text-sm" />
                  <input type="number" placeholder="Max" value={form.stipendMax} onChange={(e) => setForm((f) => ({ ...f, stipendMax: e.target.value }))} className="field py-2 px-3 text-sm" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-fg mb-1">CTC ₹/yr</p>
                <div className="flex gap-1.5">
                  <input type="number" placeholder="Min" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} className="field py-2 px-3 text-sm" />
                  <input type="number" placeholder="Max" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} className="field py-2 px-3 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Candidate Eligibility Criteria */}
          <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
              Candidate Eligibility Criteria
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Minimum CGPA */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Min CGPA Required</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 7.5 (Optional)"
                  value={form.minCgpa}
                  onChange={(e) => setForm((f) => ({ ...f, minCgpa: e.target.value }))}
                  className="field"
                />
              </div>

              {/* Target Years */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Eligible Year(s) of Study</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[1, 2, 3, 4].map((year) => {
                    const isSelected = eligibleYears.includes(year);
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setEligibleYears((prev) =>
                            isSelected ? prev.filter((y) => y !== year) : [...prev, year]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-surface border-base text-secondary hover:bg-surface-2"
                        }`}
                      >
                        Yr {year}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Branches */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Eligible Branches / Departments</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Mechanical..."
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = branchInput.trim();
                      if (trimmed && !eligibleBranches.includes(trimmed)) {
                        setEligibleBranches((prev) => [...prev, trimmed]);
                      }
                      setBranchInput("");
                    }
                  }}
                  className="field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = branchInput.trim();
                    if (trimmed && !eligibleBranches.includes(trimmed)) {
                      setEligibleBranches((prev) => [...prev, trimmed]);
                    }
                    setBranchInput("");
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition"
                >
                  <Plus size={16} />
                </button>
              </div>
              {eligibleBranches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {eligibleBranches.map((branch) => (
                    <span
                      key={branch}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400"
                    >
                      {branch}
                      <button
                        type="button"
                        onClick={() => setEligibleBranches((p) => p.filter((x) => x !== branch))}
                        className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-750 dark:hover:text-indigo-350"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message to TPO */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Message to TPO (optional)</label>
            <textarea
              placeholder="Briefly describe the opportunity and why you're interested in this college…"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
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
            {sendMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

