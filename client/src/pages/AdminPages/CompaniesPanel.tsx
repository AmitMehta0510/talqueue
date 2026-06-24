import { FormEvent, useState } from "react";
import { Building2, Plus, Loader2, ExternalLink, ChevronRight, X, Trash2, RefreshCw } from "lucide-react";
import { Company } from "../../lib/api";
import { useCompaniesQuery, useCreateCompanyMutation, useListCompanyAdminsQuery, useAdminTriggerCompanyDiscoveryMutation } from "../../hooks/usePlatformQueries";
import { cleanLogoUrl, userName } from "../../lib/format";
import { Avatar } from "../../components/ui";
import { SearchBar, UserSearchAutocomplete } from "./shared";
import { useFileUpload } from "../../hooks/useFileUpload";

export function CompaniesPanel({ selectedCompany, onSelectCompany, onRevokeAdmin, onAssignAdmin }: {
  selectedCompany: Company | null;
  onSelectCompany: (c: Company | null) => void;
  onRevokeAdmin: (companyId: string, userId: string, label: string, officeCity?: string) => void;
  onAssignAdmin: (companyId: string, userId: string, label: string, companyName: string, officeCity?: string) => void;
}) {
  const [search, setSearch] = useState("");
  const companiesQuery = useCompaniesQuery({ q: search, limit: 100 });
  const createCompany = useCreateCompanyMutation();
  const triggerDiscovery = useAdminTriggerCompanyDiscoveryMutation();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload();

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file, "avatar");
      setLogoUrl(res.fileUrl);
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCompany.mutateAsync({ name, websiteUrl: website || undefined, logoUrl: logoUrl || undefined, description: description || undefined });
      setName(""); setWebsite(""); setLogoUrl(""); setDescription("");
      setShowForm(false);
    } catch { }
  };

  const companies = companiesQuery.data?.companies || [];

  return (
    <div className="space-y-4">
      {/* Scraper Control Panel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-350">Scraper Control Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Discover and import new companies and their job boards from Greenhouse & Lever.</p>
        </div>
        <button
          id="run-company-scraper"
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
          onClick={() => triggerDiscovery.mutate()}
          disabled={triggerDiscovery.isPending}
        >
          {triggerDiscovery.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin text-white" />
              Discovering...
            </>
          ) : (
            <>
              <RefreshCw size={13} />
              Run Company Scraper
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Management</h2>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-indigo-600/40 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition"
          onClick={() => { setShowForm(!showForm); onSelectCompany(null); }}
        >
          <Plus size={12} /> Add Company
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search companies by name, description, industry..." />

      {showForm && (
        <div className="rounded-xl border border-indigo-600/20 bg-zinc-900/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-zinc-300">New Partner Company</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Company Name *</span>
              <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition" value={name} onChange={(e) => setName(e.target.value)} placeholder="Google, Microsoft..." required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Website URL</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <div className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Company Logo</span>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-lg object-contain bg-zinc-800 border border-zinc-700 p-0.5" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700" style={{ color: "var(--text-muted)" }}>
                      <Building2 size={14} />
                    </div>
                  )}
                  <label className="relative cursor-pointer rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/50 px-3 py-1.5 text-xs font-bold text-zinc-300 shadow-sm transition select-none flex-1 text-center">
                    {uploadingLogo ? (
                      <span className="flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin text-indigo-400" /> Uploading...</span>
                    ) : (
                      "Choose Logo"
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo || createCompany.isPending} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Description</span>
              <textarea className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition min-h-16 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief company description..." />
            </label>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50" type="submit" disabled={createCompany.isPending || uploadingLogo}>
                {createCompany.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add Company
              </button>
              <button type="button" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-2">
          {companiesQuery.isPending ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Building2 size={28} className="mb-3 text-zinc-600" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No companies listed yet.</p>
            </div>
          ) : companies.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCompany(selectedCompany?.id === c.id ? null : c)}
              className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md
                ${selectedCompany?.id === c.id ? "border-indigo-600/50 bg-indigo-500/5" : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {cleanLogoUrl(c.logoUrl) ? (
                    <img src={cleanLogoUrl(c.logoUrl)!} alt={c.name} className="h-8 w-8 rounded-lg object-contain bg-zinc-700" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-600/20">
                      <Building2 size={14} className="text-purple-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-white">{c.name}</div>
                    {c.description && <div className="text-[11px] text-zinc-500 truncate max-w-xs">{c.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.websiteUrl && (
                    <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-indigo-400 transition" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <ChevronRight size={12} className={`text-zinc-600 transition-transform ${selectedCompany?.id === c.id ? "rotate-90 text-indigo-400" : ""}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {selectedCompany && (
            <CompanyAdminPanel
              company={selectedCompany}
              onClose={() => onSelectCompany(null)}
              onRevoke={(userId, label, officeCity) => onRevokeAdmin(selectedCompany.id, userId, label, officeCity)}
              onAssign={(userId, label, officeCity) => onAssignAdmin(selectedCompany.id, userId, label, selectedCompany.name, officeCity)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyAdminPanel({ company, onClose, onRevoke, onAssign }: {
  company: Company;
  onClose: () => void;
  onRevoke: (userId: string, label: string, officeCity?: string) => void;
  onAssign: (userId: string, label: string, officeCity?: string) => void;
}) {
  const adminsQuery = useListCompanyAdminsQuery(company.id);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserLabel, setTargetUserLabel] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [adminType, setAdminType] = useState<"GLOBAL" | "OFFICE">("GLOBAL");

  const handleAssign = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    onAssign(
      targetUserId.trim(),
      targetUserLabel || targetUserId.trim(),
      adminType === "OFFICE" ? officeCity.trim() : undefined
    );
    setTargetUserId("");
    setTargetUserLabel("");
    setOfficeCity("");
  };

  const admins = adminsQuery.data || [];
  const globalAdmins = admins.filter((a: any) => !a.officeCity);
  const officeAdmins = admins.filter((a: any) => a.officeCity);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div>
          <h3 className="font-bold text-sm text-white">{company.name}</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Manage company administrators</p>
        </div>
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <form onSubmit={handleAssign} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-650">Assign New Admin</div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdminType("GLOBAL"); setOfficeCity(""); }}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                adminType === "GLOBAL"
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-600/30"
                  : "text-zinc-500 border-zinc-700 hover:text-zinc-200"
              }`}
            >
              Global Admin
            </button>
            <button
              type="button"
              onClick={() => setAdminType("OFFICE")}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                adminType === "OFFICE"
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-600/30"
                  : "text-zinc-500 border-zinc-700 hover:text-zinc-200"
              }`}
            >
              Office Scope
            </button>
          </div>

          <UserSearchAutocomplete
            value={targetUserId}
            onChange={(userId, label) => {
              setTargetUserId(userId);
              setTargetUserLabel(label);
            }}
            placeholder="Search user to assign as admin..."
          />

          {adminType === "OFFICE" && (
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition animate-in slide-in-from-top-1 duration-150"
              value={officeCity}
              onChange={(e) => setOfficeCity(e.target.value)}
              placeholder="Office City Scope (e.g. Bangalore, SF)..."
              required
            />
          )}

          <button className="w-full flex items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition" type="submit">
            <Plus size={11} /> Assign Admin
          </button>
        </form>

        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-650 mb-2">Assigned Admins ({admins.length})</div>
          {adminsQuery.isPending ? (
            <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-indigo-500" /></div>
          ) : admins.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No administrators assigned.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-3">
              {globalAdmins.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500/80 mb-1">Global Admins ({globalAdmins.length})</div>
                  {globalAdmins.map((admin: any) => {
                    const u = admin.user;
                    const label = userName(u);
                    return (
                      <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-800/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar user={u} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-white">{label}</div>
                            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{u.username}</div>
                          </div>
                        </div>
                        <button className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label, admin.officeCity)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {officeAdmins.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80 mb-1">Office Managers ({officeAdmins.length})</div>
                  {officeAdmins.map((admin: any) => {
                    const u = admin.user;
                    const label = userName(u);
                    return (
                      <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-800/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar user={u} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-white">{label}</div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1 flex-wrap">
                              <span>@{u.username}</span>
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.2 text-[8px] font-bold text-amber-400">
                                📍 {admin.officeCity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label, admin.officeCity)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
