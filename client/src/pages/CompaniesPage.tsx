import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  ExternalLink,
  Github,
  Info,
  Linkedin,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
  Star,
  ArrowLeft,
  TrendingUp,
  ChevronRight,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Avatar, EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  useCompaniesQuery,
  useCompanyEmployeesQuery,
  useCompanyQuery,
  useCreateCompanyMutation,
  useSuggestedCompaniesQuery,
  useRequestCompanyRegistrationMutation,
  useFollowCompanyMutation,
  useUnfollowCompanyMutation,
} from "../hooks/usePlatformQueries";
import { Company, CompanySize, CompanyType, User } from "../lib/api";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";
import { useFileUpload } from "../hooks/useFileUpload";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  compactPayload,
  formatCount,
  formatDate,
  titleCase,
  userHeadline,
  userName,
  cleanLogoUrl,
  parseJobTitle,
} from "../lib/format";

const companyTypes: CompanyType[] = [
  "STARTUP", "PRODUCT_BASED", "SERVICE_BASED", "MNC", "OTHER",
];
const companySizes: CompanySize[] = [
  "SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE",
];

// Role helpers
const SUPER_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);
function isSuperOrPlatformAdmin(user: any): boolean {
  if (!user?.roles) return false;
  return (user.roles as Array<{ role?: { name?: string } }>).some(
    (r) => r.role?.name && SUPER_ADMIN_ROLES.has(r.role.name)
  );
}

const TYPE_COLOR: Record<string, string> = {
  STARTUP:       "bg-violet-50 text-violet-700 border-violet-200",
  PRODUCT_BASED: "bg-blue-50 text-blue-700 border-blue-200",
  SERVICE_BASED: "bg-teal-50 text-teal-700 border-teal-200",
  ENTERPRISE:    "bg-amber-50 text-amber-700 border-amber-200",
  MNC:           "bg-rose-50 text-rose-700 border-rose-200",
  OTHER:         "bg-slate-50 text-slate-600 border-slate-200",
};

