import React from "react";
import { ShieldCheck, Loader2, Clock, UserCheck, UserX } from "lucide-react";
import { AlumniClaim } from "../../lib/api";

export interface CollegeAlumniProps {
  alumniClaims: AlumniClaim[];
  isAlumniClaimsLoading: boolean;
  onApproveClaim: (claimId: string) => void;
  isApproveClaimPending: boolean;
  onRejectClaim: (claimId: string) => void;
  isRejectClaimPending: boolean;
}

export function CollegeAlumni({
  alumniClaims,
  isAlumniClaimsLoading,
  onApproveClaim,
  isApproveClaimPending,
  onRejectClaim,
  isRejectClaimPending,
}: CollegeAlumniProps) {
  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
          <ShieldCheck size={16} className="text-indigo-600" />
          Alumni Verification Requests
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Review and verify alumni status claims from graduates of your institution.
        </p>
      </div>

      {isAlumniClaimsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={20} />
        </div>
      ) : alumniClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>No pending alumni claims</p>
            <p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
              When graduates claim their alumni status, their requests will appear here for your review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alumniClaims.map((claim) => (
            <div key={claim.id} className="flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <div className="flex items-center gap-3 min-w-0">
                {claim.user?.profile?.avatarUrl ? (
                  <img
                    src={claim.user.profile.avatarUrl}
                    alt={claim.user.profile.fullName || claim.user.username}
                    className="h-10 w-10 rounded-full object-cover border border-amber-200 shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0">
                    {(claim.user?.profile?.fullName || claim.user?.username || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                    {claim.user?.profile?.fullName || claim.user?.username || "Unknown Student"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    @{claim.user?.username} · {claim.user?.email}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                    <Clock size={9} /> Pending Verification
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onApproveClaim(claim.id)}
                  disabled={isApproveClaimPending || isRejectClaimPending}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 transition shadow-sm disabled:opacity-50"
                >
                  {isApproveClaimPending ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => onRejectClaim(claim.id)}
                  disabled={isApproveClaimPending || isRejectClaimPending}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-1.5 transition disabled:opacity-50"
                >
                  <UserX size={13} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
