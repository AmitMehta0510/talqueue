import { useState } from "react";
import { Calendar, Building2, Clock, GraduationCap, Briefcase, CheckCircle, Loader2, MessageSquare, AlertCircle, Edit2 } from "lucide-react";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { formatDate } from "../../core/utils/format";

export interface DriveInvite {
  id: string;
  driveTitle: string;
  status: string;
  message?: string | null;
  driveDate?: string | null;
  applyDeadline?: string | null;
  minCgpa?: number | null;
  eligibleBranches?: string[] | null;
  eligibleYears?: number[] | null;
  maxBacklogs?: number | null;
  tpoCounterProposal?: {
    minCgpa?: number;
    maxBacklogs?: number;
    eligibleBranches?: string[];
    eligibleYears?: number[];
    message?: string;
  } | null;
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
  onSendCounterProposal: (payload: { inviteId: string; proposal: any }) => void;
  isCounterPending: boolean;
}

export function TpoInvitesTab({
  invites,
  isLoading,
  isError,
  onRetry,
  onRespondToInvite,
  isRespondPending,
  onSendCounterProposal,
  isCounterPending,
}: TpoInvitesTabProps) {
  const [negotiatingInviteId, setNegotiatingInviteId] = useState<string | null>(null);
  const [minCgpa, setMinCgpa] = useState<string>("");
  const [maxBacklogs, setMaxBacklogs] = useState<string>("");
  const [branches, setBranches] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleStartNegotiate = (invite: DriveInvite) => {
    setNegotiatingInviteId(invite.id);
    setMinCgpa(invite.minCgpa?.toString() || "");
    setMaxBacklogs(invite.maxBacklogs?.toString() || "");
    setBranches(invite.eligibleBranches?.join(", ") || "");
    setYears(invite.eligibleYears?.join(", ") || "");
    setMessage(invite.tpoCounterProposal?.message || "");
  };

  const handleCancelNegotiate = () => {
    setNegotiatingInviteId(null);
  };

  const handleSubmitCounter = (inviteId: string) => {
    const proposal: any = {};
    if (minCgpa.trim()) proposal.minCgpa = parseFloat(minCgpa);
    if (maxBacklogs.trim()) proposal.maxBacklogs = parseInt(maxBacklogs, 10);
    if (branches.trim()) {
      proposal.eligibleBranches = branches.split(",").map((b) => b.trim()).filter(Boolean);
    }
    if (years.trim()) {
      proposal.eligibleYears = years.split(",").map((y) => parseInt(y.trim(), 10)).filter((y) => !isNaN(y));
    }
    if (message.trim()) proposal.message = message.trim();

    onSendCounterProposal({ inviteId, proposal });
    setNegotiatingInviteId(null);
  };

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
            Review and accept campus placement requests, or send counter-proposals with custom eligibility criteria.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {invites.map((invite) => {
          const isNegotiatingThis = negotiatingInviteId === invite.id;
          return (
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
                      <p className="text-xs text-gray-550 dark:text-gray-400">{invite.company?.name}</p>
                    </div>
                  </div>

                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    invite.status === "PENDING" ? "bg-amber-50 dark:bg-amber-955/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" :
                    invite.status === "NEGOTIATING" ? "bg-indigo-50 dark:bg-indigo-955/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" :
                    invite.status === "ACCEPTED" ? "bg-green-50 dark:bg-green-955/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700" :
                    invite.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-955/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700" :
                    "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}>
                    {invite.status}
                  </span>
                </div>

                {invite.message && (
                  <p className="text-xs italic bg-gray-50 dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850 text-gray-700 dark:text-gray-300">
                    "{invite.message}"
                  </p>
                )}

                {/* Original/Existing Criteria */}
                <div className="space-y-2 text-xs text-gray-605 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-850">
                  <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Requested Criteria</span>
                  {invite.driveDate && (
                    <p className="flex items-center gap-1.5 mt-1">
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
                  {invite.minCgpa !== undefined && invite.minCgpa !== null && (
                    <p className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Cutoff CGPA:</strong> {invite.minCgpa.toFixed(2)}
                    </p>
                  )}
                  {invite.maxBacklogs !== undefined && invite.maxBacklogs !== null && (
                    <p className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Max Backlogs:</strong> {invite.maxBacklogs}
                    </p>
                  )}
                  {invite.roles && invite.roles.length > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Roles:</strong> {invite.roles.join(", ")}
                    </p>
                  )}
                  {invite.eligibleBranches && invite.eligibleBranches.length > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Branches:</strong> {invite.eligibleBranches.join(", ")}
                    </p>
                  )}
                  {invite.eligibleYears && invite.eligibleYears.length > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <strong>Years:</strong> {invite.eligibleYears.join(", ")}
                    </p>
                  )}
                </div>

                {/* Show Counter Proposal If Exists */}
                {invite.tpoCounterProposal && (
                  <div className="space-y-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900">
                    <span className="font-bold text-[10px] uppercase text-indigo-400 tracking-wider">Your Counter Proposal</span>
                    {invite.tpoCounterProposal.minCgpa !== undefined && (
                      <p className="flex items-center gap-1.5 mt-1">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                        <strong>Min CGPA:</strong> {invite.tpoCounterProposal.minCgpa.toFixed(2)}
                      </p>
                    )}
                    {invite.tpoCounterProposal.maxBacklogs !== undefined && (
                      <p className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-indigo-400" />
                        <strong>Max Backlogs:</strong> {invite.tpoCounterProposal.maxBacklogs}
                      </p>
                    )}
                    {invite.tpoCounterProposal.eligibleBranches && (
                      <p className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                        <strong>Branches:</strong> {invite.tpoCounterProposal.eligibleBranches.join(", ")}
                      </p>
                    )}
                    {invite.tpoCounterProposal.eligibleYears && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <strong>Years:</strong> {invite.tpoCounterProposal.eligibleYears.join(", ")}
                      </p>
                    )}
                    {invite.tpoCounterProposal.message && (
                      <p className="flex items-start gap-1.5 italic text-gray-550 dark:text-gray-400 mt-1">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>"{invite.tpoCounterProposal.message}"</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Inline Negotiation Form */}
                {isNegotiatingThis && (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-slide-down">
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">Counter Proposal Details</h5>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Min CGPA</label>
                        <input
                          type="number"
                          step="0.01"
                          value={minCgpa}
                          onChange={(e) => setMinCgpa(e.target.value)}
                          className="w-full mt-0.5 p-2 border rounded-lg text-xs dark:bg-gray-900 dark:border-gray-850 text-gray-900 dark:text-white"
                          placeholder="e.g. 7.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Max Backlogs</label>
                        <input
                          type="number"
                          value={maxBacklogs}
                          onChange={(e) => setMaxBacklogs(e.target.value)}
                          className="w-full mt-0.5 p-2 border rounded-lg text-xs dark:bg-gray-900 dark:border-gray-850 text-gray-900 dark:text-white"
                          placeholder="e.g. 0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Branches (comma separated)</label>
                      <input
                        type="text"
                        value={branches}
                        onChange={(e) => setBranches(e.target.value)}
                        className="w-full mt-0.5 p-2 border rounded-lg text-xs dark:bg-gray-900 dark:border-gray-850 text-gray-900 dark:text-white"
                        placeholder="CSE, ECE, IT"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Years (comma separated)</label>
                      <input
                        type="text"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                        className="w-full mt-0.5 p-2 border rounded-lg text-xs dark:bg-gray-900 dark:border-gray-850 text-gray-900 dark:text-white"
                        placeholder="2026, 2027"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Proposal Message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        className="w-full mt-0.5 p-2 border rounded-lg text-xs dark:bg-gray-900 dark:border-gray-850 text-gray-900 dark:text-white"
                        placeholder="Reason for change..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitCounter(invite.id)}
                        disabled={isCounterPending}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 rounded-lg text-xs transition"
                      >
                        {isCounterPending ? "Submitting..." : "Send Proposal"}
                      </button>
                      <button
                        onClick={handleCancelNegotiate}
                        className="px-3 border hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 py-1.5 rounded-lg text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Standard Actions */}
              {!isNegotiatingThis && ["PENDING", "NEGOTIATING"].includes(invite.status) && (
                <div className="flex flex-col gap-2 border-t border-gray-150 dark:border-gray-850 pt-4 mt-6">
                  <div className="flex gap-3">
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
                      Accept & Create
                    </button>
                    <button
                      onClick={() => onRespondToInvite({ inviteId: invite.id, action: "REJECT" })}
                      disabled={isRespondPending}
                      className="border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-705 dark:text-gray-300 font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>

                  <button
                    onClick={() => handleStartNegotiate(invite)}
                    className="w-full border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 py-2 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Negotiate Terms / Counter Proposal
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
          );
        })}
      </div>
    </div>
  );
}
