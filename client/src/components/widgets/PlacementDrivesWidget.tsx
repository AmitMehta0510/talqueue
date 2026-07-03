import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, Inbox } from "lucide-react";
import {
  useMyFullProfileQuery,
  usePlacementDrivesForCollegeQuery,
} from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { cleanLogoUrl } from "../../core/utils/format";
import { PlacementDrive } from "../../lib/api";

export function PlacementDrivesWidget() {
  const profileQuery = useMyFullProfileQuery();
  const collegeId = profileQuery.data?.profile?.collegeId;

  const { data: drives, isLoading: isDrivesLoading, error } = usePlacementDrivesForCollegeQuery(collegeId);

  const isLoading = profileQuery.isLoading || isDrivesLoading;

  const headerAction = (
    <Link
      to="/career/placements"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      View Board
      <ChevronRight size={10} />
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title="Active Campus Drives" action={headerAction}>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </WidgetContainer>
    );
  }

  if (error || !collegeId) {
    return (
      <WidgetContainer title="Active Campus Drives" action={headerAction}>
        <div className="text-center py-4 text-xs text-muted">
          {!collegeId ? "College verification required to view campus drives" : "Failed to load active drives"}
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer title="Active Campus Drives" action={headerAction}>
      {!drives || drives.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <Inbox size={24} className="text-muted" />
          <span>No active drives for your college</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {drives.slice(0, 4).map((drive: PlacementDrive) => {
            const packageText = drive.driveType === "INTERNSHIP"
              ? (drive.stipendMin ? `${drive.stipendMin} Stipend` : "Internship")
              : (drive.salaryMax ? `${drive.salaryMax} LPA` : "Full-Time");
            
            const batchYear = drive.eligibleYears?.[0];

            return (
              <Link
                key={drive.id}
                to={`/career/placements?activeDriveId=${drive.id}`}
                className="flex items-start gap-3 p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
              >
                {/* Company Logo / Briefcase Icon */}
                {drive.company?.logoUrl ? (
                  <img
                    src={cleanLogoUrl(drive.company.logoUrl) || undefined}
                    alt={drive.company.name}
                    className="h-10 w-10 rounded-xl object-cover border border-[color:var(--border)] bg-white shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                    <Briefcase size={16} />
                  </div>
                )}

                {/* Drive Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                    {drive.driveTitle || drive.company?.name || "Placement Drive"}
                  </h4>
                  <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                    {drive.company?.name || "Campus Hiring"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-muted">
                    {packageText && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/10">
                        {packageText}
                      </span>
                    )}
                    {batchYear && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[9px] font-extrabold border border-[color:var(--border)]">
                        Batch {batchYear}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </WidgetContainer>
  );
}
