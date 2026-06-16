import { useState, useRef, useEffect } from "react";
import { X, GraduationCap, Search, Loader2, Plus, Building2, Calendar, IndianRupee } from "lucide-react";
import { useSendDriveInviteMutation } from "../../hooks/usePlatformQueries";
import { useToast } from "../../contexts/ToastContext";
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
      currency: "INR",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-xl max-h-[95vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Invite a College</h2>
            <p className="text-xs text-slate-500 mt-0.5">Send a campus placement invite on behalf of <span className="font-semibold text-indigo-700">{companyName}</span></p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/70 text-slate-400 hover:text-slate-700 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* College Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <GraduationCap size={11} className="inline mr-1" />Target College *
            </label>
            {selectedCollege ? (
              <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">{selectedCollege.name}</p>
                  {selectedCollege.city && <p className="text-xs text-indigo-500">{selectedCollege.city}, {selectedCollege.state}</p>}
                </div>
                <button type="button" onClick={() => { setSelectedCollege(null); setCollegeQuery(""); }} className="text-indigo-400 hover:text-indigo-700">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search colleges by name…"
                  value={collegeQuery}
                  onChange={(e) => setCollegeQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {collegeLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                {collegeSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {collegeSuggestions.map((col) => (
                      <li key={col.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedCollege(col); setCollegeQuery(""); setCollegeSuggestions([]); }}
                          className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-indigo-50 text-sm text-left transition"
                        >
                          <GraduationCap size={13} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-800">{col.name}</p>
                            {col.city && <p className="text-xs text-slate-400">{col.city}, {col.state}</p>}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drive Title *</label>
            <input
              type="text"
              placeholder="e.g. Graduate Engineer Campus Drive 2025"
              value={form.driveTitle}
              onChange={(e) => setForm((f) => ({ ...f, driveTitle: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5"><Calendar size={11} className="inline mr-1" />Drive Date</label>
              <input type="date" value={form.driveDate} onChange={(e) => setForm((f) => ({ ...f, driveDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5"><Calendar size={11} className="inline mr-1" />Apply Deadline</label>
              <input type="date" value={form.applyDeadline} onChange={(e) => setForm((f) => ({ ...f, applyDeadline: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Roles Offered</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Add role…" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }} className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="button" onClick={addRole} className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"><Plus size={16} /></button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {r}<button type="button" onClick={() => setRoles((p) => p.filter((x) => x !== r))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stipend/CTC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5"><IndianRupee size={11} className="inline mr-1" />Compensation</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Stipend ₹/mo</p>
                <div className="flex gap-1.5">
                  <input type="number" placeholder="Min" value={form.stipendMin} onChange={(e) => setForm((f) => ({ ...f, stipendMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" placeholder="Max" value={form.stipendMax} onChange={(e) => setForm((f) => ({ ...f, stipendMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">CTC ₹/yr</p>
                <div className="flex gap-1.5">
                  <input type="number" placeholder="Min" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" placeholder="Max" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Message to TPO */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message to TPO (optional)</label>
            <textarea
              placeholder="Briefly describe the opportunity and why you're interested in this college…"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
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
            type="button"
            onClick={handleSubmit}
            disabled={sendMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
          >
            {sendMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={14} />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
