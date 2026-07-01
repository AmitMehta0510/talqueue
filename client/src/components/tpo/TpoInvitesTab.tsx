import { Calendar, Building2, Clock, GraduationCap, Briefcase, CheckCircle, Loader2 } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { formatDate } from "../../core/utils/format";

interface DriveInvite {
  id: string;
  driveTitle: string;
  status: string;
  message?: string | null;
  driveDate?: string | null;
  applyDeadline?: string | null;
  minCgpa?: number | null;
  roles?: string[] | null;
  company?: {
    name: string;
    logoUrl?: string | null;
  } | null;
  placementDrive?: {
    id: string;
  } | null;
}

interface TpoInvitesTabProps {
  invites: DriveInvite[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRespondToInvite: (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => void;
  isRespondPending: boolean;
}

export function TpoInvitesTab({
  invites,
  isLoading,
  isError,
  onRetry,
  onRespondToInvite,
  isRespondPending,
}: TpoInvitesTabProps) {
  if (isLoading) {
    return <InlineLoader label="Loading invites..." />;
  }

  if (isError) {
    return <ErrorState title="Error fetching invites" onRetry={onRetry} />;
  }

  if (!invites || invites.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No pending invitations"
        text="When companies request your college for recruitment drives, they will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Incoming Placement Drive Requests
          </h3>
          <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">
            Review and accept campus placement requests from companies targeting your students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-55 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {invite.company?.logoUrl ? (
                      <img src={invite.company.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-955 dark:text-white leading-tight">
                      {invite.driveTitle}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-405">{invite.company?.name}</p>
                  </div>
                </div>

                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  invite.status === "PENDING" ? "bg-amber-50 dark:bg-amber-955/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" :
                  invite.status === "ACCEPTED" ? "bg-green-50 dark:bg-green-955/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700" :
                  invite.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-955/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700" :
                  "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}>
                  {invite.status}
                </span>
              </div>

              {invite.message && (
                <p className="text-xs italic bg-gray-50 dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850" style={{ color: "var(--text-secondary)" }}>
                  "{invite.message}"
                </p>
              )}

              <div className="space-y-2 text-xs text-gray-605 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-850">
                {invite.driveDate && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <strong>Proposed Date:</strong> {formatDate(invite.driveDate)}
                  </p>
                )}
                {invite.applyDeadline && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <strong>Deadline:</strong> {formatDate(invite.applyDeadline)}
                  </p>
                )}
                {invite.minCgpa && (
                  <p className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                    <strong>Cutoff CGPA:</strong> {invite.minCgpa.toFixed(2)}
                  </p>
                )}
                {invite.roles && invite.roles.length > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                    <strong>Roles:</strong> {invite.roles.join(", ")}
                  </p>
                )}
              </div>
            </div>

            {invite.status === "PENDING" && (
              <div className="flex gap-3 border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                <button
                  onClick={() => onRespondToInvite({ inviteId: invite.id, action: "ACCEPT" })}
                  disabled={isRespondPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isRespondPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Accept & Create Drive
                </button>
                <button
                  onClick={() => onRespondToInvite({ inviteId: invite.id, action: "REJECT" })}
                  disabled={isRespondPending}
                  className="border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-705 dark:text-gray-300 font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}

            {invite.status === "ACCEPTED" && invite.placementDrive && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-bold border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                <CheckCircle className="h-4 w-4" />
                <span>Drive created successfully</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
