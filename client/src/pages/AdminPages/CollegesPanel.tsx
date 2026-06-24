import React, { useState, FormEvent, useEffect } from "react";
import {
  Plus, Loader2, GraduationCap, ExternalLink, ChevronRight, X, Trash2, Upload, Search, ChevronLeft, Building2, ShieldAlert,
} from "lucide-react";
import {
  useAdminCollegesQuery,
  useSearchCollegesQuery,
  useCreateCollegeMutation,
  useListCollegeAdminsQuery,
  useAdminDepartmentsQuery,
  useAdminCreateDepartmentMutation,
  useImportCollegesMutation,
  useDeleteCollegeMutation,
} from "../../hooks/usePlatformQueries";
import { Avatar } from "../../components/ui";
import { cleanLogoUrl, userName } from "../../lib/format";
import { College } from "../../lib/api";
import { fmtDate, UserSearchAutocomplete } from "./shared";

export function CollegesPanel({
  selectedCollege,
  onSelectCollege,
  onRevokeAdmin,
  onAssignAdmin,
}: {
  selectedCollege: College | null;
  onSelectCollege: (c: College | null) => void;
  onRevokeAdmin: (collegeId: string, userId: string, label: string) => void;
  onAssignAdmin: (collegeId: string, userId: string, label: string, collegeName: string) => void;
}) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<string[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const limit = 15;
  const collegesQuery = useAdminCollegesQuery(limit, cursor);
  const searchCollegesQuery = useSearchCollegesQuery(debouncedSearch);

  const createCollege = useCreateCollegeMutation();
  const importColleges = useImportCollegesMutation();
  const deleteCollege = useDeleteCollegeMutation();

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;
        const parsed = JSON.parse(text);
        const payload = Array.isArray(parsed) ? parsed : parsed.colleges;
        if (!payload || !Array.isArray(payload)) {
          alert("Invalid JSON format. Expected an array of colleges or a { colleges: [...] } wrapper.");
          return;
        }

        const mappedPayload = payload.map((item: any) => {
          if (item.college && !item.name) {
            return {
              name: item.college,
              city: item.district || item.city || undefined,
              state: item.state || undefined,
              country: "India",
              emailDomains: item.emailDomains || [],
              website: item.website || undefined,
              logoUrl: item.logoUrl || undefined,
            };
          }
          return item;
        });

        await importColleges.mutateAsync(mappedPayload);
      } catch (err: any) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCollege.mutateAsync({
        name, city: city || undefined, state: state || undefined,
        website: website || undefined, logoUrl: logoUrl || undefined,
      });
      setName(""); setCity(""); setState(""); setWebsite(""); setLogoUrl("");
      setShowForm(false);
      setCursor(undefined);
      setHistory([]);
    } catch { }
  };

  const handleNext = () => {
    const nextCursor = collegesQuery.data?.nextCursor;
    if (nextCursor) {
      setHistory((prev) => [...prev, cursor || ""]);
      setCursor(nextCursor);
    }
  };

  const handlePrev = () => {
    setHistory((prev) => {
      const copy = [...prev];
      const prevCursor = copy.pop();
      setCursor(prevCursor === "" ? undefined : prevCursor);
      return copy;
    });
  };

  // Determine which list to display
  const isSearching = debouncedSearch.length >= 2;
  const colleges = isSearching
    ? searchCollegesQuery.data || []
    : collegesQuery.data?.colleges || [];

  const isLoading = isSearching ? searchCollegesQuery.isPending : collegesQuery.isPending;

  return (
    <div className="space-y-6">
      {/* Header section with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="text-emerald-500" size={22} />
            Colleges Catalog
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Manage institutional details, administrators, and departments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition duration-200">
            {importColleges.isPending ? (
              <Loader2 size={14} className="animate-spin text-emerald-500" />
            ) : (
              <Upload size={14} className="text-zinc-400" />
            )}
            Bulk Import (JSON)
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleJsonUpload}
              disabled={importColleges.isPending}
            />
          </label>
          <button
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-900/30 transition duration-200"
            onClick={() => { setShowForm(!showForm); onSelectCollege(null); }}
          >
            <Plus size={14} /> Add Institution
          </button>
        </div>
      </div>

      {/* Form to Add College */}
      {showForm && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 backdrop-blur-md shadow-2xl ring-1 ring-white/5 transition-all">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Add New College</h3>
            <button className="text-zinc-500 hover:text-zinc-300 transition" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="md:col-span-2 block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Institution Name *</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition duration-200" value={name} onChange={(e) => setName(e.target.value)} placeholder="IIT Delhi, IIM Ahmedabad..." required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>City</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition duration-200" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New Delhi" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>State</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition duration-200" value={state} onChange={(e) => setState(e.target.value)} placeholder="Delhi" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Website URL</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition duration-200" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Logo Image URL</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition duration-200" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
              <button type="button" className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition duration-200" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition duration-200 disabled:opacity-50" type="submit" disabled={createCollege.isPending}>
                {createCollege.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add College
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          className="w-full rounded-xl border border-zinc-850 bg-zinc-900/40 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-sm focus:border-zinc-700 focus:ring-0 focus:outline-none transition"
          placeholder="Filter colleges by name or location..."
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            setCursor(undefined);
            setHistory([]);
          }}
        />
        {searchVal && (
          <button
            onClick={() => { setSearchVal(""); setCursor(undefined); setHistory([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] items-start">
        {/* College List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Retrieving institutions...</p>
            </div>
          ) : colleges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/20">
              <GraduationCap size={36} className="mb-3 text-zinc-700" />
              <p className="text-sm font-bold text-zinc-400">No colleges matched.</p>
              <p className="text-xs text-zinc-600 mt-1">Try refining your search text or add a new college.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3">
                {colleges.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCollege(selectedCollege?.id === c.id ? null : c)}
                    className={`group cursor-pointer rounded-2xl border p-4.5 transition-all duration-300 hover:shadow-lg
                      ${selectedCollege?.id === c.id 
                        ? "border-emerald-500/50 bg-emerald-500/5 shadow-emerald-950/10" 
                        : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 hover:bg-zinc-800/40 hover:-translate-y-0.5"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        {cleanLogoUrl(c.logoUrl) ? (
                          <img src={cleanLogoUrl(c.logoUrl)!} alt={c.name} className="h-10 w-10 rounded-xl object-contain bg-zinc-800 p-1.5 border border-zinc-700/60" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-indigo-500/20">
                            <GraduationCap size={16} className="text-indigo-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">{c.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <span className="truncate">{[c.city, c.state].filter(Boolean).join(", ") || "Unknown Location"}</span>
                            {c.country && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-zinc-700"></span>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-600">{c.country}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 shrink-0 text-[11px]">
                        <div className="hidden sm:flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-800 text-zinc-400">{c._count?.departments ?? 0} depts</span>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-800 text-zinc-400">{c._count?.profiles ?? 0} students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition" onClick={(e) => e.stopPropagation()} title="Open Website">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete ${c.name}? All departments will be deleted, and students' colleges will be set to None.`)) {
                                deleteCollege.mutate(c.id);
                              }
                            }}
                            disabled={deleteCollege.isPending}
                            title="Delete College"
                          >
                            {deleteCollege.isPending && deleteCollege.variables === c.id ? (
                              <Loader2 size={13} className="animate-spin text-rose-500" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                          <ChevronRight size={14} className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-300 ${selectedCollege?.id === c.id ? "rotate-90 text-emerald-400 group-hover:text-emerald-400" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {!isSearching && (collegesQuery.data?.hasNextPage || history.length > 0) && (
                <div className="flex items-center justify-between border-t border-zinc-850 pt-4 mt-2">
                  <button
                    onClick={handlePrev}
                    disabled={history.length === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Page {history.length + 1}</span>
                  <button
                    onClick={handleNext}
                    disabled={!collegesQuery.data?.hasNextPage}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40 transition"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* College Details Panel (Admins/Departments) */}
        <div>
          {selectedCollege ? (
            <CollegeDetailPanel
              college={selectedCollege}
              onClose={() => onSelectCollege(null)}
              onRevoke={(userId, label) => onRevokeAdmin(selectedCollege.id, userId, label)}
              onAssign={(userId, label) => onAssignAdmin(selectedCollege.id, userId, label, selectedCollege.name)}
            />
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center p-8 rounded-2xl border border-zinc-850 bg-zinc-900/20 text-center text-zinc-500 min-h-[300px]">
              <Building2 size={28} className="mb-3 text-zinc-700" />
              <p className="text-xs font-semibold">No college selected</p>
              <p className="text-[11px] text-zinc-650 max-w-[15rem] mt-1">Select an institution to manage its departments and administrator roles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollegeDetailPanel({
  college,
  onClose,
  onRevoke,
  onAssign,
}: {
  college: College;
  onClose: () => void;
  onRevoke: (userId: string, label: string) => void;
  onAssign: (userId: string, label: string) => void;
}) {
  const adminsQuery = useListCollegeAdminsQuery(college.id);
  const deptQuery = useAdminDepartmentsQuery(college.id);
  const createDept = useAdminCreateDepartmentMutation();

  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserLabel, setTargetUserLabel] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptHod, setDeptHod] = useState("");

  const [activeSection, setActiveSection] = useState<"admins" | "departments">("admins");

  const handleAssignAdmin = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    onAssign(targetUserId.trim(), targetUserLabel || targetUserId.trim());
    setTargetUserId("");
    setTargetUserLabel("");
  };

  const handleCreateDept = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      await createDept.mutateAsync({ collegeId: college.id, name: deptName.trim(), hod: deptHod.trim() || undefined });
      setDeptName(""); setDeptHod("");
    } catch { }
  };

  const admins = adminsQuery.data || [];
  const departments = deptQuery.data || [];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-xl sticky top-20">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-zinc-850 px-5 py-4 bg-zinc-900/20">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-white truncate">{college.name}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{[college.city, college.state].filter(Boolean).join(", ")}</p>
        </div>
        <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-850 hover:text-zinc-200 transition" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Sub-section Toggle */}
      <div className="flex border-b border-zinc-850 bg-zinc-900/10">
        {(["admins", "departments"] as const).map((s) => (
          <button
            key={s}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all
              ${activeSection === s ? "border-b border-emerald-500 text-emerald-400 bg-emerald-500/5" : "text-zinc-500 hover:text-zinc-200"}`}
            onClick={() => setActiveSection(s)}
          >
            {s === "admins" ? `Admins (${admins.length})` : `Departments (${departments.length})`}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {/* Administrators Section */}
        {activeSection === "admins" && (
          <>
            <form onSubmit={handleAssignAdmin} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <UserSearchAutocomplete
                  value={targetUserId}
                  onChange={(userId, label) => {
                    setTargetUserId(userId);
                    setTargetUserLabel(label);
                  }}
                  placeholder="Assign user as admin..."
                />
              </div>
              <button className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-950/20" type="submit">
                <Plus size={12} /> Assign
              </button>
            </form>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Assigned Administrators</div>
              
              {adminsQuery.isPending ? (
                <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-emerald-500" /></div>
              ) : admins.length === 0 ? (
                <div className="flex flex-col items-center py-6 border border-dashed border-zinc-850 rounded-xl bg-zinc-900/10">
                  <ShieldAlert size={18} className="text-zinc-650 mb-1.5" />
                  <p className="text-[11px] text-zinc-600 italic">No college administrators assigned.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {admins.map((admin: any) => {
                    const u = admin.user;
                    const label = userName(u);
                    return (
                      <div key={admin.id} className="flex items-center justify-between rounded-xl border border-zinc-850/60 bg-zinc-900/20 px-3.5 py-2.5 hover:border-zinc-800 transition duration-150">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar user={u} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{label}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">@{u.username}</div>
                          </div>
                        </div>
                        <button className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label)} title="Revoke Admin permissions">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Departments Section */}
        {activeSection === "departments" && (
          <>
            <form onSubmit={handleCreateDept} className="space-y-2.5 bg-zinc-900/10 border border-zinc-850/60 rounded-2xl p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Create Department</div>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name (e.g. Computer Science)"
                required
              />
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                value={deptHod}
                onChange={(e) => setDeptHod(e.target.value)}
                placeholder="Head of Department (optional)"
              />
              <button className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createDept.isPending}>
                {createDept.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Create Department
              </button>
            </form>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Departments</div>
              
              {deptQuery.isPending ? (
                <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-emerald-500" /></div>
              ) : departments.length === 0 ? (
                <div className="flex flex-col items-center py-6 border border-dashed border-zinc-850 rounded-xl bg-zinc-900/10">
                  <GraduationCap size={18} className="text-zinc-650 mb-1.5" />
                  <p className="text-[11px] text-zinc-600 italic">No departments created yet.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {departments.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl border border-zinc-850/60 bg-zinc-900/20 px-3.5 py-2.5 hover:border-zinc-800 transition">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{d.name}</div>
                        {d.hod && <div className="text-[10px] text-zinc-500 mt-0.5 truncate">HOD: {d.hod}</div>}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-medium shrink-0">{fmtDate(d.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
