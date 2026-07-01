import React, { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  MapPin,
  Building2,
  Award,
  Shield,
  ShieldCheck,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Plus,
  Loader2
} from "lucide-react";
import { EmptyState } from "../ui";
import { College, User, Department, CdcrMember, AlumniClaim, PlacementDrive, PlacementDriveInvite, PlacementStats } from "../../lib/api";
import { formatDate, formatCount, cleanLogoUrl } from "../../core/utils/format";
import { CollegeStudents } from "./CollegeStudents";
import { CollegeAlumni } from "./CollegeAlumni";
import { CollegePlacement } from "./CollegePlacement";

export interface CollegeDetailProps {
  college: College;
  user: User | null;
  departments: Department[];
  isCreateDepartmentPending: boolean;
  onCreateDepartment: (name: string) => Promise<void>;
  placementSummary: any;
  isPlacementSummaryLoading: boolean;
  isUserTpo: boolean;
  isUserCdcr: boolean;
  isTpo: boolean;
  canManageDepartments: boolean;

  // Modals callbacks
  onInviteCompanyClick: () => void;
  onViewApplicants: (drive: { id: string; title: string }) => void;

  // CDCR roster props
  cdcrMembers: CdcrMember[];
  isCdcrMembersLoading: boolean;
  onAssignCdcrMember: (userId: string) => void;
  isAssignCdcrMemberPending: boolean;
  onRemoveCdcrMember: (userId: string) => void;
  isRemoveCdcrMemberPending: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: User[];
  isSearchResultsLoading: boolean;

  // Alumni claims props
  alumniClaims: AlumniClaim[];
  isAlumniClaimsLoading: boolean;
  onApproveClaim: (claimId: string) => void;
  isApproveClaimPending: boolean;
  onRejectClaim: (claimId: string) => void;
  isRejectClaimPending: boolean;

