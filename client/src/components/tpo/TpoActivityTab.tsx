import { Building2, CheckCircle } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { formatDate } from "../../core/utils/format";

interface RecruiterInteraction {
  id: string;
  officeCity?: string | null;
  user?: {
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
  company?: {
    name: string;
    logoUrl?: string | null;
    industry?: string | null;
  } | null;
}

interface CompanyClaim {
  id: string;
  companyName: string;
  status: string;
  createdAt: string;
  requestedBy?: {
    username: string;
  } | null;
}

interface TpoActivityTabProps {
  recruiters: RecruiterInteraction[] | undefined;
  isRecruitersLoading: boolean;
  isRecruitersError: boolean;
  claims: CompanyClaim[] | undefined;
  isClaimsLoading: boolean;
  isClaimsError: boolean;
}

export function TpoActivityTab({
  recruiters,
  isRecruitersLoading,
  isRecruitersError,
  claims,
  isClaimsLoading,
  isClaimsError,
}: TpoActivityTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Recruiter Interactions */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-955 dark:text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-655" />
          Recruiter Connections
        </h3>

        {isRecruitersLoading ? (
          <InlineLoader label="Loading recruiter connections..." />
        ) : isRecruitersError ? (
          <ErrorState title="Error fetching recruiters" />
        ) : !recruiters || recruiters.length === 0 ? (
          <EmptyState icon={Building2} title="No recruiter connections" text="No recruiter admin links registered yet." />
        ) : (
          <div className="space-y-4">
            {recruiters.map((recruiter) => (
              <div
                key={recruiter.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-55 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {recruiter.company?.logoUrl ? (
                      <img src={recruiter.company.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white leading-snug">
                      {recruiter.user?.profile?.fullName || "Recruiter"}
                    </p>
                    <p className="text-xs text-gray-450 dark:text-gray-405">
                      {recruiter.company?.name} • {recruiter.officeCity || "Remote"}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 bg-gray-55 dark:bg-gray-950 border border-gray-150 dark:border-gray-850 text-gray-500 text-xs font-semibold rounded-full">
                  {recruiter.company?.industry || "Tech"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claims */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-955 dark:text-white flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Company Claim Reviews
        </h3>

        {isClaimsLoading ? (
          <InlineLoader label="Loading claims..." />
        ) : isClaimsError ? (
          <ErrorState title="Error fetching claims" />
        ) : !claims || claims.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No claims history" text="No company claim requests registered." />
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="font-bold text-gray-955 dark:text-white leading-tight">
                    {claim.companyName}
                  </p>
                  <p className="text-xs text-gray-400">Requested by @{claim.requestedBy?.username}</p>
                  <p className="text-xs text-gray-550 font-medium">{formatDate(claim.createdAt)}</p>
                </div>

                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
                    claim.status === "APPROVED"
                      ? "bg-green-50 dark:bg-green-955/30 text-green-650"
                      : claim.status === "PENDING"
                      ? "bg-yellow-50 dark:bg-yellow-955/30 text-yellow-600"
                      : "bg-red-50 dark:bg-red-955/30 text-red-655"
                  }`}
                >
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
