/**
 * AdsPanel.tsx
 *
 * Admin panel for managing ad campaigns and creatives.
 * Features: platform stats, campaign list with status filter,
 * approve/pause/reject controls, create campaign + ad modal.
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2, TrendingUp, MousePointer, Eye,
  Plus, Check, Pause, X, Trash2, ChevronDown,
  ExternalLink, ToggleLeft, ToggleRight,
} from "lucide-react";
import { fmtDate } from "./shared";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

// ── Query hooks ───────────────────────────────────────────────────────────────

const AD_STATUS_OPTIONS = ["ALL", "PENDING", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED"] as const;
type StatusFilter = (typeof AD_STATUS_OPTIONS)[number];

function usePlatformAdStats() {
  return useQuery({
    queryKey: ["ads", "admin", "stats"],
    queryFn: async () => {
      const res = await api.ads.admin.getStats();
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

function useAdminCampaigns(status: StatusFilter, page: number) {
  return useQuery({
    queryKey: ["ads", "admin", "campaigns", status, page],
    queryFn: async () => {
      const res = await api.ads.admin.listCampaigns(
        status === "ALL" ? undefined : status,
        page,
      );
      return res.data;
    },
    staleTime: 15 * 1000,
  });
}

function useAdminCampaign(id: string | null) {
  return useQuery({
    queryKey: ["ads", "admin", "campaigns", id],
    queryFn: async () => {
      const res = await api.ads.admin.getCampaign(id!);
      return res.data;
    },
    enabled: !!id,
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  PENDING:   { bg: "rgba(249,115,22,0.12)",  color: "#f97316" },
  PAUSED:    { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
  DRAFT:     { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
  COMPLETED: { bg: "rgba(139,92,246,0.12)",  color: "#8b5cf6" },
  REJECTED:  { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "rgba(100,116,139,0.12)", color: "#64748b" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {status}
    </span>
  );
}

// ── Create Campaign Modal ─────────────────────────────────────────────────────

interface CreateCampaignFormState {
  advertiserId: string;
  name: string;
  startDate: string;
  endDate: string;
  billingModel: string;
  targetRoles: string;
}

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<CreateCampaignFormState>({
    advertiserId: "",
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billingModel: "FREE",
    targetRoles: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.ads.admin.createCampaign({
        advertiserId: form.advertiserId,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        billingModel: form.billingModel,
        targetRoles: form.targetRoles ? form.targetRoles.split(",").map((s) => s.trim()) : [],
      });
      return res.data;
    },
    onSuccess: () => {
      showToast("success", "Campaign created and activated!");
      queryClient.invalidateQueries({ queryKey: ["ads", "admin"] });
      onClose();
    },
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13,
    boxSizing: "border-box" as const, outline: "none",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
    marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Create Campaign</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Advertiser User ID *</label>
            <input required value={form.advertiserId} onChange={(e) => setForm((f) => ({ ...f, advertiserId: e.target.value }))} placeholder="User UUID" style={input} />
          </div>
          <div>
            <label style={label}>Campaign Name *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. TechCorp Summer Hiring" style={input} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Start Date *</label>
              <input required type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} style={input} />
            </div>
            <div>
              <label style={label}>End Date (optional)</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} style={input} />
            </div>
          </div>
          <div>
            <label style={label}>Billing Model</label>
            <select value={form.billingModel} onChange={(e) => setForm((f) => ({ ...f, billingModel: e.target.value }))} style={input}>
              {["FREE", "FLAT", "CPM", "CPC"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Target Roles (comma-sep, blank = all)</label>
            <input value={form.targetRoles} onChange={(e) => setForm((f) => ({ ...f, targetRoles: e.target.value }))} placeholder="STUDENT, RECRUITER" style={input} />
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "var(--brand)", color: "var(--text-inverse)", fontWeight: 700, cursor: "pointer", opacity: mutation.isPending ? 0.7 : 1 }}>
              {mutation.isPending ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Ad Modal ───────────────────────────────────────────────────────────

const AD_ZONES = ["feed_inline", "jobs_top", "feed_sidebar", "discover_sidebar", "profile_sidebar", "hackathon_banner"];
const AD_TYPES = ["CARD", "BANNER", "TEXT_LINK", "SPONSORED_JOB", "SPONSORED_COMPANY"];

function CreateAdModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState({ zone: "feed_inline", type: "CARD", headline: "", bodyText: "", imageUrl: "", ctaText: "Learn More", destinationUrl: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.ads.admin.createAd({ campaignId, ...form });
      return res.data;
    },
    onSuccess: () => {
      showToast("success", "Ad creative created!");
      queryClient.invalidateQueries({ queryKey: ["ads", "admin", "campaigns", campaignId] });
      onClose();
    },
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const input: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" as const, outline: "none" };
  const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.5px" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Ad Creative</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Zone *</label>
              <select value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} style={input}>
                {AD_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={input}>
                {AD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={label}>Headline</label>
            <input value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="e.g. Join Our Engineering Team!" style={input} />
          </div>
          <div>
            <label style={label}>Body Text</label>
            <input value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} placeholder="Short description…" style={input} />
          </div>
          <div>
            <label style={label}>Image URL (optional)</label>
            <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." style={input} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>CTA Text</label>
              <input value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Learn More" style={input} />
            </div>
            <div>
              <label style={label}>Destination URL *</label>
              <input required value={form.destinationUrl} onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))} placeholder="https://..." style={input} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "var(--brand)", color: "var(--text-inverse)", fontWeight: 700, cursor: "pointer", opacity: mutation.isPending ? 0.7 : 1 }}>
              {mutation.isPending ? "Saving…" : "Add Creative"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Campaign Detail Drawer ────────────────────────────────────────────────────

function CampaignDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useAdminCampaign(id);
  const [showAddAd, setShowAddAd] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.ads.admin.updateCampaignStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads", "admin"] });
      showToast("success", "Campaign status updated");
    },
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const toggleAdMutation = useMutation({
    mutationFn: ({ adId, isActive }: { adId: string; isActive: boolean }) =>
      api.ads.admin.toggleAd(adId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads", "admin", "campaigns", id] }),
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const deleteAdMutation = useMutation({
    mutationFn: (adId: string) => api.ads.admin.deleteAd(adId),
    onSuccess: () => {
      showToast("success", "Ad deleted");
      queryClient.invalidateQueries({ queryKey: ["ads", "admin", "campaigns", id] });
    },
    onError: (err) => showToast("error", getErrorMessage(err)),
  });

  const campaign = data?.campaign ?? data;
  const ads = campaign?.ads ?? [];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 480, zIndex: 9001, background: "var(--bg-surface)", borderLeft: "1px solid var(--border-strong)", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Campaign Detail</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 22 }}>×</button>
        </div>

        {isLoading ? (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Loading…</div>
        ) : campaign ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>{campaign.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusPill status={campaign.status} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {fmtDate(campaign.startDate)} → {campaign.endDate ? fmtDate(campaign.endDate) : "No end"}
                </span>
              </div>
              {campaign.advertiser && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Advertiser: <strong>{campaign.advertiser.username}</strong> ({campaign.advertiser.email})
                </div>
              )}
            </div>

            {/* Status actions */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {["ACTIVE", "PAUSED", "REJECTED"].map((s) => (
                campaign.status !== s && (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    style={{
                      padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)",
                      background: s === "ACTIVE" ? "rgba(34,197,94,0.1)" : s === "REJECTED" ? "rgba(239,68,68,0.1)" : "var(--bg-surface-2)",
                      color: s === "ACTIVE" ? "#22c55e" : s === "REJECTED" ? "#ef4444" : "var(--text-secondary)",
                      fontWeight: 600, fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {s === "ACTIVE" ? <Check size={12} /> : s === "PAUSED" ? <Pause size={12} /> : <X size={12} />}
                    {s === "ACTIVE" ? "Approve" : s === "PAUSED" ? "Pause" : "Reject"}
                  </button>
                )
              ))}
            </div>

            {/* Ads list */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Ad Creatives ({ads.length})</div>
              <button onClick={() => setShowAddAd(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--brand)", color: "var(--text-inverse)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                <Plus size={13} /> Add Creative
              </button>
            </div>

            {ads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 8 }}>No creatives yet. Add one to start serving ads.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ads.map((ad: any) => (
                  <div key={ad.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{ad.headline ?? "(no headline)"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {ad.type} · {ad.zone} · {ad.impressions} views · {ad.clicks} clicks
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button title={ad.isActive ? "Pause" : "Activate"} onClick={() => toggleAdMutation.mutate({ adId: ad.id, isActive: !ad.isActive })} style={{ background: "none", border: "none", cursor: "pointer", color: ad.isActive ? "#22c55e" : "var(--text-muted)" }}>
                          {ad.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <a href={ad.destinationUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                          <ExternalLink size={13} />
                        </a>
                        <button title="Delete" onClick={() => { if (confirm("Delete this ad?")) deleteAdMutation.mutate(ad.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "var(--text-muted)" }}>Campaign not found.</div>
        )}
      </div>

      {showAddAd && <CreateAdModal campaignId={id} onClose={() => setShowAddAd(false)} />}
    </>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function AdsPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: statsData } = usePlatformAdStats();
  const { data: campaignData, isLoading } = useAdminCampaigns(statusFilter, page);

  const stats = statsData ?? {};
  const campaigns: any[] = campaignData?.campaigns ?? [];
  const total: number = campaignData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>Ad Campaigns</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Manage advertising campaigns and creatives.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--brand)", color: "var(--text-inverse)", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px var(--brand-glow)" }}>
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Campaigns", value: stats.totalCampaigns ?? 0, icon: BarChart2, color: "#6366f1" },
          { label: "Active Campaigns", value: stats.activeCampaigns ?? 0, icon: TrendingUp, color: "#22c55e" },
          { label: "Total Impressions", value: (stats.totalImpressions ?? 0).toLocaleString(), icon: Eye, color: "#f97316" },
          { label: "Platform CTR", value: stats.platformCtr ?? "0.00%", icon: MousePointer, color: "#8b5cf6" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ padding: 16, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -8, top: -8, width: 64, height: 64, borderRadius: "50%", background: color, opacity: 0.1 }} />
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: color, marginBottom: 8 }}>
              <Icon size={16} color="white" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {AD_STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "1px solid var(--border)",
              background: statusFilter === s ? "var(--brand)" : "var(--bg-surface-2)",
              color: statusFilter === s ? "var(--text-inverse)" : "var(--text-secondary)",
              fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Campaigns table */}
      <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No campaigns yet</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface-2)" }}>
                {["Campaign", "Advertiser", "Status", "Billing", "Period", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: idx < campaigns.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c._count?.ads ?? 0} creative{c._count?.ads !== 1 ? "s" : ""}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {c.advertiser?.username ?? "-"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <StatusPill status={c.status} />
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {c.billingModel}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {fmtDate(c.startDate)} → {c.endDate ? fmtDate(c.endDate) : "∞"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => setSelectedCampaignId(c.id)}
                      style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface-2)", color: "var(--text-secondary)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>Next →</button>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
      {selectedCampaignId && <CampaignDetail id={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />}
    </div>
  );
}
