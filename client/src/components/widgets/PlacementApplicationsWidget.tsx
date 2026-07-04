import React from "react";
import { Link } from "react-router-dom";
import { Clock, Trophy, CheckCircle2, XCircle, AlertCircle, Briefcase, ChevronRight } from "lucide-react";
import { useMyDriveApplicationsQuery } from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { PlacementDriveApplicationStatus } from "../../lib/api";

const STATUS_CONFIG: Record<
  PlacementDriveApplicationStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  APPLIED: {
    label: "Applied",
    bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: AlertCircle,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: CheckCircle2,
  },
  INTERVIEW_R1: {
    label: "Round 1 Interview",
    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  INTERVIEW_R2: {
    label: "Round 2 Interview",
    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  INTERVIEW_R3: {
    label: "Round 3 Interview",
    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  PPO_OFFERED: {
    label: "PPO Offered",
    bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: Trophy,
  },
  SELECTED: {
    label: "Selected 🎉",
    bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/30",
    text: "text-violet-700 dark:text-violet-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Not Selected",
    bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/30",
    text: "text-rose-700 dark:text-rose-400",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    bg: "bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/30",
    text: "text-slate-500 dark:text-slate-400",
    icon: XCircle,
  },
};

export function PlacementApplicationsWidget() {
  const { data: apps, isLoading, error } = useMyDriveApplicationsQuery();

  const headerAction = (
    <Link
      to="/campus/placements"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      View Applications
      <ChevronRight size={10} />
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title="Your Applications" action={headerAction}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-3 border rounded-xl border-[color:var(--border)] space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBlock className="h-3.5 w-3/4" />
                  <SkeletonBlock className="h-2.5 w-1/2" />
                </div>
              </div>
              <SkeletonBlock className="h-4 w-1/3 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </WidgetContainer>
    );
  }

  if (error || !apps || apps.length === 0) {
    return null;
  }

  // Show top 3 active applications
  const activeApps = apps.slice(0, 3);

  return (
    <WidgetContainer title="Your Applications" action={headerAction}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeApps.map((app) => {
          const drive = app.drive;
          const statusInfo = STATUS_CONFIG[app.status] || {
            label: app.status,
            bg: "bg-slate-50 border-slate-200",
            text: "text-slate-700",
            icon: AlertCircle,
          };
          const StatusIcon = statusInfo.icon;
          const companyLogo = drive?.company?.logoUrl;
          const companyName = drive?.company?.name || "Campus Hiring";

          return (
            <Link
              key={app.id}
              to={`/campus/placements?activeDriveId=${drive?.id}`}
              className="p-3 border rounded-xl hover:border-brand-glow hover:bg-[color:var(--bg-surface-2)] transition-all duration-200 flex flex-col justify-between border-[color:var(--border)] h-full"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="h-8 w-8 rounded-lg object-cover border border-[color:var(--border)] bg-white shrink-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand-light text-brand shrink-0 border border-brand/5">
                      <Briefcase size={14} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">
                      {drive?.driveTitle || companyName}
                    </h4>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {companyName}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusInfo.bg} ${statusInfo.text}`}
                  >
                    <StatusIcon size={10} />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </WidgetContainer>
  );
}
