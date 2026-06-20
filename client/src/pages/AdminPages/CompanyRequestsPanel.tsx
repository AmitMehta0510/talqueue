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
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Enterprise Claim & Onboarding Requests</h2>
        <div className="flex items-center gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                  : "text-zinc-500 border border-zinc-700 hover:text-zinc-200"
              }`}
              onClick={() => { setStatusFilter(s); }}
            >
              {s}
            </button>
          ))}
          <button
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition"
            onClick={loadRequests}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-750 bg-zinc-900/60 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-zinc-800 p-4"><CheckCircle2 size={20} className="text-zinc-500" /></div>
            <p className="text-sm text-zinc-500">No {statusFilter.toLowerCase()} requests pending review</p>
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
                <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                  {/* TYPE COLUMN */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isClaim ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" :
                      isRecruiter ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                      "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    }`}>
                      {isClaim ? "KYC CLAIM" : isRecruiter ? "RECRUITER" : "LEGACY CO"}
                    </span>
                  </td>

                  {/* COMPANY NAME COLUMN */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      {r.company?.logoUrl && (
                        <img src={r.company.logoUrl} className="h-5 w-5 rounded object-contain bg-zinc-950 p-0.5" />
                      )}
                      {r.companyName}
                    </div>
                  </td>

                  {/* IDENTIFIERS COLUMN */}
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-0.5">
                      {r.businessEmail && (
                        <div className="text-zinc-300 font-semibold">{r.businessEmail}</div>
                      )}
                      {isClaim && r.company && (
                        <div className="text-[10px] text-zinc-500 flex flex-col font-mono">
                          <span>GSTIN: {r.company.gstin || "—"}</span>
                          <span>CIN: {r.company.cin || "—"}</span>
                        </div>
                      )}
                      {!r.businessEmail && !isClaim && (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>
                  </td>

                  {/* REQUESTED BY COLUMN */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requestedBy} size="sm" />
                      <div>
                        <div className="font-semibold text-white text-xs">
                          {r.requestedBy?.profile?.fullName || r.requestedBy?.username}
                        </div>
                        <div className="text-zinc-500 text-[10px]">@{r.requestedBy?.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* DETAILS & DOCUMENTS COLUMN */}
                  <td className="px-4 py-3">
                    <div className="text-xs text-zinc-300">
                      {isClaim && r.corporateDoc ? (
                        <a
                          href={r.corporateDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                        >
                          <FileText size={13} />
                          View PDF Doc
                          <ExternalLink size={10} />
                        </a>
                      ) : !isClaim && !isRecruiter ? (
                        <span>Job: {jobData.title || "—"}</span>
                      ) : (
                        <span className="text-zinc-650">—</span>
                      )}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>

                  {/* DATE */}
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{fmtRelative(r.createdAt)}</td>

                  {/* ACTIONS COLUMN */}
                  <td className="px-4 py-3">
                    {r.status === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-600/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-600/30 transition disabled:opacity-50"
                          onClick={() => handleApprove(r)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-600/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-600/30 transition disabled:opacity-50"
                          onClick={() => handleReject(r)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">
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
