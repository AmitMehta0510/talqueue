/**
 * BillingSettingsTab.tsx
 *
 * Billing section inside user settings page.
 * Uses dynamic design system tokens (var(--bg-surface), var(--text-primary), etc.) for Light & Dark mode cohesion.
 */

import React, { useState } from "react";
import {
  useMySubscriptionQuery,
  useMyInvoicesQuery,
  useMyCreditsQuery,
  useCancelSubscriptionMutation,
} from "../../hooks/queries/usePaymentQueries";
import type { Invoice, Subscription } from "../../lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  TRIALING: "#3b82f6",
  PAST_DUE: "#f59e0b",
  CANCELLED: "#ef4444",
  EXPIRED: "#6b7280",
  PAUSED: "#8b5cf6",
};

const CREDIT_LABELS: Record<string, string> = {
  JOB_POST: "Job Postings",
  RESDEX_UNLOCK: "Contact Unlocks",
  INVITE_SEND: "Recruiter Invites",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SubscriptionCard: React.FC<{
  sub: Subscription;
  onCancel: () => void;
  cancelling: boolean;
}> = ({ sub, onCancel, cancelling }) => {
  const statusColor = STATUS_COLORS[sub.status] ?? "#6b7280";

  return (
    <div
      style={{
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-strong)",
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
            {sub.plan?.name ?? "Premium Plan"}
          </h3>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 700,
              color: statusColor,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}40`,
              letterSpacing: "0.05em",
            }}
          >
            {sub.status}
          </span>
        </div>

        {sub.status === "TRIALING" && sub.trialEndsAt && (
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "var(--brand)" }}>
            Free trial ends {formatDate(sub.trialEndsAt)}
          </p>
        )}

        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
          {sub.cancelAtPeriodEnd
            ? `Access until ${formatDate(sub.currentPeriodEnd)} · Cancellation scheduled`
            : `Renews on ${formatDate(sub.currentPeriodEnd)}`}
        </p>
      </div>

      {!sub.cancelAtPeriodEnd && sub.status === "ACTIVE" && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#ef4444",
            fontSize: "13px",
            fontWeight: 600,
            cursor: cancelling ? "not-allowed" : "pointer",
            opacity: cancelling ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {cancelling ? "Cancelling…" : "Cancel Subscription"}
        </button>
      )}
    </div>
  );
};

const InvoiceRow: React.FC<{ invoice: Invoice }> = ({ invoice }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 0",
      borderBottom: "1px solid var(--border)",
      gap: "16px",
    }}
  >
    <div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
        {invoice.invoiceNumber}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
        {formatDate(invoice.issuedAt)}
        {invoice.transaction?.method && (
          <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>
            · {invoice.transaction.method}
          </span>
        )}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
        {formatRupees(invoice.totalInPaise)}
      </span>
      {invoice.pdfUrl ? (
        <a
          href={invoice.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "12px",
            color: "var(--brand)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Download PDF
        </a>
      ) : (
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>PDF soon</span>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const BillingSettingsTab: React.FC = () => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: subscriptionData, isLoading: loadingSub } = useMySubscriptionQuery();
  const { data: invoices = [], isLoading: loadingInvoices } = useMyInvoicesQuery();
  const { data: credits, isLoading: loadingCredits } = useMyCreditsQuery();
  const cancelMutation = useCancelSubscriptionMutation();

  const activeSub = subscriptionData?.active;

  const handleCancel = async () => {
    await cancelMutation.mutateAsync();
    setConfirmCancel(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Current Subscription */}
      <section>
        <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
          Current Plan
        </h2>

        {loadingSub ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading…</div>
        ) : activeSub ? (
          <>
            <SubscriptionCard
              sub={activeSub}
              onCancel={() => setConfirmCancel(true)}
              cancelling={cancelMutation.isPending}
            />

            {/* Confirm cancel dialog */}
            {confirmCancel && (
              <div
                style={{
                  marginTop: "12px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, fontSize: "13px", color: "#ef4444" }}>
                  You'll keep access until{" "}
                  <strong>{formatDate(activeSub.currentPeriodEnd)}</strong>.
                  Are you sure?
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Keep Plan
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              background: "var(--bg-surface-2)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "14px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "14px" }}>
              You're on the Free plan.
            </p>
            <a
              href="/pricing"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                borderRadius: "8px",
                background: "var(--brand)",
                color: "var(--text-inverse)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 4px 12px var(--brand-glow)",
              }}
            >
              View Plans →
            </a>
          </div>
        )}
      </section>

      {/* Credit Balances */}
      {!loadingCredits && credits && Object.values(credits).some((v) => v > 0) && (
        <section>
          <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
            Credit Balances
          </h2>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {Object.entries(credits).map(([type, balance]) =>
              balance > 0 ? (
                <div
                  key={type}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "12px",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    minWidth: "140px",
                  }}
                >
                  <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--brand)" }}>
                    {balance}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {CREDIT_LABELS[type] ?? type}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* Invoice History */}
      <section>
        <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
          Billing History
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
          GST-compliant invoices for all your payments.
        </p>

        {loadingInvoices ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading…</div>
        ) : invoices.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px", padding: "20px 0" }}>
            No invoices yet.
          </div>
        ) : (
          <div>
            {invoices.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
