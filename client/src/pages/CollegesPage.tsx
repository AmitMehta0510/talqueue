import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, Info, Loader2, Plus, Search, Users, Shield, Trash2, UserPlus, Zap, CheckCircle2, XCircle, Clock, Calendar, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, Metric } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
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
  useRespondToDriveInviteMutation,
  useUpdatePlacementDriveMutation,
  useClosePlacementDriveMutation,
  usePendingAlumniClaimsQuery,
  useApproveAlumniClaimMutation,
  useRejectAlumniClaimMutation,
  useCollegePlacementStatsQuery,
} from "../hooks/usePlatformQueries";
import { College } from "../lib/api";
import { compactPayload, formatCount, formatDate, cleanLogoUrl } from "../lib/format";
import { CreateDriveModal } from "../components/jobs/CreateDriveModal";
import { DriveApplicantsModal } from "../components/jobs/DriveApplicantsModal";

// Role helpers
const SUPER_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);
const COLLEGE_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "COLLEGE_ADMIN"]);

function isSuperOrPlatformAdmin(user: any): boolean {
  if (!user?.roles) return false;
  return (user.roles as Array<{ role?: { name?: string } }>).some(
    (r) => r.role?.name && SUPER_ADMIN_ROLES.has(r.role.name)
  );
}

