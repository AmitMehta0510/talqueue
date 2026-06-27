import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
  Building2,
  Calendar,
  Briefcase,
  FileText,
  ExternalLink,
  ChevronDown,
  Trophy,
  Star,
} from "lucide-react";
import {
  useDriveApplicantsQuery,
  useUpdateDriveApplicationStatusMutation,
  useClosePlacementDriveMutation,
} from "../hooks/usePlatformQueries";
import { InlineLoader, ErrorState, Avatar } from "../components/ui";
import { PlacementDriveApplicationStatus } from "../lib/api";

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: PlacementDriveApplicationStatus; label: string; color: string }[] = [
  { value: "APPLIED", label: "Applied", color: "bg-slate-500/15 text-slate-500 border-slate-500/20" },
  { value: "SHORTLISTED", label: "Shortlisted", color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { value: "INTERVIEW_R1", label: "Interview R1", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { value: "INTERVIEW_R2", label: "Interview R2", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { value: "INTERVIEW_R3", label: "Interview R3", color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { value: "SELECTED", label: "Selected", color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
  { value: "REJECTED", label: "Rejected", color: "bg-rose-500/15 text-rose-500 border-rose-500/20" },
  { value: "WITHDRAWN", label: "Withdrawn", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" },
];

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg?.color || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
      {cfg?.label || status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function RecruiterDrivePage() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionPending, setBulkActionPending] = useState(false);

  const applicantsQuery = useDriveApplicantsQuery(driveId);
  const updateStatusMutation = useUpdateDriveApplicationStatusMutation();
  const closeDriveMutation = useClosePlacementDriveMutation();

  const applicants = applicantsQuery.data || [];

  // Extract unique branches for filter
  const branches = useMemo(() => {
    const set = new Set<string>();
    applicants.forEach((app: any) => {
      const branch = app.user?.profile?.department?.name || app.user?.profile?.major;
      if (branch) set.add(branch);
    });
    return Array.from(set).sort();
  }, [applicants]);

  // Filtered applicants
  const filtered = useMemo(() => {
    return applicants.filter((app: any) => {
      const name = (app.user?.profile?.fullName || app.user?.username || "").toLowerCase();
      const branch = app.user?.profile?.department?.name || app.user?.profile?.major || "";
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
      const matchesBranch = branchFilter === "ALL" || branch === branchFilter;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [applicants, search, statusFilter, branchFilter]);

  // Stats summary
  const stats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    applicants.forEach((app: any) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });
    return statusCounts;
  }, [applicants]);

  const handleStatusChange = async (applicationId: string, status: PlacementDriveApplicationStatus) => {
    await updateStatusMutation.mutateAsync({ applicationId, status });
  };

  const handleBulkShortlist = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateStatusMutation.mutateAsync({ applicationId: id, status: "SHORTLISTED" })
        )
      );
      setSelectedIds(new Set());
    } finally {
      setBulkActionPending(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a: any) => a.id)));
    }
  };

  if (applicantsQuery.isLoading) {
    return <div className="flex justify-center py-20"><InlineLoader label="Loading drive details..." /></div>;
  }

  if (applicantsQuery.isError) {
    return (
      <ErrorState title="Failed to load drive" onRetry={() => applicantsQuery.refetch()} />
    );
  }

  const drive = (applicantsQuery.data as any)?.[0]?.drive || null;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold transition hover:text-indigo-500"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} /> Back to Recruiter Console
        </button>
      </div>

      {/* Drive Info Header */}
      <div className="panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                {drive?.title || "Campus Placement Drive"}
              </h1>
              {drive?.status && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  drive.status === "OPEN" ? "bg-indigo-500/15 text-indigo-500 border-indigo-500/20" :
                  drive.status === "CLOSED" ? "bg-slate-500/15 text-slate-500 border-slate-500/20" :
                  "bg-rose-500/15 text-rose-500 border-rose-500/20"
                }`}>
                  {drive.status}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              {drive?.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={12} /> {drive.company.name}
                </span>
              )}
              {drive?.targetCollege && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={12} /> {drive.targetCollege.name}
                </span>
              )}
              {drive?.driveDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {drive?.driveType && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={12} /> {drive.driveType.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          {drive?.status === "OPEN" && (
            <button
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition shrink-0"
              onClick={() => { if (driveId) closeDriveMutation.mutate(driveId); }}
              disabled={closeDriveMutation.isPending}
            >
              {closeDriveMutation.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              Close Drive
            </button>
          )}
        </div>

        {/* Eligibility Criteria */}
        {(drive?.minCgpa || drive?.eligibleBranches?.length || drive?.maxBacklogs !== undefined) && (
          <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Eligibility:</span>
            {drive.minCgpa && (
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold">Min CGPA: {drive.minCgpa}</span>
            )}
            {drive.maxBacklogs !== undefined && drive.maxBacklogs !== null && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">Max Backlogs: {drive.maxBacklogs}</span>
            )}
            {drive.eligibleBranches?.map((b: string) => (
              <span key={b} className="text-xs px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 font-semibold">{b}</span>
            ))}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { label: "Total", count: applicants.length, color: "text-indigo-500" },
            { label: "Shortlisted", count: stats["SHORTLISTED"] || 0, color: "text-blue-500" },
            { label: "Selected", count: stats["SELECTED"] || 0, color: "text-green-500" },
            { label: "Rejected", count: stats["REJECTED"] || 0, color: "text-rose-500" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
              <div className={`text-2xl font-black ${color}`}>{count}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Applicant Pipeline Panel */}
      <div className="panel p-0 overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: "var(--text-muted)" }} />
            <input
              className="field pl-9 text-sm"
              placeholder="Search applicant by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="field text-xs py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {branches.length > 0 && (
              <select
                className="field text-xs py-2"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-500/5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {selectedIds.size} selected
            </span>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition disabled:opacity-50"
              onClick={handleBulkShortlist}
              disabled={bulkActionPending}
            >
              {bulkActionPending ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
              Shortlist Selected
            </button>
            <button
              className="text-xs text-rose-500 hover:text-rose-400 transition"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        {/* Applicants List */}
        {applicantsQuery.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>No applicants found</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {applicants.length > 0 ? "Try adjusting your filters" : "No students have applied yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--bg-surface-2)" }}>
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                />
              </div>
              <div className="col-span-4">Applicant</div>
              <div className="col-span-2">CGPA / Branch</div>
              <div className="col-span-2">Year</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>

            {filtered.map((app: any) => {
              const profile = app.user?.profile;
              const name = profile?.fullName || app.user?.username || "Unknown";
              const branch = profile?.department?.name || profile?.major || "—";
              const cgpa = app.user?.educations?.[0]?.cgpa;
              const currentYear = app.user?.educations?.[0]?.currentYear;
              const resumeUrl = profile?.resumeUrl;
              const isSelected = selectedIds.has(app.id);

              return (
                <div
                  key={app.id}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-3 items-center transition hover:bg-[var(--bg-surface-2)] ${isSelected ? "bg-indigo-500/5" : ""}`}
                >
                  {/* Checkbox */}
                  <div className="hidden sm:flex col-span-1 items-center">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={isSelected}
                      onChange={() => toggleSelect(app.id)}
                    />
                  </div>

                  {/* Applicant Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar user={app.user} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{name}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{app.user?.username}</div>
                    </div>
                  </div>

                  {/* CGPA / Branch */}
                  <div className="col-span-2 space-y-0.5">
                    {cgpa !== undefined && cgpa !== null && (
                      <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        <Trophy size={11} className="inline mr-1 text-amber-500" />{cgpa}
                      </div>
                    )}
                    <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{branch}</div>
                  </div>

                  {/* Year */}
                  <div className="col-span-2">
                    {currentYear && (
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Year {currentYear}
                      </span>
                    )}
                  </div>

                  {/* Current Status */}
                  <div className="col-span-2">
                    <StatusPill status={app.status} />
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center gap-2">
                    {resumeUrl && (
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-400 transition"
                        title="View Resume"
                      >
                        <FileText size={14} />
                      </a>
                    )}
                    <Link
                      to={`/profile/${app.user?.username}`}
                      className="text-slate-500 hover:text-indigo-400 transition"
                      title="View Profile"
                    >
                      <ExternalLink size={14} />
                    </Link>

                    {/* Status Dropdown */}
                    <div className="relative group">
                      <button
                        className="flex items-center gap-0.5 text-[10px] font-bold hover:text-indigo-500 transition"
                        style={{ color: "var(--text-muted)" }}
                        title="Change status"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <div className="absolute right-0 top-full z-20 hidden group-hover:flex group-focus-within:flex flex-col gap-0.5 rounded-xl border p-1.5 shadow-xl min-w-[140px]"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                      >
                        {STATUS_OPTIONS.filter((s) => s.value !== app.status).map((opt) => (
                          <button
                            key={opt.value}
                            className="text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] transition font-medium w-full"
                            style={{ color: "var(--text-secondary)" }}
                            onClick={() => handleStatusChange(app.id, opt.value)}
                            disabled={updateStatusMutation.isPending}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {applicants.length} applicants
          </div>
        )}
      </div>
    </div>
  );
}
