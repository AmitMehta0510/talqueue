import React, { useState, FormEvent } from "react";
import {
  Plus, Loader2, GraduationCap, ExternalLink, ChevronRight, X, Trash2, Upload,
} from "lucide-react";
import {
  useCollegesQuery,
  useCreateCollegeMutation,
  useListCollegeAdminsQuery,
  useAdminDepartmentsQuery,
  useAdminCreateDepartmentMutation,
  useImportCollegesMutation,
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
  const collegesQuery = useCollegesQuery(100);
  const createCollege = useCreateCollegeMutation();
  const importColleges = useImportCollegesMutation();

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

        await importColleges.mutateAsync(payload);
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
  const [showForm, setShowForm] = useState(false);

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
    } catch { }
  };

  const colleges = collegesQuery.data?.pages?.flatMap((p) => p.colleges) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">College Management</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-bold text-zinc-300 hover:border-zinc-500 hover:text-white transition">
            {importColleges.isPending ? (
              <Loader2 size={12} className="animate-spin text-emerald-500" />
            ) : (
              <Upload size={12} />
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
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
            onClick={() => { setShowForm(!showForm); onSelectCollege(null); }}
          >
            <Plus size={12} /> Add College
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-zinc-300">New College</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Name *</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={name} onChange={(e) => setName(e.target.value)} placeholder="IIT Delhi, IIM Ahmedabad..." required />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">City</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New Delhi" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">State</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={state} onChange={(e) => setState(e.target.value)} placeholder="Delhi" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Website</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Logo URL</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createCollege.isPending}>
                {createCollege.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add College
              </button>
              <button type="button" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* College List */}
        <div className="space-y-2">
          {collegesQuery.isPending ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
          ) : colleges.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <GraduationCap size={28} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No colleges listed yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {colleges.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCollege(selectedCollege?.id === c.id ? null : c)}
                  className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md
                    ${selectedCollege?.id === c.id ? "border-emerald-600/50 bg-emerald-500/5" : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {cleanLogoUrl(c.logoUrl) ? (
                        <img src={cleanLogoUrl(c.logoUrl)!} alt={c.name} className="h-8 w-8 rounded-lg object-contain bg-zinc-700" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/20">
                          <GraduationCap size={14} className="text-indigo-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-white">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{[c.city, c.state].filter(Boolean).join(", ") || "No location"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span>{c._count?.departments ?? 0} depts</span>
                      <span>{c._count?.profiles ?? 0} students</span>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={10} />
                        </a>
                      )}
                      <ChevronRight size={12} className={`transition-transform ${selectedCollege?.id === c.id ? "rotate-90 text-emerald-400" : ""}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* College Admin Panel */}
        <div>
          {selectedCollege && (
            <CollegeDetailPanel
              college={selectedCollege}
              onClose={() => onSelectCollege(null)}
              onRevoke={(userId, label) => onRevokeAdmin(selectedCollege.id, userId, label)}
              onAssign={(userId, label) => onAssignAdmin(selectedCollege.id, userId, label, selectedCollege.name)}
            />
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
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div>
          <h3 className="font-bold text-sm text-white">{college.name}</h3>
          <p className="text-[11px] text-zinc-500">{[college.city, college.state].filter(Boolean).join(", ")}</p>
        </div>
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Sub-section Toggle */}
      <div className="flex border-b border-zinc-800/60">
        {(["admins", "departments"] as const).map((s) => (
          <button
            key={s}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all
              ${activeSection === s ? "border-b-2 border-emerald-500 text-emerald-400" : "text-zinc-500 hover:text-zinc-200"}`}
            onClick={() => setActiveSection(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {activeSection === "admins" && (
          <>
            <form onSubmit={handleAssignAdmin} className="flex gap-2">
              <UserSearchAutocomplete
                value={targetUserId}
                onChange={(userId, label) => {
                  setTargetUserId(userId);
                  setTargetUserLabel(label);
                }}
                placeholder="Search user to assign as admin..."
              />
              <button className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition" type="submit">
                <Plus size={11} /> Add
              </button>
            </form>

            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Assigned Admins ({admins.length})</div>
              {adminsQuery.isPending ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-emerald-500" /></div> :
               admins.length === 0 ? <p className="text-xs text-zinc-600 italic">No administrators assigned.</p> : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {admins.map((admin: any) => {
                    const u = admin.user;
                    const label = userName(u);
                    return (
                      <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar user={u} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-white">{label}</div>
                            <div className="text-[10px] text-zinc-500">@{u.username}</div>
                          </div>
                        </div>
                        <button className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label)}>
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

        {activeSection === "departments" && (
          <>
            <form onSubmit={handleCreateDept} className="space-y-2">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name (e.g. Computer Science)"
                required
              />
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                value={deptHod}
                onChange={(e) => setDeptHod(e.target.value)}
                placeholder="Head of Department (optional)"
              />
              <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createDept.isPending}>
                {createDept.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Create Department
              </button>
            </form>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Departments ({departments.length})</div>
              {deptQuery.isPending ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-emerald-500" /></div> :
               departments.length === 0 ? <p className="text-xs text-zinc-600 italic">No departments yet.</p> : (
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {departments.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-white">{d.name}</div>
                        {d.hod && <div className="text-[10px] text-zinc-500">HOD: {d.hod}</div>}
                      </div>
                      <div className="text-[10px] text-zinc-600">{fmtDate(d.createdAt)}</div>
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
