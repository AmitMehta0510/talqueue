import { ClipboardList, Loader2 } from "lucide-react";
import { EmptyState } from "../ui";
import { formatDate } from "../../core/utils/format";

interface ClaimRequest {
  id: string;
  companyName: string;
  businessEmail: string;
  createdAt: string;
  reviewNotes?: string | null;
  status: string;
}

interface RecruiterClaimStatusTabProps {
  claims: ClaimRequest[] | undefined;
  isLoading: boolean;
}

export function RecruiterClaimStatusTab({ claims, isLoading }: RecruiterClaimStatusTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <ClipboardList size={15} />
          Company Claim Requests
        </h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : !claims || claims.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No claim requests"
          text="You haven't submitted any claim requests yet."
        />
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{claim.companyName}</h4>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Business Email: {claim.businessEmail}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Submitted on: {formatDate(claim.createdAt)}
                </p>
                {claim.reviewNotes && (
                  <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded border mt-2" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                    <strong>Review Note: </strong> {claim.reviewNotes}
                  </p>
                )}
              </div>

              <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${
                claim.status === "APPROVED" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200" :
                claim.status === "PENDING" ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200" :
                "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200"
              }`}>{claim.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
