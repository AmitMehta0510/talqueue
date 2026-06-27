import { useState, useCallback, useEffect } from "react";
import {
  GraduationCap,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  FileText,
  ExternalLink,
  Mail,
  MapPin,
  Hash,
} from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { Avatar } from "../../components/ui";
import { StatusBadge, fmtRelative } from "./shared";

type SubTab = "tpo" | "company_claim" | "recruiter";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

// ─── TPO College Requests Sub-Panel ───────────────────────────────────────────
function TpoRequestsPanel() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { api } = await import("../../lib/api");
      const res = await api.adminGetCollegeRequests(statusFilter);
      // Backend returns a paginated envelope: { requests: [...], nextCursor, hasNextPage }
      // We must extract .requests — not treat res.data directly as an array.
      const payload = res.data as { requests?: any[] } | any[];
      const list = Array.isArray(payload) ? payload : (payload?.requests ?? []);
      setRequests(list);
    } catch {
      showToast("error", "Failed to load college requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleApprove = async (r: any) => {
    setActionPending(r.id);
    try {
      const { api } = await import("../../lib/api");
      await api.adminReviewCollegeRequest(r.id, { action: "APPROVE" });
      showToast("success", `"${r.name}" approved! College created & TPO assigned.`);
      loadRequests();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to approve");
    } finally {
      setActionPending(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const id = rejectModal.id;
    setRejectModal(null);
    setActionPending(id);
    try {
      const { api } = await import("../../lib/api");
      await api.adminReviewCollegeRequest(id, { action: "REJECT", adminNote: rejectNote || undefined });
      showToast("success", "College request rejected");
      setRejectNote("");
      loadRequests();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reject");
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          OTP-verified institutional onboarding requests from Training &amp; Placement Officers.
        </p>
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${statusFilter === s ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20" : "hover:bg-[var(--bg-surface-2)]"}`}
              style={statusFilter !== s ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}
            >{s}</button>
          ))}
          <button className="btn-secondary text-xs" onClick={loadRequests}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full p-4" style={{ background: "var(--bg-surface-2)" }}>
              <GraduationCap size={20} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {statusFilter.toLowerCase()} college requests</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {requests.map((r: any) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-[var(--bg-surface-2)] transition">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={16} className="text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{r.name}</div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs pl-11">
                    {r.officialEmail && (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Mail size={11} className="text-indigo-400 shrink-0" /><span className="font-semibold">{r.officialEmail}</span>
                      </div>
                    )}
                    {(r.city || r.state) && (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={11} className="shrink-0" />{[r.city, r.state, r.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {r.aisheCode && (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <Hash size={11} className="shrink-0" />AISHE: {r.aisheCode}
                      </div>
                    )}
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-500 hover:underline">
                        <ExternalLink size={11} className="shrink-0" />{r.website}
                      </a>
                    )}
                    {r.authorityLetterheadDoc && (
                      <a href={r.authorityLetterheadDoc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-500 hover:underline font-bold">
                        <FileText size={11} />View Letterhead
                      </a>
                    )}
                  </div>
                  {r.adminNote && <p className="text-xs pl-11 italic" style={{ color: "var(--text-muted)" }}>Admin note: {r.adminNote}</p>}
                </div>
                <div className="flex flex-col gap-2 items-start sm:items-end justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar user={r.user} size="sm" />
                    <div className="text-xs">
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.user?.profile?.fullName || r.user?.username || "Unknown"}</div>
                      <div style={{ color: "var(--text-muted)" }}>{fmtRelative(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1 rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition disabled:opacity-50"
                        onClick={() => handleApprove(r)} disabled={actionPending === r.id}
                      >
                        {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Approve
                      </button>
                      <button
                        className="flex items-center gap-1 rounded-lg bg-rose-600/10 border border-rose-600/20 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-600/20 transition disabled:opacity-50"
                        onClick={() => setRejectModal({ id: r.id, name: r.name })} disabled={actionPending === r.id}
                      >
                        <XCircle size={10} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
            <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Reject — {rejectModal.name}</h3>
            <textarea className="field w-full h-24 resize-none text-sm" placeholder="Optional rejection reason (will be sent to the TPO)…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary text-xs" onClick={() => { setRejectModal(null); setRejectNote(""); }}>Cancel</button>
              <button className="rounded-lg px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition" onClick={handleRejectConfirm}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Company Claims / Recruiter Sub-Panel ──────────────────────────────────────
function CompanyClaimsPanel({ requestType }: { requestType: "COMPANY_CLAIM" | "RECRUITER_ONBOARDING" }) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const isRecruiter = requestType === "RECRUITER_ONBOARDING";

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { api } = await import("../../lib/api");
      const res = await api.adminCompanyRequests(statusFilter);
      const list = Array.isArray(res.data) ? res.data : [];
      setRequests(list.filter((r: any) => r.requestType === requestType));
    } catch {
      showToast("error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast, requestType]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleAction = async (r: any, action: "APPROVE" | "REJECT") => {
    setActionPending(r.id);
    try {
      const { api } = await import("../../lib/api");
      await api.adminReviewBusinessRequest(r.id, action);
      showToast("success", `Request ${action === "APPROVE" ? "approved" : "rejected"}!`);
      loadRequests();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to process");
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {isRecruiter ? "Recruiter access requests — users requesting recruiter role for a company." : "Company claim requests — KYC-verified ownership of a company page."}
        </p>
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${statusFilter === s ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20" : "hover:bg-[var(--bg-surface-2)]"}`}
              style={statusFilter !== s ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}
            >{s}</button>
          ))}
          <button className="btn-secondary text-xs" onClick={loadRequests}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full p-4" style={{ background: "var(--bg-surface-2)" }}>
              {isRecruiter ? <UserCheck size={20} style={{ color: "var(--text-muted)" }} /> : <Building2 size={20} style={{ color: "var(--text-muted)" }} />}
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {statusFilter.toLowerCase()} {isRecruiter ? "recruiter" : "claim"} requests</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {requests.map((r: any) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-[var(--bg-surface-2)] transition">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {r.company?.logoUrl ? <img src={r.company.logoUrl} className="h-8 w-8 object-contain" /> : <Building2 size={16} className="text-indigo-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{r.companyName}</div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="pl-11 space-y-1 text-xs">
                    {r.businessEmail && (
                      <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Mail size={11} className="text-indigo-400 shrink-0" />
                        <span className="font-semibold">{r.businessEmail}</span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 rounded font-bold">OTP Verified</span>
                      </div>
                    )}
                    {!isRecruiter && r.company && (
                      <div className="flex gap-4 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {r.company.gstin && <span>GSTIN: {r.company.gstin}</span>}
                        {r.company.cin && <span>CIN: {r.company.cin}</span>}
                      </div>
                    )}
                    {r.corporateDoc && (
                      <a href={r.corporateDoc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-500 hover:underline font-bold">
                        <FileText size={11} />View KYC Doc
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-start sm:items-end justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar user={r.requestedBy} size="sm" />
                    <div className="text-xs">
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.requestedBy?.profile?.fullName || r.requestedBy?.username}</div>
                      <div style={{ color: "var(--text-muted)" }}>{fmtRelative(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 rounded-lg bg-indigo-600/10 border border-indigo-600/20 px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition disabled:opacity-50"
                        onClick={() => handleAction(r, "APPROVE")} disabled={actionPending === r.id}>
                        {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Approve
                      </button>
                      <button className="flex items-center gap-1 rounded-lg bg-rose-600/10 border border-rose-600/20 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-600/20 transition disabled:opacity-50"
                        onClick={() => handleAction(r, "REJECT")} disabled={actionPending === r.id}>
                        {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />} Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export function OnboardingRequestsPanel() {
  const [subTab, setSubTab] = useState<SubTab>("tpo");

  const SUB_TABS: { id: SubTab; label: string; icon: any }[] = [
    { id: "tpo", label: "TPO / College", icon: GraduationCap },
    { id: "company_claim", label: "Company Claims", icon: Building2 },
    { id: "recruiter", label: "Recruiter Onboarding", icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Onboarding Requests</h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Review and approve/reject institutional &amp; enterprise onboarding requests.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${subTab === id ? "bg-indigo-600/10 border-indigo-600/30 text-indigo-600 dark:text-indigo-400 shadow-sm" : "hover:bg-[var(--bg-surface-2)]"}`}
            style={subTab !== id ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : {}}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {subTab === "tpo" && <TpoRequestsPanel />}
      {subTab === "company_claim" && <CompanyClaimsPanel requestType="COMPANY_CLAIM" />}
      {subTab === "recruiter" && <CompanyClaimsPanel requestType="RECRUITER_ONBOARDING" />}
    </div>
  );
}
