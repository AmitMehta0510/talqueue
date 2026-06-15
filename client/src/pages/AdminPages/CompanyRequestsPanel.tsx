import { FormEvent, useState, useCallback, useEffect } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
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

  const handleApprove = async (requestId: string) => {
    setActionPending(requestId);
    try {
      const { api } = await import("../../lib/api");
      await api.adminApproveCompanyRequest(requestId);
      showToast("success", "Company approved and job posted!");
      loadRequests();
    } catch {
      showToast("error", "Failed to approve");
    } finally {
      setActionPending(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = window.prompt("Rejection reason (optional):");
    if (notes === null) return;
    setActionPending(requestId);
    try {
      const { api } = await import("../../lib/api");
      await api.adminRejectCompanyRequest(requestId, notes || undefined);
      showToast("success", "Company request rejected");
      loadRequests();
    } catch {
      showToast("error", "Failed to reject");
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Company Registration Requests</h2>
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

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-zinc-800 p-4"><CheckCircle2 size={20} className="text-zinc-500" /></div>
            <p className="text-sm text-zinc-500">No {statusFilter.toLowerCase()} company requests</p>
          </div>
        ) : (
          <DataTable
            headers={["Company Name", "Requested By", "Job Title", "Status", "Date", statusFilter === "PENDING" ? "Actions" : "Result"]}
          >
            {requests.map((r: any) => {
              const jobData = r.pendingJobData || {};
              return (
                <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{r.companyName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requestedBy} size="sm" />
                      <div>
                        <div className="font-semibold text-white text-xs">{r.requestedBy?.profile?.fullName || r.requestedBy?.username}</div>
                        <div className="text-zinc-500 text-[10px]">@{r.requestedBy?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{jobData.title || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{fmtRelative(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-600/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-600/30 transition disabled:opacity-50"
                          onClick={() => handleApprove(r.id)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-600/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-600/30 transition disabled:opacity-50"
                          onClick={() => handleReject(r.id)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">{r.reviewNotes || (r.status === "APPROVED" ? "Company created & job posted" : "—")}</span>
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