  // Placement stats & drives props
  allDrives: PlacementDrive[];
  isAllDrivesLoading: boolean;
  onOpenDrive: (driveId: string) => void;
  isOpenDrivePending: boolean;
  onCloseDrive: (driveId: string) => void;
  isCloseDrivePending: boolean;
  sentInvites: PlacementDriveInvite[];
  isSentInvitesLoading: boolean;
  onWithdrawInvite: (inviteId: string) => void;
  isWithdrawInvitePending: boolean;
  driveInvites: PlacementDriveInvite[];
  isDriveInvitesLoading: boolean;
  onRespondToInvite: (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => void;
  isRespondToInvitePending: boolean;
  stats: PlacementStats | undefined;
  isStatsLoading: boolean;
  selectedYear: number | undefined;
  setSelectedYear: (year: number | undefined) => void;

  // Unread badge calculations
  driveInvitesCount: number;
  sentInvitesCount: number;
  alumniClaimsCount: number;
}

export function CollegeDetail({
  college,
  user,
  departments,
  isCreateDepartmentPending,
  onCreateDepartment,
  placementSummary,
  isPlacementSummaryLoading,
  isUserTpo,
  isUserCdcr,
  isTpo,
  canManageDepartments,
  onInviteCompanyClick,
  onViewApplicants,
  cdcrMembers,
  isCdcrMembersLoading,
  onAssignCdcrMember,
  isAssignCdcrMemberPending,
  onRemoveCdcrMember,
  isRemoveCdcrMemberPending,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearchResultsLoading,
  alumniClaims,
  isAlumniClaimsLoading,
  onApproveClaim,
  isApproveClaimPending,
  onRejectClaim,
  isRejectClaimPending,
  allDrives,
  isAllDrivesLoading,
  onOpenDrive,
  isOpenDrivePending,
  onCloseDrive,
  isCloseDrivePending,
  sentInvites,
  isSentInvitesLoading,
  onWithdrawInvite,
  isWithdrawInvitePending,
  driveInvites,
  isDriveInvitesLoading,
  onRespondToInvite,
  isRespondToInvitePending,
  stats,
  isStatsLoading,
  selectedYear,
  setSelectedYear,
  driveInvitesCount,
  sentInvitesCount,
  alumniClaimsCount,
}: CollegeDetailProps) {
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "tpo">("overview");
  const [tpoSubTab, setTpoSubTab] = useState<"cdcr" | "drives" | "sent-invites" | "company-invites" | "alumni" | "stats">("cdcr");
  const [departmentName, setDepartmentName] = useState("");

  const submitDepartment = (event: FormEvent) => {
    event.preventDefault();
    onCreateDepartment(departmentName).then(() => {
      setDepartmentName("");
    });
  };

  const totalPendingNotifications = driveInvitesCount + sentInvitesCount;

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
                  {college.institutionType && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Building2 size={9} /> {college.institutionType}
                    </span>
                  )}
                  {college.naacGrade && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <Award size={9} /> NAAC {college.naacGrade}
                    </span>
                  )}
                  {isUserCdcr && (
                    <>
                      {user?.collegeAdminships?.some((adm) => adm.collegeId === college.id) && !isUserTpo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                          <Shield size={9} /> College Admin
                        </span>
                      )}
                      {user?.tpoMemberships?.some((t) => t.collegeId === college.id) && !isUserTpo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck size={9} /> TPO
                        </span>
                      )}
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
            {totalPendingNotifications > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                {totalPendingNotifications}
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
                {(college.departments || departments).slice(0, 5).map((dept, i) => {
                  const count = dept._count?.profiles ?? 0;
                  const maxCount = Math.max(...(college.departments || departments).slice(0, 5).map((d) => d._count?.profiles ?? 0), 1);
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
                {!(college.departments || departments).length && (
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
                  <button className="btn-primary text-xs py-1.5 px-2.5 shrink-0" type="submit" disabled={isCreateDepartmentPending}>
                    {isCreateDepartmentPending ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
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

              {isPlacementSummaryLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
              ) : placementSummary && placementSummary.totalDrives > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold text-emerald-600">{placementSummary.placementPercent}%</p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Placement Rate</p>
                    </div>
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {placementSummary.maxPackageLPA ? `₹${placementSummary.maxPackageLPA} LPA` : "—"}
                      </p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Highest Pkg</p>
                    </div>
                    <div className="rounded-xl py-3" style={{ background: "var(--bg-surface-2)" }}>
                      <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {placementSummary.avgPackageLPA ? `₹${placementSummary.avgPackageLPA} LPA` : "—"}
                      </p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>Avg Package</p>
                    </div>
                  </div>

                  {placementSummary.topRecruiters.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Top Recruiters</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {placementSummary.topRecruiters.map((r: any) => (
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
                ? driveInvitesCount
                : tab === "sent-invites"
                ? sentInvitesCount
                : tab === "alumni"
                ? alumniClaimsCount
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

          {/* Sub-tab view router */}
          {tpoSubTab === "cdcr" && (
            <CollegeStudents
              cdcrMembers={cdcrMembers}
              isCdcrMembersLoading={isCdcrMembersLoading}
              onAssignCdcrMember={onAssignCdcrMember}
              isAssignCdcrMemberPending={isAssignCdcrMemberPending}
              onRemoveCdcrMember={onRemoveCdcrMember}
              isRemoveCdcrMemberPending={isRemoveCdcrMemberPending}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearchResultsLoading={isSearchResultsLoading}
              isUserTpo={isUserTpo}
            />
          )}

          {(tpoSubTab === "drives" || tpoSubTab === "sent-invites" || tpoSubTab === "company-invites" || tpoSubTab === "stats") && (
            <CollegePlacement
              tpoSubTab={tpoSubTab}
              isUserTpo={isUserTpo}
              isUserCdcr={isUserCdcr}
              isTpo={isTpo}
              onInviteCompanyClick={onInviteCompanyClick}
              onViewApplicants={onViewApplicants}
              allDrives={allDrives}
              isAllDrivesLoading={isAllDrivesLoading}
              onOpenDrive={onOpenDrive}
              isOpenDrivePending={isOpenDrivePending}
              onCloseDrive={onCloseDrive}
              isCloseDrivePending={isCloseDrivePending}
              sentInvites={sentInvites}
              isSentInvitesLoading={isSentInvitesLoading}
              onWithdrawInvite={onWithdrawInvite}
              isWithdrawInvitePending={isWithdrawInvitePending}
              driveInvites={driveInvites}
              isDriveInvitesLoading={isDriveInvitesLoading}
              onRespondToInvite={onRespondToInvite}
              isRespondToInvitePending={isRespondToInvitePending}
              stats={stats}
              isStatsLoading={isStatsLoading}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          )}

          {tpoSubTab === "alumni" && (
            <CollegeAlumni
              alumniClaims={alumniClaims}
              isAlumniClaimsLoading={isAlumniClaimsLoading}
              onApproveClaim={onApproveClaim}
              isApproveClaimPending={isApproveClaimPending}
              onRejectClaim={onRejectClaim}
              isRejectClaimPending={isRejectClaimPending}
            />
          )}
        </div>
      )}
    </section>
  );
}
