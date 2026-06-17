import { useState } from "react";
import {
  X,
  Loader2,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ChevronDown,
  Trophy,
  Clock,
} from "lucide-react";
import {
  useDriveApplicantsQuery,
  useUpdateDriveApplicationStatusMutation,
} from "../../hooks/usePlatformQueries";
import { PlacementDriveApplicationStatus, PLACEMENT_DRIVE_STATUS_LABELS } from "../../lib/api";
import { cleanLogoUrl, formatDate } from "../../lib/format";
import { Link } from "react-router-dom";

interface DriveApplicantsModalProps {
  driveId: string;
  driveTitle: string;
  onClose: () => void;
}

// Status actions available to TPO/Recruiter in the dropdown
const ACTIONABLE_STATUSES: PlacementDriveApplicationStatus[] = [
  "SHORTLISTED",
  "INTERVIEW_R1",
  "INTERVIEW_R2",
  "INTERVIEW_R3",
  "PPO_OFFERED",
  "SELECTED",
  "REJECTED",
];

const STATUS_CONFIG: Record<
  PlacementDriveApplicationStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  APPLIED: {
    label: "Applied",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: AlertCircle,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    icon: CheckCircle,
  },
  INTERVIEW_R1: {
    label: "Round 1 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R2: {
    label: "Round 2 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  INTERVIEW_R3: {
    label: "Round 3 Interview",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  PPO_OFFERED: {
    label: "PPO Offered",
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    icon: Trophy,
  },
  SELECTED: {
    label: "Selected 🎉",
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Not Selected",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-500",
    icon: XCircle,
  },
};


export function DriveApplicantsModal({
  driveId,
  driveTitle,
  onClose,
}: DriveApplicantsModalProps) {
  const applicantsQuery = useDriveApplicantsQuery(driveId);
  const updateStatusMutation = useUpdateDriveApplicationStatusMutation();

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const applicants = applicantsQuery.data || [];

  const filteredApplicants = applicants.filter((app) => {
    if (statusFilter === "ALL") return true;
    return app.status === statusFilter;
  });

  const handleStatusChange = async (applicationId: string, status: PlacementDriveApplicationStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ applicationId, status });
      setActiveDropdownId(null);
    } catch {
      // Error handled by query mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Placement Applicants</h2>
            <p className="text-xs text-indigo-700 font-semibold mt-0.5 max-w-[500px] truncate">
              {driveTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/70 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters and Count bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-500">
            {filteredApplicants.length} of {applicants.length} applicants
          </span>
          <div className="flex gap-1">
            {(["ALL", ...ACTIONABLE_STATUSES] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  statusFilter === status
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "ALL" ? "All" : STATUS_CONFIG[status as PlacementDriveApplicationStatus]?.label || status}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {applicantsQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
              <p className="text-xs text-slate-400 font-semibold">Loading applicants list…</p>
            </div>
          ) : applicantsQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <AlertCircle className="text-rose-500" size={28} />
              <div>
                <p className="text-sm font-bold text-slate-800">Failed to load applicants</p>
                <p className="text-xs text-slate-400 mt-1">Please try again later.</p>
              </div>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No applicants found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {statusFilter === "ALL"
                    ? "No student applications have been received for this drive."
                    : `No applicants match the filter "${STATUS_CONFIG[statusFilter]?.label}".`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplicants.map((app) => {
                const userObj = app.user;
                const profileObj = userObj?.profile;
                const currentStatus = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
                const StatusIcon = currentStatus.icon;

                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition"
                  >
                    {/* User profile details */}
                    <div className="flex items-start gap-3 min-w-0">
                      {cleanLogoUrl(profileObj?.avatarUrl) ? (
                        <img
                          src={cleanLogoUrl(profileObj?.avatarUrl)!}
                          alt={profileObj?.fullName}
                          className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold shrink-0">
                          {profileObj?.fullName?.charAt(0) || userObj?.username?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/users/${userObj?.username || userObj?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1"
                          >
                            {profileObj?.fullName || "Anonymous Student"}
                            <ExternalLink size={12} className="opacity-50" />
                          </Link>
                          <span className="text-[10px] text-slate-400">
                            @{userObj?.username}
                          </span>
                        </div>
                        {profileObj?.headline && (
                          <p className="text-xs text-slate-500 truncate max-w-sm">
                            {profileObj.headline}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Email: {userObj?.email} · Applied {formatDate(app.appliedAt)}
                        </p>
                        {app.note && (
                          <p className="text-xs text-slate-600 mt-1.5 italic bg-slate-50 border-l-2 border-slate-200 pl-2 py-0.5">
                            "{app.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status display & Update actions */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      {/* Current Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${currentStatus.bg} ${currentStatus.text}`}
                      >
                        <StatusIcon size={11} />
                        {currentStatus.label}
                      </span>

                      {/* Dropdown status update */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDropdownId((id) => (id === app.id ? null : app.id))
                          }
                          className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition"
                        >
                          Change Status
                          <ChevronDown size={12} className="opacity-60" />
                        </button>

                        {activeDropdownId === app.id && (
                          <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            {ACTIONABLE_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(app.id, status)}
                                disabled={updateStatusMutation.isPending}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 ${
                                  app.status === status
                                    ? "text-indigo-600 bg-indigo-50"
                                    : "text-slate-600"
                                }`}
                              >
                                {STATUS_CONFIG[status]?.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
