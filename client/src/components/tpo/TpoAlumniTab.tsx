import { CheckCircle, XCircle, UserCheck } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";

interface AlumniClaim {
  id: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  endYear?: number | null;
  user?: {
    username: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
}

interface TpoAlumniTabProps {
  claims: AlumniClaim[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onApprove: (claimId: string) => void;
  onReject: (claimId: string) => void;
  isActionPending: boolean;
}

export function TpoAlumniTab({
  claims,
  isLoading,
  isError,
  onRetry,
  onApprove,
  onReject,
  isActionPending,
}: TpoAlumniTabProps) {
  if (isLoading) {
    return <InlineLoader label="Loading alumni requests..." />;
  }

  if (isError) {
    return <ErrorState title="Error fetching alumni" onRetry={onRetry} />;
  }

  if (!claims || claims.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No pending claims"
        text="All student alumni claims are verified!"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {claims.map((verification) => (
        <div
          key={verification.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-gray-105 dark:bg-gray-800 rounded-full overflow-hidden shrink-0">
                {verification.user?.profile?.avatarUrl ? (
                  <img src={verification.user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-bold text-gray-400">
                    {verification.user?.profile?.fullName?.slice(0, 2) || "ST"}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-955 dark:text-white">
                  {verification.user?.profile?.fullName || "Student"}
                </h4>
                <p className="text-xs text-gray-400">@{verification.user?.username}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-650 dark:text-gray-455">
              <p className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Degree:</span>{" "}
                {verification.degree || "N/A"}
              </p>
              <p className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Branch:</span>{" "}
                {verification.fieldOfStudy || "N/A"}
              </p>
              <p className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Grad Year:</span>{" "}
                {verification.endYear || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
            <button
              onClick={() => onApprove(verification.id)}
              disabled={isActionPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
            <button
              onClick={() => onReject(verification.id)}
              disabled={isActionPending}
              className="flex-1 border border-gray-200 dark:border-gray-800 hover:bg-gray-55 dark:hover:bg-gray-900 text-gray-705 dark:text-gray-305 font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 text-red-500" />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