function isCollegeAdminFor(user: any, collegeId: string): boolean {
  if (!user) return false;
  // Platform admins can manage any college
  if (isSuperOrPlatformAdmin(user)) return true;
  // Check college-scoped admin assignment
  const isAdmin = user.collegeAdminships?.some((adm: any) => adm.collegeId === collegeId);
  const isCdcr = user.cdcrMemberships?.some((cdcr: any) => cdcr.collegeId === collegeId);
  return Boolean(isAdmin || isCdcr);
}

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
    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
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
        <Link className="btn-secondary px-3 py-1.5" to={`/communities/${slugify(`${college.name} Official`)}`}>
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
  
  // TPO subtabs
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "tpo">("overview");
  const [tpoSubTab, setTpoSubTab] = useState<"cdcr" | "drives" | "invites" | "alumni" | "stats">("cdcr");
  const [showCreateDriveModal, setShowCreateDriveModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);
  const isTpo = isCollegeAdminFor(user, college?.id || "");

  // CDCR management
  const [searchQuery, setSearchQuery] = useState("");
  const cdcrQuery = useCdcrMembersQuery(college?.id);
  const assignMutation = useAssignCdcrMemberMutation(college?.id || "");
  const removeMutation = useRemoveCdcrMemberMutation(college?.id || "");
  const searchResultsQuery = useSearchCollegeStudentsQuery(college?.id || "", searchQuery);

  // Drives management (TPO view)
  const allDrivesQuery = useAllDrivesForCollegeQuery(isTpo ? college?.id : null);
  const driveInvitesQuery = useDriveInvitesForCollegeQuery(isTpo ? college?.id : null);
  const respondToInviteMutation = useRespondToDriveInviteMutation(college?.id);
  const updateDriveMutation = useUpdatePlacementDriveMutation();
  const closeDriveMutation = useClosePlacementDriveMutation();

  // Alumni verification (TPO view)
  const alumniClaimsQuery = usePendingAlumniClaimsQuery(isTpo ? college?.id : null);
  const approveAlumniMutation = useApproveAlumniClaimMutation(college?.id);
  const rejectAlumniMutation = useRejectAlumniClaimMutation(college?.id);

  // Stats / Analytics
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const statsQuery = useCollegePlacementStatsQuery(isTpo ? college?.id : null, selectedYear);

  const canManageDepartments = isCollegeAdminFor(user, college?.id || "");

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
      <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-900" to="/colleges">
        Back to colleges
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <CollegeLogo college={college} />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{college.name}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {[college.city, college.state].filter(Boolean).join(", ") || "Location unlisted"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {college.website && (
              <a className="btn-secondary" href={college.website} rel="noreferrer" target="_blank">
                Website
              </a>
            )}
            <Link className="btn-primary" to={`/communities/${slugify(`${college.name} Official`)}`}>
              <Users size={16} />
              Official community
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Departments" value={formatCount(college._count?.departments)} />
          <Metric label="Profiles" value={formatCount(college._count?.profiles)} />
          <Metric label="Educations" value={formatCount(college._count?.educations)} />
          <Metric label="Created" value={college.createdAt ? formatDate(college.createdAt) : "Catalog"} />
        </div>
      </div>

      {isTpo && (
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${
              activeSubTab === "overview"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent hover:text-emerald-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSubTab("tpo")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${
              activeSubTab === "tpo"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent hover:text-emerald-700"
            }`}
          >
            TPO Portal
            {(driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                {(driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>
      )}

      {activeSubTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Departments</h3>
              {departmentsQuery.isFetching && <Loader2 className="animate-spin" size={15} style={{ color: "var(--text-muted)" }} />}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(departmentsQuery.data || []).length ? (
                (departmentsQuery.data || []).map((department) => (
                  <div className="rounded-md border p-3" key={department.id} style={{ borderColor: "var(--border)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{department.name}</div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {department.createdAt ? formatDate(department.createdAt) : "Department"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No departments listed yet.</p>
              )}
            </div>
          </div>

          <aside className="panel p-5">
            {canManageDepartments ? (
              <>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add department</h3>
                <form className="mt-4 space-y-3" onSubmit={submitDepartment}>
                  <input
                    className="field"
                    value={departmentName}
                    onChange={(event) => setDepartmentName(event.target.value)}
                    placeholder="Department name"
                    required
                  />
                  <button className="btn-primary w-full" type="submit" disabled={createDepartment.isPending}>
                    {createDepartment.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Save department
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Departments</h3>
                <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  Department management is restricted to college administrators. Contact your placement officer if a department is missing.
                </p>
              </>
            )}
          </aside>
        </div>
      ) : (
        /* ── TPO Portal Layout ── */
        <div className="space-y-4">
          {/* TPO Sub-tab navigation */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface-2)" }}>
            {(["cdcr", "drives", "invites", "alumni", "stats"] as const).map((tab) => {
              const labels: Record<string, string> = { cdcr: "CDCR Members", drives: "Drives", invites: "Pending Invites", alumni: "Alumni", stats: "Statistics" };
              const pendingCount = tab === "invites"
                ? (driveInvitesQuery.data || []).filter(i => i.status === "PENDING").length
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
                <Shield size={16} className="text-emerald-600" />
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

          {/* Search & Assign Panel */}
          <aside className="panel p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <UserPlus size={16} className="text-emerald-600" />
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
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
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
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 transition disabled:opacity-50"
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
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>All drives for this college — create, manage status, and track applications.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateDriveModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 transition shadow-sm"
                >
                  <Plus size={13} /> New Drive
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
                              drive.status === "ONGOING" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              drive.status === "UPCOMING" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                              "bg-slate-100 text-slate-500 border-slate-200"
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
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
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
                <EmptyState icon={Zap} title="No drives yet" text="Create the first placement drive for this college." />
              )}
            </div>
          )}

          {tpoSubTab === "invites" && (
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
                          invite.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          invite.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          invite.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          "bg-slate-100 text-slate-500 border-slate-200"
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
                            onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "ACCEPT" })}
                            disabled={respondToInviteMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 transition disabled:opacity-50"
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
                      {invite.status === "ACCEPTED" && invite.placementDrive && (
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
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
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Alumni Verification Requests
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Review and verify alumni status claims from graduates of your institution.</p>
              </div>

              {alumniClaimsQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
              ) : (alumniClaimsQuery.data || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-400">
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
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 transition shadow-sm disabled:opacity-50"
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
                      <span className="text-3xl font-extrabold mt-2 text-emerald-600">{statsQuery.data.summary.totalSelected}</span>
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

      {showCreateDriveModal && (
        <CreateDriveModal
          collegeId={college?.id || collegeId}
          onClose={() => setShowCreateDriveModal(false)}
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
