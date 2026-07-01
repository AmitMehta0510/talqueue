import { useState } from "react";
import {
  Send,
  Inbox,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  FileText,
  Building2,
  Sparkles,
} from "lucide-react";
import {
  useReceivedReferralRequestsQuery,
  useSentReferralRequestsQuery,
  useReviewReferralRequestMutation,
} from "../hooks/usePlatformQueries";
import { EmptyState, InlineLoader, ErrorState, Avatar } from "../components/ui";
import { formatDate, userName, STATUS_CHIP_CLASSES } from "../core/utils/format";
import { ReferralRequest, ReferralRequestStatus } from "../lib/api";

type TabType = "received" | "sent";

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("received");

  const receivedQuery = useReceivedReferralRequestsQuery();
  const sentQuery = useSentReferralRequestsQuery();
  const reviewMutation = useReviewReferralRequestMutation();

  const handleReview = async (requestId: string, status: Exclude<ReferralRequestStatus, "PENDING">) => {
    try {
      await reviewMutation.mutateAsync({ requestId, status });
    } catch {
      // Toast notification is managed by the mutation hook
    }
  };

  const renderStatusBadge = (status?: ReferralRequestStatus) => {
    const s = status || "PENDING";
    const cls = STATUS_CHIP_CLASSES[s] || "bg-slate-50 text-slate-600 border-slate-200";
    switch (s) {
      case "ACCEPTED":
        return (
          <span className={`chip flex items-center gap-1 font-semibold ${cls}`}>
            <CheckCircle size={12} />
            Accepted
          </span>
        );
      case "REFERRED":
        return (
          <span className={`chip flex items-center gap-1 font-semibold ${cls}`}>
            <CheckCircle size={12} />
            Referred
          </span>
        );
      case "REJECTED":
        return (
          <span className={`chip flex items-center gap-1 font-semibold ${cls}`}>
            <XCircle size={12} />
            Declined
          </span>
        );
      default:
        return (
          <span className={`chip flex items-center gap-1 font-semibold ${cls}`}>
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Referral Request Console</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Send, track, and manage employee referrals for career openings.
          </p>
        </div>

        {/* Tab switch control */}
        <div className="flex rounded-lg p-1" style={{ background: "var(--bg-surface-2)" }}>
          <button
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "received"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:text-slate-950 dark:hover:text-slate-100"
            }`}
            style={activeTab !== "received" ? { color: "var(--text-secondary)" } : { color: "var(--text-primary)" }}
            onClick={() => setActiveTab("received")}
          >
            <Inbox size={14} />
            Received Requests
          </button>
          <button
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "sent"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:text-slate-950 dark:hover:text-slate-100"
            }`}
            style={activeTab !== "sent" ? { color: "var(--text-secondary)" } : { color: "var(--text-primary)" }}
            onClick={() => setActiveTab("sent")}
          >
            <Send size={14} />
            Sent Requests
          </button>
        </div>
      </div>

      {activeTab === "received" ? (
        /* RECEIVED REQUESTS */
        receivedQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <InlineLoader label="Loading received requests..." />
          </div>
        ) : receivedQuery.isError ? (
          <ErrorState
            title="Failed to load incoming requests"
            text={receivedQuery.error?.message}
            onRetry={() => receivedQuery.refetch()}
          />
        ) : receivedQuery.data && receivedQuery.data.length > 0 ? (
          <div className="grid gap-5">
            {receivedQuery.data.map((req: ReferralRequest) => (
              <article key={req.id} className="panel p-5 space-y-4 hover:shadow-md transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Requester Profile Basics */}
                  <div className="flex items-center gap-3">
                    <Avatar user={req.requester} size="md" />
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {userName(req.requester)}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {req.requester?.profile?.headline || `@${req.requester?.username}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {renderStatusBadge(req.status)}
                    <span className="text-xxs" style={{ color: "var(--text-muted)" }}>
                      {req.createdAt && formatDate(req.createdAt)}
                    </span>
                  </div>
                </div>

                  <hr style={{ borderColor: "var(--border)" }} />

                {/* Job / Company Details */}
                <div className="grid gap-4 md:grid-cols-2 text-xs">
                  <div className="space-y-2">
                    <span className="block font-semibold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Opening Information
                    </span>
                    <div className="flex items-start gap-2.5 border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 mt-0.5">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{req.jobRole}</div>
                        <div className="mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {req.companyName || req.company?.name || "Company Details"}
                        </div>
                        {req.jobUrl && (
                          <a
                            href={req.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-indigo-700 hover:text-indigo-900 transition font-semibold"
                          >
                            View Job Link <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pitch / Message */}
                  <div className="space-y-2">
                    <span className="block font-semibold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Candidate Pitch
                    </span>
                    <div className="border rounded-lg p-3 leading-5 min-h-20 whitespace-pre-wrap" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
                      {req.message || "Candidate did not leave a pitch message."}
                    </div>
                  </div>
                </div>

                {/* Attached Links / Artifacts */}
                <div className="space-y-2.5">
                  <span className="block font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Shared Portfolio Links & Artifacts
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {req.resumeUrl && (
                      <a
                        href={req.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <FileText size={14} className="text-rose-600" />
                        Candidate Resume
                      </a>
                    )}
                    {req.githubUrl && (
                      <a
                        href={req.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 py-1.5 flex items-center gap-1.5"
                      >
                        GitHub Profile
                      </a>
                    )}
                    {req.linkedinUrl && (
                      <a
                        href={req.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 py-1.5 flex items-center gap-1.5"
                      >
                        LinkedIn Profile
                      </a>
                    )}
                    {req.portfolioUrl && (
                      <a
                        href={req.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 py-1.5 flex items-center gap-1.5"
                      >
                        Personal Website
                      </a>
                    )}
                    {!req.resumeUrl && !req.githubUrl && !req.linkedinUrl && !req.portfolioUrl && (
                      <span className="text-xxs italic" style={{ color: "var(--text-muted)" }}>
                        No links attached. Check their main profile for details.
                      </span>
                    )}
                  </div>
                </div>

                {/* Referrer Action Buttons */}
                {req.status === "PENDING" && (
                  <div className="flex justify-end gap-2 border-t pt-3.5" style={{ borderColor: "var(--border)" }}>
                    <button
                      className="btn-secondary py-1 text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(req.id, "REJECTED")}
                    >
                      Decline Request
                    </button>
                    <button
                      className="btn-secondary py-1 text-xs"
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(req.id, "ACCEPTED")}
                    >
                      Accept Request
                    </button>
                    <button
                      className="btn-primary py-1 text-xs"
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleReview(req.id, "REFERRED")}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="animate-spin" size={13} />
                      ) : (
                        <UserCheck size={13} />
                      )}
                      Mark as Referred
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="All caught up!"
            text="You have no incoming referral requests from other developers at the moment."
          />
        )
      ) : (
        /* SENT REQUESTS */
        sentQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <InlineLoader label="Loading sent requests..." />
          </div>
        ) : sentQuery.isError ? (
          <ErrorState
            title="Failed to load sent requests"
            text={sentQuery.error?.message}
            onRetry={() => sentQuery.refetch()}
          />
        ) : sentQuery.data && sentQuery.data.length > 0 ? (
          <div className="grid gap-5">
            {sentQuery.data.map((req: ReferralRequest) => (
              <article key={req.id} className="panel p-5 space-y-4 hover:shadow-md transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Referrer Details */}
                  <div className="flex items-center gap-3">
                    <Avatar user={req.referrer} size="md" />
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        Referrer: {userName(req.referrer)}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {req.referrer?.profile?.headline || `@${req.referrer?.username}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {renderStatusBadge(req.status)}
                    <span className="text-xxs" style={{ color: "var(--text-muted)" }}>
                      {req.createdAt && formatDate(req.createdAt)}
                    </span>
                  </div>
                </div>

                  <hr style={{ borderColor: "var(--border)" }} />

                {/* Job requested for */}
                <div className="text-xs space-y-3">
                  <div className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Requested Target
                  </div>

                  <div className="flex items-start gap-3 border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: "var(--text-primary)" }}>{req.jobRole}</div>
                      <div className="mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {req.companyName || req.company?.name || "Company Name"}
                      </div>
                      {req.jobUrl && (
                        <a
                          href={req.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-indigo-700 hover:text-indigo-900 transition font-semibold"
                        >
                          View Job Posting <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {req.message && (
                    <div className="space-y-1 mt-2">
                      <span className="block font-semibold text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>
                        Your Pitch
                      </span>
                      <p className="border rounded-md p-2" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                        {req.message}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Send}
            title="No referrals requested"
            text="Request a referral from active professionals to accelerate your applications."
          />
        )
      )}
    </div>
  );
}
