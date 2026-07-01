import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, Info, Loader2, MapPin, Plus, Search, Users, Shield, Trash2, UserPlus, Zap, CheckCircle2, XCircle, Clock, Calendar, ShieldCheck, UserCheck, UserX, TrendingUp, Award, BookOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, Metric } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useCollegesQuery,
  useCollegeQuery,
  useSearchCollegesQuery,
  useCreateCollegeMutation,
  useCreateDepartmentMutation,
  useDepartmentsQuery,
  useCdcrMembersQuery,
  useAssignCdcrMemberMutation,
  useRemoveCdcrMemberMutation,
  useSearchCollegeStudentsQuery,
  useAllDrivesForCollegeQuery,
  useDriveInvitesForCollegeQuery,
  useSentInvitesByCollegeQuery,
  useRespondToDriveInviteMutation,
  useUpdatePlacementDriveMutation,
  useClosePlacementDriveMutation,
  useWithdrawDriveInviteMutation,
  usePendingAlumniClaimsQuery,
  useApproveAlumniClaimMutation,
  useRejectAlumniClaimMutation,
  useCollegePlacementStatsQuery,
  useCollegePlacementSummaryQuery,
} from "../hooks/usePlatformQueries";
import { College } from "../lib/api";
import { compactPayload, formatCount, formatDate, cleanLogoUrl, STATUS_CHIP_CLASSES } from "../core/utils/format";
import { CreateDriveModal } from "../components/jobs/CreateDriveModal";
import { DriveApplicantsModal } from "../components/jobs/DriveApplicantsModal";
import { TpoInviteCompanyModal } from "../components/jobs/TpoInviteCompanyModal";
import { isSuperOrPlatformAdmin, isCollegeAdminFor, isTpoFor, isCdcrFor } from "../core/utils/roles";

// Centralized role helpers imported from core/utils/roles

const flattenColleges = (pages?: Array<{ colleges: College[] }>) =>
  (pages || []).flatMap((page) => page.colleges || []);

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function CollegeLogo({ college }: { college: College }) {
  const logoUrl = cleanLogoUrl(college.logoUrl);
  if (logoUrl) {
    return (
      <img
        className="h-11 w-11 rounded-md object-cover"
        src={logoUrl}
        alt={college.name}
      />
    );
  }

  return (
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
      <GraduationCap size={21} />
    </div>
  );
}

function CreateCollegePanel({ disabled }: { disabled?: boolean }) {
  const createCollege = useCreateCollegeMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    state: "",
    website: "",
    logoUrl: "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await createCollege.mutateAsync({
        name: form.name,
        ...compactPayload({
          city: form.city,
          state: form.state,
          website: form.website,
          logoUrl: form.logoUrl,
        }),
      });
      setForm({ name: "", city: "", state: "", website: "", logoUrl: "" });
      setOpen(false);
    } catch {
      return;
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>College catalog</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Browse institutions, departments, and official campus communities.
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <Plus size={16} />
          Add college
        </button>
      </div>

      {open && (
        <form className="mt-5 space-y-3 border-t pt-5" onSubmit={submit} style={{ borderColor: "var(--border)" }}>
          <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <input
              className="field"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="College name"
              required
            />
            <input
              className="field"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="City"
            />
            <input
              className="field"
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              placeholder="State"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="field"
              value={form.website}
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              placeholder="Website URL"
            />
            <input
              className="field"
              value={form.logoUrl}
              onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              placeholder="Logo URL"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={createCollege.isPending}>
            {createCollege.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Save college
          </button>
        </form>
      )}
    </div>
  );
}

