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
} from "lucide-react";
import { PlacementDrive } from "../../lib/api";
import {
  usePlacementDrivesForCollegeQuery,
  useApplyToDriveMutation,
  useMyDriveApplicationsQuery,
} from "../../hooks/usePlatformQueries";
import { EmptyState, InlineLoader, ErrorState } from "../ui";
import { cleanLogoUrl, formatDate } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";

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
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-400",
  },
  ONGOING: {
    label: "Registrations Open",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  CLOSED: {
    label: "Closed",
    chip: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
};

const APP_STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APPLIED: { label: "Applied", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <CheckCircle2 size={11} /> },
  SHORTLISTED: { label: "Shortlisted", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={11} /> },
  REJECTED: { label: "Not Selected", color: "text-rose-600 bg-rose-50 border-rose-200", icon: <XCircle size={11} /> },
  HIRED: { label: "Hired! 🎉", color: "text-violet-600 bg-violet-50 border-violet-200", icon: <CheckCircle2 size={11} /> },
};

// ---------------------------------------------------------------------------
// Drive Card
// ---------------------------------------------------------------------------
function DriveCard({
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

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Header stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />

      <div className="p-5 space-y-4">
        {/* Company + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {cleanLogoUrl(drive.company?.logoUrl) ? (
              <img
                src={cleanLogoUrl(drive.company?.logoUrl)!}
                alt={drive.company?.name}
                className="h-11 w-11 rounded-xl border border-slate-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Building2 size={20} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                {drive.driveTitle}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {drive.company?.name}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Roles */}
        {drive.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {drive.roles.map((role) => (
              <span
                key={role}
                className="rounded-lg bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-500">
          {drive.driveDate && (
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-400" />
              Drive: {formatDate(drive.driveDate)}
            </span>
          )}
          {drive.applyDeadline && (
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="text-slate-400" />
              Deadline: {formatDate(drive.applyDeadline)}
            </span>
          )}
          {compensation && (
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 col-span-2">
              <IndianRupee size={11} className="text-slate-400" />
              {compensation}
            </span>
          )}
        </div>

        {/* Eligibility */}
        {(drive.minCgpa || drive.eligibleBranches.length > 0 || drive.eligibleYears.length > 0) && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <GraduationCap size={10} /> Eligibility
            </p>
            <div className="flex flex-wrap gap-1.5">
              {drive.minCgpa && (
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  CGPA ≥ {drive.minCgpa}
                </span>
              )}
              {drive.eligibleYears.map((y) => (
                <span
                  key={y}
                  className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                >
                  {y === 4 ? "Final Year" : `${y}${["st","nd","rd"][y-1] || "th"} Year`}
                </span>
              ))}
              {drive.eligibleBranches.slice(0, 3).map((b) => (
                <span
                  key={b}
                  className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                >
                  {b}
                </span>
              ))}
              {drive.eligibleBranches.length > 3 && (
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  +{drive.eligibleBranches.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description snippet */}
        {drive.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{drive.description}</p>
        )}

        {/* CTA */}
        {drive.status !== "CLOSED" && (
          hasApplied ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={15} />
              Applied — Profile Shared
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onApply(drive.id)}
              disabled={isApplying}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 shadow-sm disabled:opacity-60"
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
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Briefcase size={14} className="text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">My Drive Applications</h3>
        <span className="ml-auto rounded-full bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5">{apps.length}</span>
      </div>
      <div className="space-y-2">
        {apps.map((app) => {
          const style = APP_STATUS_STYLES[app.status] || APP_STATUS_STYLES["APPLIED"];
          return (
            <div key={app.id} className="flex items-center gap-3 rounded-xl bg-white border border-blue-100 px-3.5 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{app.drive?.driveTitle}</p>
                <p className="text-[10px] text-slate-400">{app.drive?.company?.name}</p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.color}`}>
                {style.icon}
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <GraduationCap size={28} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Link your college to see campus drives</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
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

  const drives = drivesQuery.data || [];

  if (drives.length === 0) {
    return (
      <div className="space-y-6">
        <MyApplicationsTracker />
        {/* Info banner */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 flex gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
            <Info size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900">What are Campus Drives?</h3>
            <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
              Companies partner with your college to conduct placement drives — mass hiring events where they visit campus, hold aptitude tests, technical interviews, and extend offers. These drives are exclusive to students of your college.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users size={28} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">No campus drives yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Your college's upcoming placement drives will appear here once companies register them. Check back closer to placement season.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const upcoming = drives.filter((d) => d.status === "UPCOMING");
  const ongoing = drives.filter((d) => d.status === "ONGOING");

  return (
    <div className="space-y-6">
      <MyApplicationsTracker />

      {ongoing.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
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
    </div>
  );
}
