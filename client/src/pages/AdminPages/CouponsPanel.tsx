/**
 * CouponsPanel.tsx
 *
 * Admin panel for managing coupon codes and discounts.
 * Supports PERCENTAGE, FLAT, and FREE_TRIAL discount types.
 */

import React, { useState } from "react";
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight,
  Users, Calendar, Percent, IndianRupee, Gift,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { fmtDate } from "./shared";
import {
  useAdminCouponsQuery,
  useAdminCreateCouponMutation,
  useAdminToggleCouponMutation,
  useAdminDeleteCouponMutation,
} from "../../hooks/queries/usePaymentQueries";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscountType = "PERCENTAGE" | "FLAT" | "FREE_TRIAL";

interface CouponRow {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages: number | null;
  usedCount: number;
  applicablePlans: string[];
  minOrderInPaise: number | null;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  _count: { usages: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function discountLabel(type: DiscountType, value: number) {
  if (type === "PERCENTAGE") return `${value}% off`;
  if (type === "FLAT") return `₹${(value / 100).toLocaleString("en-IN")} off`;
  if (type === "FREE_TRIAL") return `${value}-day free trial`;
  return "";
}

function discountIcon(type: DiscountType) {
  if (type === "PERCENTAGE") return <Percent size={12} />;
  if (type === "FLAT") return <IndianRupee size={12} />;
  if (type === "FREE_TRIAL") return <Gift size={12} />;
  return null;
}

function discountColor(type: DiscountType) {
  if (type === "PERCENTAGE") return { bg: "rgba(99,102,241,0.12)", text: "#6366f1" };
  if (type === "FLAT") return { bg: "rgba(34,197,94,0.12)", text: "#22c55e" };
  if (type === "FREE_TRIAL") return { bg: "rgba(249,115,22,0.12)", text: "#f97316" };
  return { bg: "transparent", text: "inherit" };
}

function isExpired(validUntil: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

// ─── Create Coupon Form ───────────────────────────────────────────────────────

interface CreateFormState {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maxUsages: string;
  applicablePlans: string;
  minOrderRupees: string;
  validUntil: string;
}

const defaultForm: CreateFormState = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  maxUsages: "",
  applicablePlans: "",
  minOrderRupees: "",
  validUntil: "",
};

function CreateCouponModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CreateFormState>(defaultForm);
  const createMutation = useAdminCreateCouponMutation();

  const set = (k: keyof CreateFormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      code: form.code.toUpperCase().trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      ...(form.description && { description: form.description }),
      ...(form.maxUsages && { maxUsages: Number(form.maxUsages) }),
      ...(form.applicablePlans && {
        applicablePlans: form.applicablePlans.split(",").map((s) => s.trim()).filter(Boolean),
      }),
      ...(form.minOrderRupees && { minOrderInPaise: Math.round(Number(form.minOrderRupees) * 100) }),
      ...(form.validUntil && { validUntil: new Date(form.validUntil).toISOString() }),
    };
    await createMutation.mutateAsync(payload);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--bg-base)",
    color: "var(--text-primary)",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: "16px",
        padding: "28px",
        maxWidth: "520px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
            Create Coupon Code
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px" }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Code */}
          <div>
            <label style={labelStyle}>Code *</label>
            <input
              required value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="e.g. LAUNCH50"
              style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "1px", fontWeight: 700 }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. 50% launch discount" style={inputStyle} />
          </div>

          {/* Discount Type */}
          <div>
            <label style={labelStyle}>Discount Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {(["PERCENTAGE", "FLAT", "FREE_TRIAL"] as DiscountType[]).map((t) => {
                const colors = discountColor(t);
                const selected = form.discountType === t;
                return (
                  <button
                    key={t} type="button"
                    onClick={() => set("discountType", t)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: "8px",
                      border: selected ? `2px solid ${colors.text}` : "1px solid var(--border)",
                      background: selected ? colors.bg : "var(--bg-surface-2)",
                      color: selected ? colors.text : "var(--text-secondary)",
                      fontSize: "11px", fontWeight: 700, cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {t === "PERCENTAGE" ? "% Off" : t === "FLAT" ? "₹ Flat" : "Free Trial"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label style={labelStyle}>
              {form.discountType === "PERCENTAGE" ? "Percentage (1–100) *" :
               form.discountType === "FLAT" ? "Amount in ₹ (e.g. 500) *" :
               "Trial Days *"}
            </label>
            <input
              required type="number" min="1"
              max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              placeholder={form.discountType === "PERCENTAGE" ? "20" : form.discountType === "FLAT" ? "500" : "30"}
              style={inputStyle}
            />
          </div>

          {/* Usage Limit + Min Order */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Max Usages (blank = unlimited)</label>
              <input type="number" min="1" value={form.maxUsages}
                onChange={(e) => set("maxUsages", e.target.value)}
                placeholder="e.g. 100" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Min Order ₹ (optional)</label>
              <input type="number" min="0" value={form.minOrderRupees}
                onChange={(e) => set("minOrderRupees", e.target.value)}
                placeholder="e.g. 999" style={inputStyle} />
            </div>
          </div>

          {/* Applicable Plans + Expiry */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Applicable Plans (comma-sep, blank = all)</label>
              <input value={form.applicablePlans}
                onChange={(e) => set("applicablePlans", e.target.value)}
                placeholder="resdex-premium, recruiter-pro" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Expiry Date (optional)</label>
              <input type="date" value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: "11px", borderRadius: "8px",
                border: "1px solid var(--border)", background: "var(--bg-surface-2)",
                color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer",
              }}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              style={{
                flex: 2, padding: "11px", borderRadius: "8px",
                border: "none", background: "var(--brand)",
                color: "var(--text-inverse)", fontWeight: 700, cursor: "pointer",
                opacity: createMutation.isPending ? 0.7 : 1,
              }}>
              {createMutation.isPending ? "Creating…" : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CouponsPanel() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useAdminCouponsQuery(page);
  const toggleMutation = useAdminToggleCouponMutation();
  const deleteMutation = useAdminDeleteCouponMutation();

  const coupons: CouponRow[] = data?.coupons ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
            Coupon Codes
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            Create and manage discount codes for plans.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 18px", borderRadius: "10px",
            border: "none", background: "var(--brand)",
            color: "var(--text-inverse)", fontWeight: 700,
            fontSize: "13px", cursor: "pointer",
            boxShadow: "0 4px 14px var(--brand-glow)",
          }}
        >
          <Plus size={15} />
          New Coupon
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Total Coupons", value: total, icon: Tag, grad: "from-indigo-500 to-purple-500" },
          { label: "Active", value: coupons.filter((c) => c.isActive && !isExpired(c.validUntil)).length, icon: ToggleRight, grad: "from-green-500 to-emerald-500" },
          { label: "Total Uses", value: coupons.reduce((s, c) => s + c.usedCount, 0), icon: Users, grad: "from-orange-500 to-amber-500" },
        ].map(({ label, value, icon: Icon, grad }) => (
          <div key={label}
            style={{
              padding: "16px", borderRadius: "12px",
              border: "1px solid var(--border)", background: "var(--bg-surface)",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", right: -8, top: -8, width: 64, height: 64,
              borderRadius: "50%", background: `linear-gradient(135deg, var(--brand), #a855f7)`, opacity: 0.1,
            }} />
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: "8px",
              background: "var(--brand)", marginBottom: "8px",
            }}>
              <Icon size={16} color="white" />
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        borderRadius: "12px", border: "1px solid var(--border)",
        background: "var(--bg-surface)", overflow: "hidden",
      }}>
        {isLoading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎟️</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No coupons yet</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Create your first coupon to offer discounts.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface-2)" }}>
                {["Code", "Discount", "Usage", "Valid Until", "Status", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon, idx) => {
                const colors = discountColor(coupon.discountType);
                const expired = isExpired(coupon.validUntil);
                const usagePercent = coupon.maxUsages
                  ? Math.min(100, Math.round((coupon.usedCount / coupon.maxUsages) * 100))
                  : null;

                return (
                  <tr key={coupon.id}
                    style={{
                      borderBottom: idx < coupons.length - 1 ? "1px solid var(--border)" : "none",
                      background: "transparent",
                    }}
                  >
                    {/* Code */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{
                        fontFamily: "monospace", fontWeight: 800, fontSize: "13px",
                        color: "var(--text-primary)", letterSpacing: "0.5px",
                      }}>
                        {coupon.code}
                      </div>
                      {coupon.description && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {coupon.description}
                        </div>
                      )}
                      {coupon.applicablePlans.length > 0 && (
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                          Plans: {coupon.applicablePlans.join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Discount */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "3px 8px", borderRadius: "6px",
                        background: colors.bg, color: colors.text,
                        fontSize: "12px", fontWeight: 700,
                      }}>
                        {discountIcon(coupon.discountType)}
                        {discountLabel(coupon.discountType, coupon.discountValue)}
                      </span>
                    </td>

                    {/* Usage */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {coupon.usedCount}{coupon.maxUsages ? ` / ${coupon.maxUsages}` : ""}
                      </div>
                      {usagePercent !== null && (
                        <div style={{
                          marginTop: "4px", height: "4px", borderRadius: "2px",
                          background: "var(--border)", overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", width: `${usagePercent}%`,
                            background: usagePercent >= 90 ? "#ef4444" : usagePercent >= 70 ? "#f97316" : "#22c55e",
                            borderRadius: "2px",
                            transition: "width 0.3s",
                          }} />
                        </div>
                      )}
                    </td>

                    {/* Valid Until */}
                    <td style={{ padding: "14px 16px" }}>
                      {coupon.validUntil ? (
                        <div style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          fontSize: "12px", color: expired ? "#ef4444" : "var(--text-secondary)",
                        }}>
                          <Calendar size={11} />
                          {fmtDate(coupon.validUntil)}
                          {expired && <span style={{ color: "#ef4444", fontWeight: 700 }}> (Expired)</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>No expiry</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: coupon.isActive && !expired ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: coupon.isActive && !expired ? "#22c55e" : "#ef4444",
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: coupon.isActive && !expired ? "#22c55e" : "#ef4444",
                          display: "inline-block",
                        }} />
                        {coupon.isActive && !expired ? "Active" : expired ? "Expired" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          title={coupon.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleMutation.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: coupon.isActive ? "#22c55e" : "var(--text-muted)",
                            padding: "4px",
                          }}
                        >
                          {coupon.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button
                          title="Delete coupon"
                          onClick={() => {
                            if (confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`))
                              deleteMutation.mutate(coupon.id);
                          }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: "4px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "6px 12px", borderRadius: "8px",
              border: "1px solid var(--border)", background: "var(--bg-surface-2)",
              color: "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Page {page} of {totalPages} · {total} coupons
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "6px 12px", borderRadius: "8px",
              border: "1px solid var(--border)", background: "var(--bg-surface-2)",
              color: "var(--text-secondary)", cursor: page === totalPages ? "not-allowed" : "pointer",
              opacity: page === totalPages ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && <CreateCouponModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