// Request college panel — shown to non-admin users
function RequestCollegePanel() {
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>College catalog</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Browse institutions, departments, and official campus communities.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5">
          <Info size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            To add your college, contact a platform admin or email <span className="underline">admin@platform.com</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

function CollegeCard({ college }: { college: College }) {
  const location = [college.city, college.state].filter(Boolean).join(", ") || "Location unlisted";

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CollegeLogo college={college} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{college.name}</h3>
            <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>{location}</p>
          </div>
        </div>
        <Link className="btn-secondary px-3 py-1.5" to={`/colleges/${college.normalizedKey || college.id}`}>
          Open
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Departments" value={formatCount(college._count?.departments)} />
        <Metric label="Profiles" value={formatCount(college._count?.profiles)} />
        <Metric label="Educations" value={formatCount(college._count?.educations)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        {college.website && (
          <a className="btn-secondary px-3 py-1.5" href={college.website} rel="noreferrer" target="_blank">
            Website
          </a>
        )}
        <Link className="btn-secondary px-3 py-1.5" to={`/communities?q=${encodeURIComponent(college.name)}`}>
          Community
        </Link>
      </div>
    </article>
  );
}

function CollegeDetail({ collegeId }: { collegeId: string }) {
  const { user } = useAuth();
  const collegeQuery = useCollegeQuery(collegeId);
  const college = collegeQuery.data;
  const departmentsQuery = useDepartmentsQuery(college?.id);
  const createDepartment = useCreateDepartmentMutation(college?.id);
  const [departmentName, setDepartmentName] = useState("");
  // Public placement summary (no auth required)
  const placementSummaryQuery = useCollegePlacementSummaryQuery(college?.id);
  
  // TPO subtabs
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "tpo">("overview");
  const [tpoSubTab, setTpoSubTab] = useState<"cdcr" | "drives" | "sent-invites" | "company-invites" | "alumni" | "stats">("cdcr");
  const [showCreateDriveModal, setShowCreateDriveModal] = useState(false);
  const [showInviteCompanyModal, setShowInviteCompanyModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);
  const isTpoPortal = isCollegeAdminFor(user, college?.id || "");
  const isUserTpo = isTpoFor(user, college?.id || "");
  const isUserCdcr = isCdcrFor(user, college?.id || "");
  // For backward compat: 'isTpo' means any college staff
  const isTpo = isTpoPortal;

  // CDCR management — only loaded if user is college staff
  const [searchQuery, setSearchQuery] = useState("");
  const cdcrQuery = useCdcrMembersQuery(isUserCdcr ? college?.id : null);
  const assignMutation = useAssignCdcrMemberMutation(college?.id || "");
  const removeMutation = useRemoveCdcrMemberMutation(college?.id || "");
  const searchResultsQuery = useSearchCollegeStudentsQuery(
    isUserCdcr ? (college?.id || "") : "",
    isUserCdcr ? searchQuery : "",
  );

  // Drives management (TPO view)
  const allDrivesQuery = useAllDrivesForCollegeQuery(isTpo ? college?.id : null);
  const driveInvitesQuery = useDriveInvitesForCollegeQuery(isTpo ? college?.id : null);
  const sentInvitesQuery = useSentInvitesByCollegeQuery(isTpo ? college?.id : null);
  const respondToInviteMutation = useRespondToDriveInviteMutation(college?.id);
  const withdrawInviteMutation = useWithdrawDriveInviteMutation(college?.id);
  const updateDriveMutation = useUpdatePlacementDriveMutation();
  const closeDriveMutation = useClosePlacementDriveMutation();

  // Alumni verification (TPO view)
  const alumniClaimsQuery = usePendingAlumniClaimsQuery(isTpo ? college?.id : null);
  const approveAlumniMutation = useApproveAlumniClaimMutation(college?.id);
  const rejectAlumniMutation = useRejectAlumniClaimMutation(college?.id);

  // Stats / Analytics
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const statsQuery = useCollegePlacementStatsQuery(isTpo ? college?.id : null, selectedYear);

    // Only platform admins or actual CollegeAdmin records can create departments (NOT CDCR)
  const canManageDepartments =
    isSuperOrPlatformAdmin(user) ||
    Boolean(user?.collegeAdminships?.some((adm) => adm.collegeId === college?.id));

  const submitDepartment = (event: FormEvent) => {
    event.preventDefault();
    createDepartment.mutate(departmentName, {
      onSuccess: () => setDepartmentName(""),
    });
  };

  if (collegeQuery.isLoading) {
    return (
    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin" size={16} />
        Loading college
      </div>
    );
  }

  if (!college) {
    return <EmptyState icon={GraduationCap} title="College not found" text="This college is unavailable." />;
  }

  return (
    <section className="space-y-5">
      <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition" to="/colleges">
        ← Back to colleges
      </Link>

      {/* ── Hero Banner ── */}
      <div className="panel overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-5">
              {/* Logo */}
              <div className="relative shrink-0">
                {cleanLogoUrl(college.logoUrl) ? (
                  <img
                    className="h-16 w-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-700"
                    src={cleanLogoUrl(college.logoUrl)!}
                    alt={college.name}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <GraduationCap size={28} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>{college.name}</h1>
                <p className="mt-1 text-sm flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={13} className="shrink-0" />
                  {[college.city, college.state, college.country].filter(Boolean).join(", ") || "Location unlisted"}
                </p>
                {/* Badges row — public badges + staff-only role badges */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {/* institutionType badge — visible to ALL visitors */}
                  {college.institutionType && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Building2 size={9} /> {college.institutionType}
                    </span>
                  )}
                  {/* naacGrade badge — visible to ALL visitors */}
                  {college.naacGrade && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <Award size={9} /> NAAC {college.naacGrade}
                    </span>
                  )}
                  {/* Staff-only role badges — directly check raw membership arrays */}
                  {isUserCdcr && (
                    <>
                      {/* College Admin: only if in collegeAdminships for this college */}
                      {user?.collegeAdminships?.some((adm) => adm.collegeId === college.id) && !isSuperOrPlatformAdmin(user) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                          <Shield size={9} /> College Admin
                        </span>
                      )}
                      {/* TPO: only if in tpoMemberships for this college */}
                      {user?.tpoMemberships?.some((t) => t.collegeId === college.id) && !isSuperOrPlatformAdmin(user) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck size={9} /> TPO
                        </span>
                      )}
                      {/* CDCR: only if in cdcrMemberships and NOT a higher role for this college */}
                      {user?.cdcrMemberships?.some((c) => c.collegeId === college.id) &&
                        !user?.tpoMemberships?.some((t) => t.collegeId === college.id) &&
                        !user?.collegeAdminships?.some((adm) => adm.collegeId === college.id) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Shield size={9} /> CDCR
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {college.website && (
                <a
                  className="btn-secondary text-xs px-3 py-1.5"
                  href={college.website}
                  rel="noreferrer"
                  target="_blank"
                >
                  Website ↗
                </a>
              )}
              <Link
                className="btn-primary text-xs px-3 py-1.5"
                to={`/communities?q=${encodeURIComponent(college.name)}`}
              >
                <Users size={13} />
                Community
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-5 pt-5 border-t grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4" style={{ borderColor: "var(--border)" }}>
            {[
              { label: "Departments", value: college._count?.departments ?? 0, sub: "Active" },
              { label: "Students", value: college._count?.profiles ?? 0, sub: "Total" },
              { label: "Alumni", value: college.alumniCount ?? 0, sub: "On Platform" },
              { label: "Education Records", value: college._count?.educations ?? 0, sub: "Enrolled" },
              ...(college.establishedYear ? [{ label: "Est.", value: college.establishedYear, sub: "Year Founded" }] : []),
              { label: "Added", value: college.createdAt ? formatDate(college.createdAt) : "Catalog", sub: "Verified College" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {typeof stat.value === "number" ? formatCount(stat.value) : stat.value}
                </p>
                <p className="text-[11px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                {stat.sub && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar (Overview always visible; TPO Portal only for staff) ── */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${
            activeSubTab === "overview"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent hover:text-indigo-700"
          }`}
          style={activeSubTab !== "overview" ? { color: "var(--text-muted)" } : {}}
        >
          College Profile
        </button>
        {isUserCdcr && (
          <button
            onClick={() => setActiveSubTab("tpo")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${
              activeSubTab === "tpo"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent hover:text-indigo-700"
            }`}
            style={activeSubTab !== "tpo" ? { color: "var(--text-muted)" } : {}}
          >
            TPO Portal
            {(
              (driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length +
              (sentInvitesQuery.data || []).filter(i => i.status === "PENDING").length
            ) > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                {(driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length +
                  (sentInvitesQuery.data || []).filter(i => i.status === "PENDING").length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeSubTab === "overview" ? (
        <div className="space-y-4">

          {/* ── Row 1: 3 cards ── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* About the Institute */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <BookOpen size={14} className="text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>About the Institute</h3>
              </div>

              {college.description ? (
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {college.description}
                </p>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                  No description added yet.
                </p>
              )}

              {/* Meta row */}
              <div className="mt-auto pt-3 border-t grid grid-cols-2 gap-y-2.5 gap-x-3" style={{ borderColor: "var(--border)" }}>
                {college.establishedYear && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Established</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{college.establishedYear}</p>
                  </div>
                )}
                {college.collegeType && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Type</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{college.collegeType}</p>
                  </div>
                )}
                {college.affiliation && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Affiliation</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{college.affiliation}</p>
                  </div>
                )}
                {college.naacGrade && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>NAAC Grade</p>
                    <p className="text-xs font-bold mt-0.5 text-indigo-600">{college.naacGrade}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Popular Departments */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <GraduationCap size={14} className="text-violet-600" />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Popular Departments</h3>
                </div>
              </div>

              <div className="flex-1 space-y-1">
                {(college.departments || departmentsQuery.data || []).slice(0, 5).map((dept, i) => {
                  const count = dept._count?.profiles ?? 0;
                  const maxCount = Math.max(...(college.departments || departmentsQuery.data || []).slice(0, 5).map((d) => d._count?.profiles ?? 0), 1);
                  return (
                    <div key={dept.id} className="flex items-center gap-3 py-1.5">
                      <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{dept.name}</p>
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
                        {count ? `${formatCount(count)} Students` : "—"}
                      </span>
                    </div>
                  );
                })}
                {!(college.departments || departmentsQuery.data || []).length && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No departments listed yet.</p>
                )}
              </div>

              {canManageDepartments && (
                <form onSubmit={submitDepartment} className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <input
                    className="field text-xs py-1.5 px-2.5 flex-1"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Add department..."
                    required
                  />
                  <button className="btn-primary text-xs py-1.5 px-2.5 shrink-0" type="submit" disabled={createDepartment.isPending}>
                    {createDepartment.isPending ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                  </button>
                </form>
              )}
            </div>

            {/* Placement Highlights */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Placement Highlights
                  <span className="ml-1.5 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>({new Date().getFullYear()})</span>
                </h3>
              </div>

              {placementSummaryQuery.isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
              ) : placementSummaryQuery.data && placementSummaryQuery.data.totalDrives > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold text-emerald-600">{placementSummaryQuery.data.placementPercent}%</p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Placement Rate</p>
                    </div>
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {placementSummaryQuery.data.maxPackageLPA ? `₹${placementSummaryQuery.data.maxPackageLPA} LPA` : "—"}
                      </p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Highest Pkg</p>
                    </div>
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {placementSummaryQuery.data.avgPackageLPA ? `₹${placementSummaryQuery.data.avgPackageLPA} LPA` : "—"}
                      </p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Avg Package</p>
                    </div>
                  </div>

                  {placementSummaryQuery.data.topRecruiters.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Top Recruiters</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {placementSummaryQuery.data.topRecruiters.map((r) => (
                          cleanLogoUrl(r.companyLogo) ? (
                            <img key={r.companyId} src={cleanLogoUrl(r.companyLogo)!} alt={r.companyName} title={r.companyName} className="h-6 object-contain opacity-80 hover:opacity-100 transition" />
                          ) : (
                            <span key={r.companyId} className="text-[10px] font-bold px-2 py-1 rounded border" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>{r.companyName}</span>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
                  <Award size={28} className="mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No placement data available yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: Students | Alumni | Gallery ── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Students on Platform */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Users size={14} className="text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Students on Platform</h3>
                </div>
                <Link to={`/colleges/${college.normalizedKey || college.id}/students`} className="text-[10px] font-bold text-indigo-600 hover:underline">View all</Link>
              </div>

              {/* Avatar stack */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex -space-x-2">
                  {(college.profiles || []).slice(0, 6).map((profile, idx) => (
                    cleanLogoUrl(profile.avatarUrl) ? (
                      <img key={idx} src={cleanLogoUrl(profile.avatarUrl)!} alt={profile.fullName || ""} className="h-9 w-9 rounded-full object-cover border-2 ring-1 ring-white dark:ring-slate-800" style={{ borderColor: "var(--bg-surface)" }} />
                    ) : (
                      <div key={idx} className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-[11px] font-bold" style={{ background: `hsl(${(idx * 47) % 360},60%,55%)`, borderColor: "var(--bg-surface)", color: "white" }}>
                        {(profile.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                  {(college._count?.profiles ?? 0) > 6 && (
                    <div className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--bg-surface-2)", borderColor: "var(--bg-surface)", color: "var(--text-muted)" }}>
                      +{formatCount((college._count?.profiles ?? 0) - 6)}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatCount(college._count?.profiles ?? 0)}</span> students active on Engineering Hub
              </p>
            </div>

            {/* Alumni Network */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} className="text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Alumni Network</h3>
                </div>
                <Link to={`/colleges/${college.normalizedKey || college.id}/alumni`} className="text-[10px] font-bold text-indigo-600 hover:underline">View all</Link>
              </div>

              {/* Alumni avatar stack */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex -space-x-2">
                  {(college.alumniAvatars || []).slice(0, 6).map((alumni, idx) => (
                    cleanLogoUrl(alumni.avatarUrl) ? (
                      <img key={idx} src={cleanLogoUrl(alumni.avatarUrl)!} alt={alumni.fullName || ""} className="h-9 w-9 rounded-full object-cover border-2 ring-1 ring-white dark:ring-slate-800" style={{ borderColor: "var(--bg-surface)" }} />
                    ) : (
                      <div key={idx} className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-[11px] font-bold" style={{ background: `hsl(${(idx * 73 + 30) % 360},60%,55%)`, borderColor: "var(--bg-surface)", color: "white" }}>
                        {(alumni.fullName || "A").charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                  {(college.alumniCount ?? 0) > 6 && (
                    <div className="h-9 w-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--bg-surface-2)", borderColor: "var(--bg-surface)", color: "var(--text-muted)" }}>
                      +{formatCount((college.alumniCount ?? 0) - 6)}
                    </div>
                  )}
                  {(college.alumniCount ?? 0) === 0 && (
                    <div className="h-9 w-9 rounded-full border-2 flex items-center justify-center" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}>
                      <Users size={14} style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatCount(college.alumniCount ?? 0)}</span> verified alumni connected
              </p>
            </div>

            {/* Institute Gallery */}
            <div className="panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                    <Award size={14} className="text-rose-500" />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Institute Gallery</h3>
                </div>
                {(college.galleryImages || []).length > 3 && (
                  <span className="text-[10px] font-bold text-indigo-600">+{(college.galleryImages || []).length - 3} more</span>
                )}
              </div>

              {(college.galleryImages || []).length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {(college.galleryImages || []).slice(0, 3).map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                      <img src={url} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                      {idx === 2 && (college.galleryImages || []).length > 3 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <span className="text-white text-sm font-extrabold">+{(college.galleryImages || []).length - 3}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
                  <Award size={24} className="mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No gallery images yet</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 3: At a Glance (full width) ── */}
          {college.glanceStats && Object.keys(college.glanceStats).length > 0 && (
            <div className="panel p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>At a Glance</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {([
                  { key: "smartClassrooms", label: "Smart Classrooms", icon: BookOpen },
                  { key: "labs", label: "Labs", icon: GraduationCap },
                  { key: "researchPapers", label: "Research Papers", icon: BookOpen },
                  { key: "mous", label: "MoUs", icon: Award },
                  { key: "annualEvents", label: "Events (Annual)", icon: Calendar },
                  { key: "startupsIncubated", label: "Startup Incubated", icon: TrendingUp },
                ] as const).filter(item => college.glanceStats?.[item.key] !== undefined).map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex flex-col items-center text-center gap-1.5">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-surface-2)" }}>
                      <Icon size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{college.glanceStats?.[key]}</p>
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: "var(--text-muted)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ── TPO Portal Layout ── */
        <div className="space-y-4">
          {/* TPO Sub-tab navigation */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface-2)" }}>
            {(["cdcr", "drives", "sent-invites", "company-invites", "alumni", "stats"] as const).map((tab) => {
              const labels: Record<string, string> = {
                cdcr: "CDCR Members",
                drives: "Drives",
                "sent-invites": "Sent Invites",
                "company-invites": "Company Invites",
                alumni: "Alumni",
                stats: "Statistics",
              };
              const pendingCount = tab === "company-invites"
                ? (driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length
                : tab === "sent-invites"
                ? (sentInvitesQuery.data || []).filter(i => i.status === "PENDING").length
                : tab === "alumni"
                ? (alumniClaimsQuery.data || []).length
                : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setTpoSubTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    tpoSubTab === tab
                      ? "text-slate-900 shadow-sm" : "hover:opacity-80"
                  }`}
                  style={tpoSubTab === tab ? { background: "var(--bg-surface)", color: "var(--text-primary)" } : { color: "var(--text-muted)" }}
                >
                  {labels[tab]}
                  {pendingCount > 0 && (
                    <span className="h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">{pendingCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {tpoSubTab === "cdcr" && (
            <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
          {/* CDCR Members Roster */}
          <div className="panel p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <Shield size={16} className="text-indigo-600" />
                CDCR Representatives
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Roster of student/faculty coordinators authorized to manage placement drives.
              </p>
            </div>

            {cdcrQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            ) : (cdcrQuery.data || []).length ? (
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Assigned Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    {(cdcrQuery.data || []).map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 flex items-center gap-2.5">
                          {cleanLogoUrl(member.user?.profile?.avatarUrl) ? (
                            <img
                              src={cleanLogoUrl(member.user?.profile?.avatarUrl)!}
                              alt={member.user?.profile?.fullName}
                              className="h-8 w-8 rounded-full object-cover border border-slate-100 shadow-sm"
                            />
                          ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                              {member.user?.profile?.fullName?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
                              {member.user?.profile?.fullName || "User"}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                              @{member.user?.username}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>
                          {member.user?.email}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(member.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Revoke CDCR assignment for ${member.user?.profile?.fullName || member.user?.username}?`)) {
                                removeMutation.mutate(member.userId);
                              }
                            }}
                            disabled={removeMutation.isPending}
                            className="transition p-1 rounded-lg" style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#e11d48")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            title="Revoke access"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Shield}
                title="No CDCR representatives yet"
                text="Search and assign students to help coordinate placement drives."
              />
            )}
          </div>

          {/* Search & Assign Panel — only shown to TPO or CollegeAdmin (not CDCR-only) */}
          {isUserTpo && (
          <aside className="panel p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <UserPlus size={16} className="text-indigo-600" />
                Assign CDCR Member
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Search students of this college to grant CDCR coordination permissions.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none" style={{ color: "var(--text-muted)" }}>
                <Search size={14} />
              </div>
              <input
                type="text"
                className="field pl-9 w-full text-xs"
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchQuery.trim().length >= 2 ? (
              searchResultsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-slate-400" size={16} />
                </div>
              ) : (searchResultsQuery.data || []).length ? (
              <div className="rounded-xl border divide-y max-h-60 overflow-y-auto shadow-inner" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", borderTop: "none" }}>
                  {(searchResultsQuery.data || []).map((student) => {
                    const isAlreadyCdcr = (cdcrQuery.data || []).some((m) => m.userId === student.id);
                    return (
                      <div key={student.id} className="p-3 flex items-center justify-between gap-3 transition-colors" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2 min-w-0">
                          {cleanLogoUrl(student.profile?.avatarUrl) ? (
                            <img
                              src={cleanLogoUrl(student.profile?.avatarUrl)!}
                              alt={student.profile?.fullName}
                              className="h-7 w-7 rounded-full object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                              {student.profile?.fullName?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                              {student.profile?.fullName || "User"}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                              @{student.username}
                            </p>
                          </div>
                        </div>

                        {isAlreadyCdcr ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                            CDCR
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              assignMutation.mutate(student.id, {
                                onSuccess: () => setSearchQuery(""),
                              });
                            }}
                            disabled={assignMutation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1 transition disabled:opacity-50"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No matching students found.</p>
              )
            ) : searchQuery.trim().length > 0 ? (
              <p className="text-[10px] text-center py-2" style={{ color: "var(--text-muted)" }}>Type at least 2 characters to search.</p>
            ) : null}
            </aside>
          )}

          </div>
          )}

          {tpoSubTab === "drives" && (
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <Zap size={16} className="text-indigo-600" />
                    Placement Drives
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All drives for this college — invite companies, manage status, and track applications.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteCompanyModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition shadow-sm"
                >
                  <Plus size={13} /> Invite Company
                </button>
              </div>

              {allDrivesQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
              ) : (allDrivesQuery.data || []).length ? (
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                      <tr>
                        <th className="px-4 py-3">Drive</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {(allDrivesQuery.data || []).map((drive) => (
                        <tr key={drive.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>{drive.driveTitle}</p>
                            {drive.roles.length > 0 && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{drive.roles.join(", ")}</p>}
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{drive.company?.name}</td>
                          <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{drive.driveDate ? formatDate(drive.driveDate) : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              STATUS_CHIP_CLASSES[drive.status] || STATUS_CHIP_CLASSES.CLOSED
                            }`}>
                              {drive.status === "ONGOING" ? "Open" : drive.status === "UPCOMING" ? "Upcoming" : "Closed"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDriveForApplicants({ id: drive.id, title: drive.driveTitle })}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                              >
                                Applicants
                              </button>
                              {drive.status === "UPCOMING" && (
                                <button
                                  type="button"
                                  onClick={() => updateDriveMutation.mutate({ id: drive.id, data: { status: "ONGOING" } })}
                                  disabled={updateDriveMutation.isPending}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition disabled:opacity-50"
                                >
                                  Open
                                </button>
                              )}
                              {drive.status !== "CLOSED" && (
                                <button
                                  type="button"
                                  onClick={() => { if (confirm("Close this drive?")) closeDriveMutation.mutate(drive.id); }}
                                  disabled={closeDriveMutation.isPending}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Zap} title="No drives yet" text="Send a placement drive invitation to a company to get started." />
              )}
            </div>
          )}

          {tpoSubTab === "sent-invites" && (
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <Building2 size={16} className="text-indigo-600" />
                    Sent Invites
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Placement drive invitations sent by your college to companies.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteCompanyModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition shadow-sm"
                >
                  <Plus size={13} /> Invite Company
                </button>
              </div>

              {sentInvitesQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
              ) : (sentInvitesQuery.data || []).length ? (
                <div className="space-y-3">
                  {(sentInvitesQuery.data || []).map((invite) => (
                    <div key={invite.id} className={`rounded-xl border p-4 space-y-3 transition ${
                      invite.status === "PENDING" ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-900/10" : "opacity-60"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{invite.driveTitle}</p>
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Building2 size={10} />
                            {invite.company?.name}
                          </p>
                          {invite.message && (
                            <p className="text-xs mt-1.5 italic border-l-2 border-indigo-300 pl-2" style={{ color: "var(--text-secondary)" }}>"{ invite.message}"</p>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          STATUS_CHIP_CLASSES[invite.status] || "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {invite.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {invite.driveDate && <span className="flex items-center gap-1"><Calendar size={9} />Drive: {formatDate(invite.driveDate)}</span>}
                        {invite.applyDeadline && <span className="flex items-center gap-1"><Clock size={9} />Deadline: {formatDate(invite.applyDeadline)}</span>}
                        {invite.roles.length > 0 && <span>Roles: {invite.roles.join(", ")}</span>}
                      </div>

                      {invite.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { if (confirm("Withdraw this invite?")) withdrawInviteMutation.mutate(invite.id); }}
                            disabled={withdrawInviteMutation.isPending}
                            className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 transition disabled:opacity-50"
                          >
                            <XCircle size={13} /> Withdraw
                          </button>
                        </div>
                      )}
                      {invite.status === "ACCEPTED" && invite.placementDrive && (
                        <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Drive created
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Building2} title="No invites sent yet" text="Use 'Invite Company' to send a placement drive request to a company." />
              )}
            </div>
          )}

          {tpoSubTab === "company-invites" && (
            <div className="panel p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <Building2 size={16} className="text-violet-600" />
                  Company Invitations
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Companies requesting to conduct placement drives at your college.</p>
              </div>

              {driveInvitesQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
              ) : (driveInvitesQuery.data || []).length ? (
                <div className="space-y-3">
                  {(driveInvitesQuery.data || []).map((invite) => (
                    <div key={invite.id} className={`rounded-xl border p-4 space-y-3 transition ${
                      invite.status === "PENDING" ? "border-violet-200 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10" : "opacity-60"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{invite.driveTitle}</p>
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Building2 size={10} />
                            {invite.company?.name}
                          </p>
                          {invite.message && (
                            <p className="text-xs mt-1.5 italic border-l-2 border-violet-300 pl-2" style={{ color: "var(--text-secondary)" }}>"{ invite.message}"</p>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          STATUS_CHIP_CLASSES[invite.status] || "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {invite.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {invite.driveDate && <span className="flex items-center gap-1"><Calendar size={9} />Drive: {formatDate(invite.driveDate)}</span>}
                        {invite.applyDeadline && <span className="flex items-center gap-1"><Clock size={9} />Deadline: {formatDate(invite.applyDeadline)}</span>}
                        {invite.roles.length > 0 && <span>Roles: {invite.roles.join(", ")}</span>}
                      </div>

                      {/* Accept/Reject only for TPO and CollegeAdmin — CDCR cannot action inbound invites */}
                      {invite.status === "PENDING" && isUserTpo && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "ACCEPT" })}
                            disabled={respondToInviteMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 transition disabled:opacity-50"
                          >
                            {respondToInviteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            Accept & Create Drive
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "REJECT" })}
                            disabled={respondToInviteMutation.isPending}
                            className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 transition disabled:opacity-50"
                          >
                            <XCircle size={13} /> Decline
                          </button>
                        </div>
                      )}
                      {!isUserTpo && invite.status === "PENDING" && (
                        <p className="text-[10px] text-amber-600 font-semibold">Only the TPO can accept or decline company invitations.</p>
                      )}
                      {invite.status === "ACCEPTED" && invite.placementDrive && (
                        <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Drive created successfully
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Building2} title="No company invitations" text="When companies invite your college to their placement drives, they'll appear here for you to accept or decline." />
              )}
            </div>
          )}

          {tpoSubTab === "alumni" && (
            <div className="panel p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <ShieldCheck size={16} className="text-indigo-600" />
                  Alumni Verification Requests
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Review and verify alumni status claims from graduates of your institution.</p>
              </div>

              {alumniClaimsQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
              ) : (alumniClaimsQuery.data || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>No pending alumni claims</p>
                    <p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>When graduates claim their alumni status, their requests will appear here for your review.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(alumniClaimsQuery.data || []).map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {claim.user?.profile?.avatarUrl ? (
                          <img
                            src={claim.user.profile.avatarUrl}
                            alt={claim.user.profile.fullName || claim.user.username}
                            className="h-10 w-10 rounded-full object-cover border border-amber-200 shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0">
                            {(claim.user?.profile?.fullName || claim.user?.username || "A").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {claim.user?.profile?.fullName || claim.user?.username || "Unknown Student"}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            @{claim.user?.username} · {claim.user?.email}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                            <Clock size={9} /> Pending Verification
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => approveAlumniMutation.mutate(claim.id)}
                          disabled={approveAlumniMutation.isPending || rejectAlumniMutation.isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 transition shadow-sm disabled:opacity-50"
                        >
                          {approveAlumniMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectAlumniMutation.mutate(claim.id)}
                          disabled={approveAlumniMutation.isPending || rejectAlumniMutation.isPending}
                          className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-1.5 transition disabled:opacity-50"
                        >
                          <UserX size={13} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tpoSubTab === "stats" && (
            <div className="space-y-6">
              {/* Year filter selector */}
              <div className="panel p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Placement &amp; Internship Analytics</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Academic statistics and performance overview.</p>
                </div>
                <select
                  value={selectedYear || ""}
                  onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="field py-1 px-3 text-xs w-full sm:w-48 rounded-lg shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                >
                  <option value="">All Academic Years</option>
                  <option value="2026">2026 - 2027</option>
                  <option value="2025">2025 - 2026</option>
                  <option value="2024">2024 - 2025</option>
                </select>
              </div>

              {statsQuery.isLoading ? (
                <div className="panel p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                  <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs text-slate-400">Loading statistics...</p>
                </div>
              ) : statsQuery.error || !statsQuery.data ? (
                <div className="panel p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl text-slate-400">
                  <Building2 size={40} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No statistical data available</p>
                  <p className="text-xs text-slate-400 mt-1">Try changing the year filter or adding placement drives.</p>
                </div>
              ) : (
                <>
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Drives</span>
                      <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>{statsQuery.data.summary.totalDrives}</span>
                      <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>{statsQuery.data.summary.totalInternshipDrives} Internship drives</span>
                    </div>

                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total Applicants</span>
                      <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>{statsQuery.data.summary.totalApplicants}</span>
                      <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Applications received</span>
                    </div>

                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Students Placed</span>
                      <span className="text-3xl font-extrabold mt-2 text-indigo-600">{statsQuery.data.summary.totalSelected}</span>
                      <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Successful offers</span>
                    </div>

                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Placement %</span>
                      <span className="text-3xl font-extrabold mt-2 text-indigo-600">{statsQuery.data.summary.placementPercent}%</span>
                      <div className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${statsQuery.data.summary.placementPercent}%` }} />
                      </div>
                    </div>

                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Avg Package</span>
                      <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>
                        {statsQuery.data.summary.avgPackageLPA ? `${statsQuery.data.summary.avgPackageLPA} LPA` : "N/A"}
                      </span>
                      <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Average selected salary</span>
                    </div>

                    <div className="panel p-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Max Package</span>
                      <span className="text-3xl font-extrabold mt-2" style={{ color: "var(--text-primary)" }}>
                        {statsQuery.data.summary.maxPackageLPA ? `${statsQuery.data.summary.maxPackageLPA} LPA` : "N/A"}
                      </span>
                      <span className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Highest offer package</span>
                    </div>
                  </div>

                  {/* Branch & Company Graphs/Lists */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Branch Breakdown */}
                    <div className="panel p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl space-y-4">
                      <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Branch Performance</h4>
                      {statsQuery.data.byBranch.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">No department data available.</div>
                      ) : (
                        <div className="space-y-4">
                          {statsQuery.data.byBranch.map((b) => (
                            <div key={b.branch} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                                <span>{b.branch}</span>
                                <span className="text-slate-500">{b.selected} / {b.total} placed ({b.placementPercent}%)</span>
                              </div>
                              <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-surface-2)" }}>
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                                  style={{ width: `${b.placementPercent}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top Companies */}
                    <div className="panel p-5 bg-white border border-slate-100 shadow-sm rounded-xl space-y-4">
                      <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Top Hiring Partners</h4>
                      {statsQuery.data.byCompany.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">No partner hiring data available.</div>
                      ) : (
                        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {statsQuery.data.byCompany.map((c, idx) => (
                            <div key={c.companyId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-extrabold w-4" style={{ color: "var(--text-muted)" }}>#{idx + 1}</span>
                                {c.companyLogo ? (
                                  <img src={cleanLogoUrl(c.companyLogo) || undefined} alt={c.companyName} className="h-7 w-7 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5" />
                                ) : (
                                  <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {c.companyName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>{c.companyName}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-indigo-600">{c.offers} {c.offers === 1 ? 'Offer' : 'Offers'}</p>
                                {c.avgPackageLPA && (
                                  <p className="text-[10px] text-slate-400">Avg {c.avgPackageLPA} LPA</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showInviteCompanyModal && college && (
        <TpoInviteCompanyModal
          collegeId={college.id}
          collegeName={college.name}
          onClose={() => setShowInviteCompanyModal(false)}
        />
      )}
      {selectedDriveForApplicants && (
        <DriveApplicantsModal
          driveId={selectedDriveForApplicants.id}
          driveTitle={selectedDriveForApplicants.title}
          onClose={() => setSelectedDriveForApplicants(null)}
        />
      )}
    </section>
  );
}

export function CollegesPage() {
  const { collegeSlug } = useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const collegesQuery = useCollegesQuery(40);
  const searchCollegesQuery = useSearchCollegesQuery(debouncedQuery);

  const isSearching = debouncedQuery.length >= 2;
  const colleges = isSearching
    ? searchCollegesQuery.data || []
    : flattenColleges(collegesQuery.data?.pages);

  const isAdmin = isSuperOrPlatformAdmin(user);

  const filteredColleges = useMemo(() => {
    if (isSearching) {
      return searchCollegesQuery.data || [];
    }
    const normalizedQuery = query.trim().toLowerCase();

    return colleges.filter((college) => {
      const haystack = [college.name, college.city, college.state].filter(Boolean).join(" ").toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [colleges, query, isSearching, searchCollegesQuery.data]);

  if (collegeSlug) {
    return <CollegeDetail collegeId={collegeSlug} />;
  }

  const isFetchingList = isSearching ? searchCollegesQuery.isFetching : collegesQuery.isFetching;

  return (
    <section className="space-y-5">
      {/* Admin sees Add College; normal users see info panel */}
      {isAdmin ? <CreateCollegePanel disabled={!user} /> : <RequestCollegePanel />}

      <div className="panel p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--text-muted)" }} />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search colleges"
          />
        </div>
      </div>

      {isFetchingList && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={16} />
          Loading colleges
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredColleges.length ? (
          filteredColleges.map((college) => <CollegeCard college={college} key={college.id} />)
        ) : (
          <EmptyState
            icon={Building2}
            title="No colleges found"
            text="College records from the backend will appear here."
          />
        )}
      </div>

      {!isSearching && collegesQuery.hasNextPage && (
        <button
          className="btn-secondary w-full"
          type="button"
          disabled={collegesQuery.isFetchingNextPage}
          onClick={() => collegesQuery.fetchNextPage()}
        >
          {collegesQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={16} /> : <GraduationCap size={16} />}
          Load more
        </button>
      )}
    </section>
  );
}
