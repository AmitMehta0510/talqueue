import { useState } from "react";
import {
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  IndianRupee,
  Users,
  Zap,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { PlacementDrive } from "../../lib/api";
import {
  usePlacementDrivesForCollegeQuery,
  useApplyToDriveMutation,
  useMyDriveApplicationsQuery,
  useDriveEligibilityQuery,
} from "../../hooks/usePlatformQueries";
import { EmptyState, InlineLoader, ErrorState } from "../ui";
import { cleanLogoUrl, formatDate } from "../../core/utils/format";
import { useAuth } from "../../core/contexts/AuthContext";
import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatStipend(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K/mo` : `₹${n}/mo`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(1)} LPA` : `₹${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

const STATUS_STYLES: Record<
  PlacementDrive["status"],
  { label: string; chip: string; dot: string }
> = {
  UPCOMING: {
    label: "Upcoming",
    chip: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60",
    dot: "bg-indigo-400",
  },
  ONGOING: {
    label: "Registrations Open",
    chip: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60",
    dot: "bg-brand animate-pulse",
  },
  CLOSED: {
    label: "Closed",
    chip: "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60",
    dot: "bg-slate-400",
  },
};

const APP_STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APPLIED: { label: "Applied", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60", icon: <CheckCircle2 size={11} /> },
  SHORTLISTED: { label: "Shortlisted", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60", icon: <CheckCircle2 size={11} /> },
  INTERVIEW_R1: { label: "Round 1 Interview", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60", icon: <Clock size={11} /> },
  INTERVIEW_R2: { label: "Round 2 Interview", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60", icon: <Clock size={11} /> },
  INTERVIEW_R3: { label: "Round 3 Interview", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60", icon: <Clock size={11} /> },
  PPO_OFFERED: { label: "PPO Offered", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60", icon: <Zap size={11} /> },
  SELECTED: { label: "Selected! 🎉", color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/60", icon: <CheckCircle2 size={11} /> },
  REJECTED: { label: "Not Selected", color: "text-rose-600 dark:text-rose-455 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60", icon: <XCircle size={11} /> },
  WITHDRAWN: { label: "Withdrawn", color: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60", icon: <XCircle size={11} /> },
};

// ---------------------------------------------------------------------------
// Drive Card
// ---------------------------------------------------------------------------
export function DriveCard({
  drive,
  hasApplied,
  isApplying,
  onApply,
}: {
  drive: PlacementDrive;
  hasApplied: boolean;
  isApplying: boolean;
  onApply: (driveId: string) => void;
}) {
  const status = STATUS_STYLES[drive.status];
  const stipend = formatStipend(drive.stipendMin, drive.stipendMax);
  const salary = formatSalary(drive.salaryMin, drive.salaryMax);
  const compensation = stipend || salary;

  // Fetch student eligibility pre-check
  const eligibilityQuery = useDriveEligibilityQuery(drive.id);
  const eligibility = eligibilityQuery.data; // { eligible: boolean, reasons: string[], missingFields: string[] }

  return (
    <article className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 justify-between overflow-hidden flex flex-col rounded-2xl shadow-sm">
      <div>
        {/* Header stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />

        <div className="p-5 space-y-4">
          {/* Company + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {cleanLogoUrl(drive.company?.logoUrl) ? (
                <img
                  src={cleanLogoUrl(drive.company?.logoUrl)!}
                  alt={drive.company?.name}
                  className="h-11 w-11 rounded-xl border border-base object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 border border-base text-muted-fg">
                  <Building2 size={20} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-primary leading-snug group-hover:text-brand transition-colors">
                  {drive.driveTitle}
                </h3>
                <p className="text-xs font-semibold text-secondary mt-0.5">
                  {drive.company?.name}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                  drive.driveType === "INTERNSHIP"
                    ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/60"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60"
                }`}
              >
                {drive.driveType === "INTERNSHIP" ? "Internship" : "Full-Time"}
                {drive.driveType === "INTERNSHIP" && drive.internshipDurationMonths && (
                  <span className="text-[8px] font-normal opacity-75">({drive.internshipDurationMonths}m)</span>
                )}
              </span>
              
              {/* Eligibility Badge */}
              {eligibility && !eligibility.eligible && !hasApplied && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-indigo-900/60 px-2 py-0.5 text-[9px] font-bold">
                  <AlertTriangle size={10} /> Ineligible
                </span>
              )}
            </div>
          </div>

          {/* Roles */}
          {drive.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {drive.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-750 dark:text-blue-450"
                >
                  {role}
                </span>
              ))}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-secondary">
            {drive.driveDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-muted-fg" />
                Drive: {formatDate(drive.driveDate)}
              </span>
            )}
            {drive.applyDeadline && (
              <span className="flex items-center gap-1.5">
                <Clock size={11} className="text-muted-fg" />
                Deadline: {formatDate(drive.applyDeadline)}
              </span>
            )}
            {compensation && (
              <span className="flex items-center gap-1.5 font-semibold text-primary col-span-2">
                <IndianRupee size={11} className="text-muted-fg" />
                {compensation}
              </span>
            )}
          </div>

          {/* Eligibility Criteria chips */}
          {(drive.minCgpa || drive.eligibleBranches.length > 0 || drive.eligibleYears.length > 0) && (
            <div className="rounded-xl bg-surface-2 border border-base px-3.5 py-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-fg flex items-center gap-1">
                <GraduationCap size={10} /> Target Criteria
              </p>
              <div className="flex flex-wrap gap-1.5">
                {drive.minCgpa && (
                  <span className="rounded-md bg-surface border border-base px-2 py-0.5 text-[10px] font-semibold text-secondary">
                    CGPA ≥ {drive.minCgpa}
                  </span>
                )}
                {drive.eligibleYears.map((y) => (
                  <span
                    key={y}
                    className="rounded-md bg-surface border border-base px-2 py-0.5 text-[10px] font-semibold text-secondary"
                  >
                    {y === 4 ? "Final Year" : `${y}${["st","nd","rd"][y-1] || "th"} Year`}
                  </span>
                ))}
                {drive.eligibleBranches.slice(0, 3).map((b) => (
                  <span
                    key={b}
                    className="rounded-md bg-surface border border-base px-2 py-0.5 text-[10px] font-semibold text-secondary"
                  >
                    {b}
                  </span>
                ))}
                {drive.eligibleBranches.length > 3 && (
                  <span className="rounded-md bg-surface border border-base px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
                    +{drive.eligibleBranches.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Detailed Ineligibility Reasons */}
          {eligibility && !eligibility.eligible && !hasApplied && eligibility.reasons.length > 0 && (
            <div className="rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 p-3 text-[10px] font-semibold text-rose-700 dark:text-rose-450 space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800 dark:text-rose-400">
                <Info size={12} /> Ineligibility Reasons:
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {eligibility.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Description snippet */}
          {drive.description && (
            <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{drive.description}</p>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <div className="p-5 pt-0">
        {drive.status !== "CLOSED" && (
          hasApplied ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-light border border-brand-light px-4 py-2.5 text-sm font-bold text-brand">
              <CheckCircle2 size={15} />
              Applied — Profile Shared
            </div>
          ) : eligibility && !eligibility.eligible ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-3 border border-base px-4 py-2.5 text-sm font-bold text-muted-fg select-none">
              <XCircle size={15} />
              Ineligible to Apply
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onApply(drive.id)}
              disabled={isApplying}
              className="w-full flex items-center justify-center gap-2 btn-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Apply for Drive
              {!isApplying && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </button>
          )
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// My Applications Tracker
// ---------------------------------------------------------------------------
function MyApplicationsTracker() {
  const appsQuery = useMyDriveApplicationsQuery();
  const apps = appsQuery.data || [];

  if (appsQuery.isLoading) return null;
  if (apps.length === 0) return null;

  return (
    <section className="rounded-2xl border border-blue-100 dark:border-indigo-950 bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-white dark:from-indigo-950/20 dark:via-slate-950/40 dark:to-slate-950 p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Briefcase size={15} className="text-blue-600 dark:text-blue-450" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-450">My Drive Applications</h3>
        <span className="ml-auto rounded-full bg-blue-600 dark:bg-blue-550 text-white text-[10px] font-bold px-2.5 py-0.5">{apps.length}</span>
      </div>
      <div className="space-y-2.5">
        {apps.map((app) => {
          const style = APP_STATUS_STYLES[app.status] || APP_STATUS_STYLES["APPLIED"];
          return (
            <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 px-4 py-3 hover:shadow-sm transition-all duration-200">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{app.drive?.driveTitle}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{app.drive?.company?.name}</p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${style.color}`}>
                {style.icon}
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
      <Link
        to="/placements"
        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-blue-600 dark:text-blue-400 text-xs font-bold py-2.5 rounded-xl shadow-sm transition"
      >
        <Briefcase size={13} />
        Go to Placements Dashboard
        <ChevronRight size={13} className="ml-1 opacity-60 animate-bounce-horizontal" />
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PlacementDrivesTab
// ---------------------------------------------------------------------------
interface PlacementDrivesTabProps {
  collegeId?: string | null;
}

export function PlacementDrivesTab({ collegeId }: PlacementDrivesTabProps) {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<"ALL" | "PLACEMENT" | "INTERNSHIP">("ALL");
  const drivesQuery = usePlacementDrivesForCollegeQuery(collegeId);
  const appsQuery = useMyDriveApplicationsQuery();
  const applyMutation = useApplyToDriveMutation();

  const appliedDriveIds = new Set((appsQuery.data || []).map((a) => a.driveId));
  const applyingDriveId = applyMutation.isPending
    ? (applyMutation.variables as { driveId: string } | undefined)?.driveId
    : null;

  const handleApply = (driveId: string) => {
    if (!user) return;
    applyMutation.mutate({ driveId });
  };

  if (!collegeId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light border border-brand-light text-brand">
          <GraduationCap size={28} />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">Link your college to see campus drives</p>
          <p className="text-xs text-muted-fg mt-1 max-w-xs">
            Add your college to your profile and we'll show you placement drives from companies targeting your campus.
          </p>
        </div>
      </div>
    );
  }

  if (drivesQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <InlineLoader label="Loading campus drives…" />
      </div>
    );
  }

  if (drivesQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load campus drives"
        text="Please try again."
        onRetry={() => drivesQuery.refetch()}
      />
    );
  }

  const allDrives = drivesQuery.data || [];

  if (allDrives.length === 0) {
    return (
      <div className="space-y-6">
        <MyApplicationsTracker />
        {/* Info banner */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-5 flex gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Info size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">What are Campus Drives?</h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-455 mt-1 leading-relaxed">
              Companies partner with your college to conduct placement drives — mass hiring events where they visit campus, hold aptitude tests, technical interviews, and extend offers. These drives are exclusive to students of your college.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 border border-base text-muted-fg">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">No campus drives yet</p>
            <p className="text-xs text-muted-fg mt-1 max-w-sm">
              Your college's upcoming placement drives will appear here once companies register them. Check back closer to placement season.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const drives = allDrives.filter((d) => {
    if (filterType === "ALL") return true;
    const type = d.driveType || "PLACEMENT";
    return type === filterType;
  });

  const upcoming = drives.filter((d) => d.status === "UPCOMING");
  const ongoing = drives.filter((d) => d.status === "ONGOING");

  return (
    <div className="space-y-6">
      <MyApplicationsTracker />

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-2 border border-base w-fit">
        {(["ALL", "PLACEMENT", "INTERNSHIP"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === t
                ? "bg-surface text-primary border border-base shadow-sm"
                : "text-muted-fg hover:text-primary"
            }`}
          >
            {t === "ALL" ? "All Drives" : t === "PLACEMENT" ? "Placements" : "Internships"}
          </button>
        ))}
      </div>

      {drives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-surface border border-base rounded-2xl shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 border border-base text-muted-fg">
            <Briefcase size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">No drives found</p>
            <p className="text-xs text-muted-fg mt-1 max-w-xs">
              There are no campus drives of this type currently posted.
            </p>
          </div>
        </div>
      ) : (
        <>
          {ongoing.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                  Registrations Open ({ongoing.length})
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {ongoing.map((drive) => (
                  <DriveCard
                    key={drive.id}
                    drive={drive}
                    hasApplied={appliedDriveIds.has(drive.id)}
                    isApplying={applyingDriveId === drive.id}
                    onApply={handleApply}
                  />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-fg pl-1">
                Upcoming ({upcoming.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((drive) => (
                  <DriveCard
                    key={drive.id}
                    drive={drive}
                    hasApplied={appliedDriveIds.has(drive.id)}
                    isApplying={applyingDriveId === drive.id}
                    onApply={handleApply}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
