import { useState, useCallback, useEffect } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle, FileText, ExternalLink } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { Avatar } from "../../components/ui";
import { DataTable, StatusBadge, fmtRelative } from "./shared";

export function CompanyRequestsPanel() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { api } = await import("../../lib/api");
      const res = await api.adminCompanyRequests(statusFilter);
      setRequests((res.data as any[]) || []);
    } catch {
      showToast("error", "Failed to load company requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  // Load on mount and filter change
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (r: any) => {
    setActionPending(r.id);
    try {
      const { api } = await import("../../lib/api");
      if (r.requestType === "COMPANY_CLAIM" || r.requestType === "RECRUITER_ONBOARDING") {
        await api.adminReviewBusinessRequest(r.id, "APPROVE");
        showToast("success", "Business request approved successfully!");
      } else {
        await api.adminApproveCompanyRequest(r.id);
        showToast("success", "Company approved and job posted!");
      }
      loadRequests();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to approve request");
    } finally {
      setActionPending(null);
    }
  };

  const handleReject = async (r: any) => {
    const notes = window.prompt("Rejection reason (optional):");
    if (notes === null) return;
    setActionPending(r.id);
    try {
      const { api } = await import("../../lib/api");
      if (r.requestType === "COMPANY_CLAIM" || r.requestType === "RECRUITER_ONBOARDING") {
        await api.adminReviewBusinessRequest(r.id, "REJECT");
        showToast("success", "Business request rejected successfully!");
      } else {
        await api.adminRejectCompanyRequest(r.id, notes || undefined);
        showToast("success", "Company request rejected");
      }
      loadRequests();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reject request");
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Enterprise Claim & Onboarding Requests</h2>
        <div className="flex items-center gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border
                ${statusFilter === s
                  ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20"
                  : "hover:bg-[var(--bg-surface-2)]"
                }`}
              style={statusFilter !== s ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}
              onClick={() => { setStatusFilter(s); }}
            >
              {s}
            </button>
          ))}
          <button
            className="btn-secondary text-xs"
            onClick={loadRequests}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full p-4" style={{ background: "var(--bg-surface-2)" }}><CheckCircle2 size={20} style={{ color: "var(--text-muted)" }} /></div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {statusFilter.toLowerCase()} requests pending review</p>
          </div>
        ) : (
          <DataTable
            headers={[
              "Type",
              "Company Name",
              "Identifiers / Email",
              "Requested By",
              "Details / Docs",
              "Status",
              "Date",
              statusFilter === "PENDING" ? "Actions" : "Result"
            ]}
          >
            {requests.map((r: any) => {
              const jobData = r.pendingJobData || {};
              const isClaim = r.requestType === "COMPANY_CLAIM";
              const isRecruiter = r.requestType === "RECRUITER_ONBOARDING" && r.businessEmail;
              
              return (
                <tr key={r.id} className="transition hover:bg-[var(--bg-surface-2)]">
                  {/* TYPE COLUMN */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isClaim ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
                      isRecruiter ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }}`}>
                      {isClaim ? "KYC CLAIM" : isRecruiter ? "RECRUITER" : "LEGACY CO"}
                    </span>
                  </td>

                  {/* COMPANY NAME COLUMN */}
                  <td className="px-4 py-3">
                    <div className="font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                      {r.company?.logoUrl && (
                        <img src={r.company.logoUrl} className="h-5 w-5 rounded object-contain p-0.5" style={{ background: "var(--bg-surface-2)" }} />
                      )}
                      {r.companyName}
                    </div>
                  </td>

                  {/* IDENTIFIERS COLUMN */}
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-0.5">
                      {r.businessEmail && (
                        <div className="font-semibold" style={{ color: "var(--text-secondary)" }}>{r.businessEmail}</div>
                      )}
                      {isClaim && r.company && (
                        <div className="text-[10px] flex flex-col font-mono" style={{ color: "var(--text-muted)" }}>
                          <span>GSTIN: {r.company.gstin || "—"}</span>
                          <span>CIN: {r.company.cin || "—"}</span>
                        </div>
                      )}
                      {!r.businessEmail && !isClaim && (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* REQUESTED BY COLUMN */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requestedBy} size="sm" />
                      <div>
                        <div className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                          {r.requestedBy?.profile?.fullName || r.requestedBy?.username}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{r.requestedBy?.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* DETAILS & DOCUMENTS COLUMN */}
                  <td className="px-4 py-3">
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {isClaim && r.corporateDoc ? (
                        <a
                          href={r.corporateDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                        >
                          <FileText size={13} />
                          View PDF Doc
                          <ExternalLink size={10} />
                        </a>
                      ) : !isClaim && !isRecruiter ? (
                        <span>Job: {jobData.title || "—"}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>

                  {/* DATE */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>{fmtRelative(r.createdAt)}</td>

                  {/* ACTIONS COLUMN */}
                  <td className="px-4 py-3">
                    {r.status === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-600/20 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 transition disabled:opacity-50"
                          onClick={() => handleApprove(r)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-lg bg-rose-600/10 border border-rose-600/20 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-600/20 transition disabled:opacity-50"
                          onClick={() => handleReject(r)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {r.reviewNotes || (r.status === "APPROVED" ? "Approved & Assigned" : "—")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
