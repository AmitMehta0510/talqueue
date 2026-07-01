import { Link } from "react-router-dom";
import { ChevronDown, ExternalLink } from "lucide-react";
import { PlacementDriveApplicationStatus } from "../../../lib/api";
import { cleanLogoUrl, formatDate } from "../../../core/utils/format";

import { PlacementDriveApplication } from "../../../core/types/models";

interface ApplicantCardProps {
  app: PlacementDriveApplication;
  statusConfig: Record<
    PlacementDriveApplicationStatus,
    { label: string; bg: string; text: string; icon: React.ElementType }
  >;
  actionableStatuses: PlacementDriveApplicationStatus[];
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  onStatusChange: (appId: string, status: PlacementDriveApplicationStatus) => void;
  isPending: boolean;
}

export function ApplicantCard({
  app,
  statusConfig,
  actionableStatuses,
  activeDropdownId,
  setActiveDropdownId,
  onStatusChange,
  isPending,
}: ApplicantCardProps) {
  const userObj = app.user;
  const profileObj = userObj?.profile;
  const currentStatus = statusConfig[app.status as PlacementDriveApplicationStatus] || statusConfig.APPLIED;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-base bg-surface hover:shadow-sm transition">
      {/* User profile details */}
      <div className="flex items-start gap-3 min-w-0">
        {cleanLogoUrl(profileObj?.avatarUrl) ? (
          <img
            src={cleanLogoUrl(profileObj?.avatarUrl)!}
            alt={profileObj?.fullName}
            className="h-10 w-10 rounded-full object-cover border border-base shadow-sm shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light border border-brand-light text-brand font-bold shrink-0">
            {profileObj?.fullName?.charAt(0) || userObj?.username?.charAt(0) || "U"}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/users/${userObj?.username || userObj?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-primary hover:text-brand transition flex items-center gap-1"
            >
              {profileObj?.fullName || "Anonymous Student"}
              <ExternalLink size={12} className="opacity-50" />
            </Link>
            <span className="text-[10px] text-muted-fg">@{userObj?.username}</span>
          </div>
          {profileObj?.headline && (
            <p className="text-xs text-secondary truncate max-w-sm">
              {profileObj.headline}
            </p>
          )}
          <p className="text-[10px] text-muted-fg mt-0.5">
            Email: {userObj?.email} · Applied {formatDate(app.appliedAt)}
          </p>
          {app.note && (
            <p className="text-xs text-secondary mt-1.5 italic bg-surface-2 border-l-2 border-base pl-2 py-0.5">
              "{app.note}"
            </p>
          )}
        </div>
      </div>

      {/* Status display & Update actions */}
      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${currentStatus.bg} ${currentStatus.text}`}
        >
          <StatusIcon size={11} />
          {currentStatus.label}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdownId(activeDropdownId === app.id ? null : app.id)}
            className="flex h-8 items-center gap-1 rounded-xl border border-base bg-surface px-2.5 text-xs font-semibold text-secondary hover:border-brand hover:bg-brand-light hover:text-brand transition"
          >
            Change Status
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {activeDropdownId === app.id && (
            <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full z-50 mt-1 w-44 rounded-xl border border-base bg-surface shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {actionableStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(app.id, status)}
                  disabled={isPending}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold transition hover:bg-surface-2 ${
                    app.status === status ? "text-brand bg-brand-light" : "text-secondary"
                  }`}
                >
                  {statusConfig[status]?.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