// ---------------------------------------------------------------------------
// Company Logo
// ---------------------------------------------------------------------------
function CompanyLogo({ company, size = "md" }: { company: Company; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-16 w-16" };
  const dim = dims[size];
  const logoUrl = cleanLogoUrl(company.logoUrl);
  if (logoUrl) {
    return <img className={`${dim} rounded-xl object-cover`} style={{ border: "1px solid var(--border)" }} src={logoUrl} alt={company.name} />;
  }
  return (
    <div className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl`} style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
      <Building2 size={size === "lg" ? 28 : size === "md" ? 22 : 16} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Naukri-style Company Card
// ---------------------------------------------------------------------------
function CompanyCard({ company }: { company: Company }) {
  const { user } = useAuth();
  const followMutation = useFollowCompanyMutation();
  const unfollowMutation = useUnfollowCompanyMutation();
  const typeColor = TYPE_COLOR[company.type ?? "OTHER"] ?? TYPE_COLOR.OTHER;
  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

  // Local optimistic state — decoupled from the list-cache prop so the button
  // reflects the action immediately without waiting for the list re-fetch.
  const [isFollowing, setIsFollowing] = useState(!!company.isFollowing);

  // Sync when the server data arrives (after invalidation re-fetch).
  useEffect(() => {
    setIsFollowing(!!company.isFollowing);
  }, [company.isFollowing]);

  const handleCardFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isFollowPending) return;
    if (isFollowing) {
      setIsFollowing(false);
      unfollowMutation.mutate(
        { companyId: company.id, slug: company.slug, companyName: company.name },
        { onError: () => setIsFollowing(true) },
      );
    } else {
      setIsFollowing(true);
      followMutation.mutate(
        { companyId: company.id, slug: company.slug, companyName: company.name },
        { onError: () => setIsFollowing(false) },
      );
    }
  };

  return (
    <Link
      to={`/companies/${company.slug}`}
      className="group flex flex-col rounded-xl border p-4 transition hover:shadow-md"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Logo + Name */}
      <div className="flex items-start gap-3">
        <CompanyLogo company={company} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="truncate text-sm font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" style={{ color: "var(--text-primary)" }}>
              {company.name}
            </h3>
            {company.verified && <ShieldCheck size={13} className="shrink-0 text-indigo-500" />}
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>
            {company.tagline || company.industry || "Technology Company"}
          </p>
        </div>
        {/* Follow button on card — stop propagation so card link doesn't fire */}
        {user && (
          <button
            type="button"
            onClick={handleCardFollow}
            disabled={isFollowPending}
            title={isFollowing ? "Following" : "Follow"}
            className={`shrink-0 flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-all duration-150 ${
              isFollowing
                ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
            }`}
          >
            {isFollowPending ? (
              <Loader2 size={10} className="animate-spin" />
            ) : isFollowing ? (
              <><UserCheck size={10} /> Following</>
            ) : (
              <><UserPlus size={10} /> Follow</>
            )}
          </button>
        )}
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {company.type && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeColor}`}>
            {titleCase(company.type)}
          </span>
        )}
        {company.headquarters && (
          <span className="flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
            <MapPin size={9} /> {company.headquarters}
          </span>
        )}
        {company.hiringEnabled && (
          <span className="rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
            Hiring
          </span>
        )}
        {company.referralEnabled && (
          <span className="rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
            Referrals
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <BriefcaseBusiness size={11} />
          <strong style={{ color: "var(--text-primary)" }}>{formatCount(company._count?.jobs)}</strong> {company._count?.jobs === 1 ? "Job" : "Jobs"}
        </span>
        <span className="flex items-center gap-1">
          <Users size={11} />
          <strong style={{ color: "var(--text-primary)" }}>{formatCount(company._count?.experiences)}</strong> {company._count?.experiences === 1 ? "employee" : "employees"} on Eng Hub
        </span>
        {company.rating != null && (
          <span className="flex items-center gap-1 ml-auto">
            <Star size={11} className="text-amber-400" />
            <strong style={{ color: "var(--text-secondary)" }}>{company.rating.toFixed(1)}</strong>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
        View company <ChevronRight size={13} className="ml-0.5" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Create Company Panel (admin / super-admin)
// ---------------------------------------------------------------------------
function CreateCompanyModal({ onClose }: { onClose: () => void }) {
  const createCompany = useCreateCompanyMutation();
  const [form, setForm] = useState({
    name: "", tagline: "", description: "", headquarters: "", industry: "",
    websiteUrl: "", careersPageUrl: "", logoUrl: "", coverImageUrl: "", githubUrl: "",
    foundedYear: "", type: "" as "" | CompanyType, size: "" as "" | CompanySize,
    hiringEnabled: true, referralEnabled: true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload();
  const { upload: uploadCover, uploading: uploadingCover } = useFileUpload();

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file, "avatar");
      set("logoUrl", res.fileUrl);
    } catch {}
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCover(file, "avatar");
      set("coverImageUrl", res.fileUrl);
    } catch {}
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createCompany.mutateAsync({
        name: form.name,
        ...compactPayload({
          tagline: form.tagline, description: form.description, headquarters: form.headquarters,
          industry: form.industry, websiteUrl: form.websiteUrl, careersPageUrl: form.careersPageUrl,
          logoUrl: form.logoUrl, coverImageUrl: form.coverImageUrl, githubUrl: form.githubUrl,
          type: form.type || undefined, size: form.size || undefined,
        }),
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        hiringEnabled: form.hiringEnabled,
        referralEnabled: form.referralEnabled,
      });
      onClose();
    } catch { return; }
  };

  const isUploading = uploadingLogo || uploadingCover;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Add Company</h2>
          <button onClick={onClose} type="button" className="icon-btn"><X size={16} /></button>
        </div>
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_10rem]">
            <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Company name *" required />
            <input className="field" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Tagline" />
            <input className="field" type="number" min={1800} value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="Founded" />
          </div>
          <textarea className="field min-h-20 resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description" />
          <div className="grid gap-3 md:grid-cols-4">
            <input className="field" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Industry" />
            <input className="field" value={form.headquarters} onChange={(e) => set("headquarters", e.target.value)} placeholder="HQ City" />
            <select className="field" value={form.type} onChange={(e) => set("type", e.target.value as "" | CompanyType)}>
              <option value="">Type</option>
              {companyTypes.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
            <select className="field" value={form.size} onChange={(e) => set("size", e.target.value as "" | CompanySize)}>
              <option value="">Size</option>
              {companySizes.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="field" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="Website URL" />
            <input className="field" value={form.careersPageUrl} onChange={(e) => set("careersPageUrl", e.target.value)} placeholder="Careers URL" />
            <input className="field" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="GitHub URL" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 rounded-xl border p-4" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Logo</label>
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain p-0.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <Building2 size={16} />
                  </div>
                )}
                <label className="relative cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition select-none" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
                  {uploadingLogo ? (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin text-blue-600" /> Uploading...</span>
                  ) : (
                    "Choose Logo"
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoChange} disabled={isUploading || createCompany.isPending} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cover Banner</label>
              <div className="flex items-center gap-3">
                {form.coverImageUrl ? (
                  <img src={form.coverImageUrl} alt="Cover" className="h-12 w-24 rounded-lg object-cover" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                ) : (
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-slate-200 dark:border-slate-700 text-[10px] text-indigo-400 font-semibold">
                    No Cover
                  </div>
                )}
                <label className="relative cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition select-none" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
                  {uploadingCover ? (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin text-blue-600" /> Uploading...</span>
                  ) : (
                    "Choose Cover"
                  )}
                  <input type="file" accept="image/*" onChange={handleCoverChange} disabled={isUploading || createCompany.isPending} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.hiringEnabled} onChange={(e) => set("hiringEnabled", e.target.checked)} className="accent-blue-600" />
              Hiring enabled
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.referralEnabled} onChange={(e) => set("referralEnabled", e.target.checked)} className="accent-blue-600" />
              Referrals enabled
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createCompany.isPending || isUploading}>
              {createCompany.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Save Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request Company Registration Modal (normal users)
// ---------------------------------------------------------------------------
function RequestCompanyModal({ onClose }: { onClose: () => void }) {
  const requestCompany = useRequestCompanyRegistrationMutation();
  const [form, setForm] = useState({
    name: "", tagline: "", description: "", headquarters: "", industry: "",
    websiteUrl: "", careersPageUrl: "", logoUrl: "", githubUrl: "",
    foundedYear: "", type: "" as "" | CompanyType, size: "" as "" | CompanySize,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const { upload, uploading } = useFileUpload();

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await upload(file, "avatar");
      set("logoUrl", res.fileUrl);
    } catch {}
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await requestCompany.mutateAsync({
        name: form.name,
        ...compactPayload({
          tagline: form.tagline, description: form.description, headquarters: form.headquarters,
          industry: form.industry, websiteUrl: form.websiteUrl, careersPageUrl: form.careersPageUrl,
          logoUrl: form.logoUrl, githubUrl: form.githubUrl,
          type: form.type || undefined, size: form.size || undefined,
        }),
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
      });
      onClose();
    } catch { return; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Request Company Registration</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Submit details of your company for platform admin review.</p>
          </div>
          <button onClick={onClose} type="button" className="icon-btn"><X size={16} /></button>
        </div>
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_10rem]">
            <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Company name *" required />
            <input className="field" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Tagline" />
            <input className="field" type="number" min={1800} value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="Founded Year" />
          </div>
          <textarea className="field min-h-24 resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Tell us about the company (description)" />
          <div className="grid gap-3 md:grid-cols-4">
            <input className="field" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Industry (e.g. Fintech)" />
            <input className="field" value={form.headquarters} onChange={(e) => set("headquarters", e.target.value)} placeholder="HQ City" />
            <select className="field" value={form.type} onChange={(e) => set("type", e.target.value as "" | CompanyType)}>
              <option value="">Type</option>
              {companyTypes.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
            <select className="field" value={form.size} onChange={(e) => set("size", e.target.value as "" | CompanySize)}>
              <option value="">Size</option>
              {companySizes.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="field" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="Website URL" />
            <input className="field" value={form.careersPageUrl} onChange={(e) => set("careersPageUrl", e.target.value)} placeholder="Careers Page URL" />
            <input className="field" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="GitHub URL" />
          </div>

          <div className="rounded-xl border p-4 space-y-2" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company Logo</label>
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain p-0.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <Building2 size={16} />
                </div>
              )}
              <label className="relative cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition select-none" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
                {uploading ? (
                  <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin text-blue-600" /> Uploading...</span>
                ) : (
                  "Choose Logo"
                )}
                <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading || requestCompany.isPending} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={requestCompany.isPending || uploading}>
              {requestCompany.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Detail Page
// ---------------------------------------------------------------------------
function CompanyDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const companyQuery = useCompanyQuery(slug);
  const company = companyQuery.data;
  const [employeePage, setEmployeePage] = useState(1);
  const [selectedReferralUser, setSelectedReferralUser] = useState<User | null>(null);
  const employeesQuery = useCompanyEmployeesQuery(company?.id, employeePage, 10);
  const employees = employeesQuery.data?.employees || [];

  const followMutation = useFollowCompanyMutation();
  const unfollowMutation = useUnfollowCompanyMutation();
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);

  const isGlobalCompanyAdmin = useMemo(() => {
    if (!user || !company) return false;
    return user.companyAdminships?.some(
      (a) => a.companyId === company.id && !a.officeCity
    );
  }, [user, company]);

  const handleFollowToggle = () => {
    if (!user) {
      showToast("error", "Please log in to follow companies");
      return;
    }
    if (!company) return;
    if (company.isFollowing) {
      // Show confirm dialog before unfollowing
      setShowUnfollowDialog(true);
    } else {
      followMutation.mutate({ companyId: company.id, slug: company.slug, companyName: company.name });
    }
  };

  const handleConfirmUnfollow = () => {
    if (!company) return;
    unfollowMutation.mutate(
      { companyId: company.id, slug: company.slug, companyName: company.name },
      { onSettled: () => setShowUnfollowDialog(false) }
    );
  };

  if (companyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--bg-surface-2)" }} />
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--bg-surface-2)" }} />
          <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--bg-surface-2)" }} />
        </div>
      </div>
    );
  }

  if (!company) {
    return <EmptyState icon={Building2} title="Company not found" text="This company doesn't exist or has been removed." />;
  }

  return (
    <section className="space-y-5">
      {/* Back link */}
      <Link
        to="/companies"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
      >
        <ArrowLeft size={14} /> Back to Companies
      </Link>

      {/* ── Hero ── */}
      <div className="overflow-hidden rounded-2xl shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        {company.coverImageUrl ? (
          <img className="h-44 w-full object-cover sm:h-56" src={company.coverImageUrl} alt={company.name} />
        ) : (
          <div
            className="h-44 w-full sm:h-56"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)" }}
          />
        )}
        <div className="px-6 pb-6">
          {/* Logo overlapping banner */}
          <div className="-mt-8 mb-3">
            <CompanyLogo company={company} size="lg" />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{company.name}</h1>
                {company.verified && <ShieldCheck size={18} className="text-indigo-500" />}
                {company.type && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${TYPE_COLOR[company.type] ?? TYPE_COLOR.OTHER}`}>
                    {titleCase(company.type)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {[company.industry, company.headquarters].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Follow/Following Button */}
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  company.isFollowing
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600"
                    : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:shadow-sm"
                }`}
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <Loader2 className="animate-spin text-current" size={13} />
                ) : company.isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </button>


              {company.websiteUrl && (
                <a className="btn-secondary" href={company.websiteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Website
                </a>
              )}
              {company.githubUrl && (
                <a className="icon-btn" href={company.githubUrl} target="_blank" rel="noreferrer" title="GitHub">
                  <Github size={15} />
                </a>
              )}
            </div>
          </div>

          {company.description && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{company.description}</p>
          )}

          {/* Key metrics */}
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl p-4 sm:grid-cols-4 lg:grid-cols-7" style={{ background: "var(--bg-surface-2)" }}>
            <Metric label="Followers" value={formatCount(company._count?.followers ?? 0)} />
            <Metric label="Open Jobs" value={formatCount(company._count?.jobs)} />
            <Metric label="Employees on Eng Hub" value={formatCount(company._count?.experiences)} />
            <Metric label="Referrals" value={formatCount(company._count?.referralRequests)} />
            <Metric label="Rating" value={company.rating ? `${company.rating.toFixed(1)} ★` : "New"} />
            <Metric label="Founded" value={company.foundedYear?.toString() || "—"} />
            <Metric label="Size" value={titleCase(company.size) || "—"} />
          </div>
        </div>
      </div>

      {/* ── 2-col body ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        {/* Left: Jobs + Employees */}
        <div className="space-y-5">
          {/* Open Jobs */}
          <div className="panel p-5">
            <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>Open Positions</h2>
            {(company.jobs || []).length > 0 ? (
              <div className="space-y-3">
              {(company.jobs || []).map((job) => {
                  const { cleanTitle, tags } = parseJobTitle(job.title || "");
                  return (
                  <div key={job.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 transition" style={{ borderColor: "var(--border)" }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cleanTitle}</p>
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {[job.location, titleCase(job.workMode), titleCase(job.experienceLevel)].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.type && (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
                            {titleCase(job.type)}
                          </span>
                        )}
                        {job.createdAt && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDate(job.createdAt)}</span>
                        )}
                      </div>
                    </div>
                    {/* External apply redirect — uses job.applyUrl (Greenhouse/Lever/Ashby ATS link) */}
                    {job.applyUrl ? (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1"
                      >
                        Apply <ExternalLink size={10} />
                      </a>
                    ) : job.slug ? (
                      <Link
                        to={`/jobs/${job.slug}`}
                        className="shrink-0 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Job
                      </Link>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No open positions right now.</p>
            )}
          </div>

          {/* Employees section removed from left column — moved to right sidebar below About card */}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* About */}
          <div className="panel p-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>About</h3>
            <div className="space-y-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              {company.industry && <p><span className="font-semibold">Industry:</span> {company.industry}</p>}
              {company.size && <p><span className="font-semibold">Size:</span> {titleCase(company.size)}</p>}
              {company.headquarters && <p className="flex items-center gap-1"><MapPin size={11} /> {company.headquarters}</p>}
              {company.foundedYear && <p><span className="font-semibold">Founded:</span> {company.foundedYear}</p>}
              {company.rating != null && (
                <p className="flex items-center gap-1">
                  <Star size={11} className="text-amber-400" />
                  <span className="font-semibold">{company.rating.toFixed(1)}</span> company rating
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {company.hiringEnabled && (
                <span className="rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Hiring
                </span>
              )}
              {company.referralEnabled && (
                <span className="rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                  Referrals open
                </span>
              )}
              {company.verified && (
                <span className="flex items-center gap-1 rounded-full border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                  <ShieldCheck size={11} /> Verified
                </span>
              )}
            </div>
            {company.careersPageUrl && (
              <a
                className="btn-primary mt-4 w-full text-center"
                href={company.careersPageUrl}
                target="_blank"
                rel="noreferrer"
              >
                <BriefcaseBusiness size={15} /> Visit Careers Page
              </a>
            )}
          </div>

          {/* Employees panel — moved here from left column, below About card */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Employees on Eng Hub</h3>
              {employeesQuery.isFetching && <Loader2 className="animate-spin" size={14} style={{ color: "var(--text-muted)" }} />}
            </div>
            {employees.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                    <Avatar user={emp.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{userName(emp.user)}</p>
                      <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{emp.title || userHeadline(emp.user)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {emp.verified && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">✓ Verified</span>}
                        {emp.user?.acceptingReferrals && (
                          <button
                            type="button"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                            onClick={() => setSelectedReferralUser(emp.user || null)}
                          >
                            Request Referral →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No employee profiles linked yet.</p>
            )}
            {(employeesQuery.data?.totalPages || 0) > 1 && (
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn-secondary px-3 py-1.5 text-xs" type="button"
                  disabled={employeePage <= 1} onClick={() => setEmployeePage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <button className="btn-secondary px-3 py-1.5 text-xs" type="button"
                  disabled={employeePage >= (employeesQuery.data?.totalPages || 1)}
                  onClick={() => setEmployeePage((p) => p + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>

        </aside>
      </div>

      {selectedReferralUser && company && (
        <RequestReferralModal
          targetUser={selectedReferralUser}
          companyNameDefault={company.name}
          onClose={() => setSelectedReferralUser(null)}
        />
      )}

      {/* Unfollow confirmation dialog */}
      <ConfirmDialog
        open={showUnfollowDialog}
        title={`Unfollow ${company?.name ?? "this company"}?`}
        message="You will stop receiving updates and job alerts from this company."
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        variant="default"
        isPending={unfollowMutation.isPending}
        onConfirm={handleConfirmUnfollow}
        onCancel={() => setShowUnfollowDialog(false)}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main CompaniesPage
// ---------------------------------------------------------------------------
export function CompaniesPage() {
  const { companySlug } = useParams();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Filter state
  const [searchQ, setSearchQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<CompanyType | "">("");
  const [sizeFilter, setSizeFilter] = useState<CompanySize | "">("");
  const [hiringOnly, setHiringOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({});
  const companiesQuery = useCompaniesQuery({ page: 1, limit: 24, hasJobs: true, ...appliedFilters });
  const suggestedQuery = useSuggestedCompaniesQuery();
  const companies = companiesQuery.data?.companies || [];
  const suggested = suggestedQuery.data || [];

  const applyFilters = () => {
    setAppliedFilters({
      ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(sizeFilter ? { size: sizeFilter } : {}),
      ...(hiringOnly ? { hiringEnabled: true } : {}),
      ...(verifiedOnly ? { verified: true } : {}),
    });
  };

  const clearFilters = () => {
    setSearchQ(""); setTypeFilter(""); setSizeFilter(""); setHiringOnly(false); setVerifiedOnly(false);
    setAppliedFilters({});
  };

  const hasFilters = Boolean(searchQ || typeFilter || sizeFilter || hiringOnly || verifiedOnly);

  if (companySlug) return <CompanyDetail slug={companySlug} />;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Companies</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Explore hiring teams, employee signals, and referral-friendly companies.
          </p>
        </div>
        {/* Platform/super admins can add companies directly */}
        {isSuperOrPlatformAdmin(user) ? (
          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Add Company
          </button>
        ) : user ? (
          <button type="button" className="btn-primary" onClick={() => setShowRequestModal(true)}>
            <Plus size={16} /> Request Registration
          </button>
        ) : null}
      </div>

      {/* Naukri-style search + filter bar */}
      <div className="panel p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: "var(--text-muted)" }} />
            <input
              className="field pl-9"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Company name, industry…"
            />
          </div>

          {/* Type filter */}
          <select
            className="field w-auto min-w-[130px]"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CompanyType | "")}
          >
            <option value="">All Types</option>
            {companyTypes.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>

          {/* Size filter */}
          <select
            className="field w-auto min-w-[130px]"
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value as CompanySize | "")}
          >
            <option value="">All Sizes</option>
            {companySizes.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>

          {/* Toggle chips */}
          <button
            type="button"
            onClick={() => setHiringOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              hiringOnly
                ? "border-indigo-400 bg-indigo-600 text-white"
                : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
            }`}
            style={!hiringOnly ? { background: "var(--bg-surface)" } : {}}
          >
            Hiring
          </button>
          <button
            type="button"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              verifiedOnly
                ? "border-teal-400 bg-teal-600 text-white"
                : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-teal-300"
            }`}
            style={!verifiedOnly ? { background: "var(--bg-surface)" } : {}}
          >
            <ShieldCheck size={12} /> Verified
          </button>

          <button type="button" className="btn-primary" onClick={applyFilters}>
            <Search size={15} /> Search
          </button>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold hover:text-rose-500 transition flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Suggested */}
      {suggested.length > 0 && !hasFilters && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            <TrendingUp size={15} className="text-blue-500" /> Suggested for you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {suggested.slice(0, 4).map((c) => <CompanyCard key={c.id} company={c} />)}
          </div>
        </div>
      )}

      {/* Directory */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            {companiesQuery.data ? `${companiesQuery.data.total} companies` : "Company Directory"}
          </h2>
          {companiesQuery.isFetching && <Loader2 className="animate-spin" size={15} style={{ color: "var(--text-muted)" }} />}
        </div>
        {companies.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((c) => <CompanyCard key={c.id} company={c} />)}
          </div>
        ) : (
          <EmptyState icon={Building2} title="No companies found" text="Try adjusting your search or filters." />
        )}
      </div>

      {showCreateModal && <CreateCompanyModal onClose={() => setShowCreateModal(false)} />}
      {showRequestModal && <RequestCompanyModal onClose={() => setShowRequestModal(false)} />}
    </section>
  );
}
