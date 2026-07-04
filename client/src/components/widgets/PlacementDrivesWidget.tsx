import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Inbox } from "lucide-react";
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

  const daysLeft = (deadline: string | Date) => {
    const diffTime = new Date(deadline).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeftText = (deadline: string | Date) => {
    const days = daysLeft(deadline);
    if (days < 0) return "Closed";
    if (days === 0) return "Today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  };

  if (isLoading) {
    return (
      <WidgetContainer title="Placement Drives">
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
      <WidgetContainer title="Placement Drives">
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <span>
            {!collegeId ? "College verification required to view campus drives" : "Failed to load active drives"}
          </span>
          {!collegeId && (
            <Link
              to="/campus/profile"
              className="btn-primary mt-1 text-[10px] py-1.5 px-3.5 rounded-lg"
            >
              Verify College Now →
            </Link>
          )}
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer title="Placement Drives">
      {!drives || drives.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <Inbox size={24} className="text-muted" />
          <span>No active drives for your college</span>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-3.5">
            {drives.slice(0, 3).map((drive: PlacementDrive) => {
              const isUrgent = drive.applyDeadline ? daysLeft(drive.applyDeadline) <= 3 : false;
              const deadlineDate = drive.applyDeadline ? new Date(drive.applyDeadline) : null;
              const formattedDeadline = deadlineDate
                ? deadlineDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : null;

              return (
                <Link
                  key={drive.id}
                  to={`/campus/placements?activeDriveId=${drive.id}`}
                  className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
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

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                        {drive.company?.name || "Company"}
                      </h4>
                      <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                        {drive.driveTitle || "Campus Hiring"}
                      </p>
                      {formattedDeadline && (
                        <p className="text-[9px] text-muted mt-0.5">
                          Register before {formattedDeadline}
                        </p>
                      )}
                    </div>
                  </div>

                  {drive.applyDeadline && (
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                      isUrgent
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}>
                      {daysLeftText(drive.applyDeadline)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <Link
            to="/campus/placements"
            className="text-[11px] text-brand hover:underline font-bold mt-4 block"
          >
            View all drives →
          </Link>
        </div>
      )}
    </WidgetContainer>
  );
}
