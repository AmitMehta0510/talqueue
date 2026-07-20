/**
 * PlanCard.tsx
 *
 * Displays a single pricing plan with features, price, and CTA button.
 * Uses dynamic theme variables (var(--bg-surface), var(--text-primary), etc.) for Light & Dark mode cohesion.
 */

import React from "react";
import type { Plan } from "../../lib/api";

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect?: (plan: Plan) => void;
  loading?: boolean;
}

function formatPrice(priceInPaise: number, interval: string): string {
  const rupees = priceInPaise / 100;
  if (interval === "ONE_TIME") return `₹${rupees.toLocaleString("en-IN")}`;
  const period = interval === "MONTHLY" ? "/mo" : "/yr";
  return `₹${rupees.toLocaleString("en-IN")}${period}`;
}

function getFeatureList(features: Record<string, unknown>): string[] {
  const labels: string[] = [];
  if (features.resdexSearches === -1) labels.push("Unlimited RESDEX searches");
  else if (typeof features.resdexSearches === "number")
    labels.push(`${features.resdexSearches} RESDEX searches/day`);

  if (features.contactUnlocks === -1) labels.push("Unlimited contact unlocks");
  if (features.campusOutreach) labels.push("Campus outreach access");
  if (features.priorityPlacement) labels.push("Priority placement listing");
  if (typeof features.jobPosts === "number") labels.push(`${features.jobPosts} job postings`);
  if (features.unlimitedStudents) labels.push("Unlimited student profiles");
  if (features.prioritySupport) labels.push("Priority support");
  if (features.whitelabelReports) labels.push("White-label placement reports");
  if (features.cdcrAccess) labels.push("CDCR team management");
  return labels;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  loading = false,
}) => {
  const features = getFeatureList(plan.features as Record<string, unknown>);
  const price = formatPrice(plan.priceInPaise, plan.billingInterval);

  return (
    <div
      style={{
        background: isPopular ? "var(--bg-surface-2)" : "var(--bg-surface)",
        border: isPopular ? "2px solid var(--brand)" : "1px solid var(--border)",
        borderRadius: "16px",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        boxShadow: isPopular ? "0 8px 30px var(--brand-glow)" : "0 2px 8px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 36px var(--brand-glow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = isPopular
          ? "0 8px 30px var(--brand-glow)"
          : "0 2px 8px rgba(0,0,0,0.04)";
      }}
    >
      {isPopular && (
        <span
          style={{
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--brand)",
            color: "var(--text-inverse)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "4px 14px",
            borderRadius: "20px",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px var(--brand-glow)",
          }}
        >
          MOST POPULAR
        </span>
      )}

      {/* Header */}
      <div>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
          {plan.name}
        </h3>
        {plan.description && (
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)" }}>
            {price.split("/")[0]}
          </span>
          {plan.billingInterval !== "ONE_TIME" && (
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              /{plan.billingInterval === "MONTHLY" ? "month" : "year"}
            </span>
          )}
        </div>
        {plan.trialDays > 0 && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-success)",
              fontWeight: 600,
              display: "inline-block",
              marginTop: "2px",
            }}
          >
            {plan.trialDays}-day free trial
          </span>
        )}
        {plan.billingInterval === "YEARLY" && (
          <div style={{ fontSize: "12px", color: "var(--brand)", marginTop: "2px", fontWeight: 600 }}>
            ~₹{Math.round(plan.priceInPaise / 1200).toLocaleString("en-IN")}/month
          </div>
        )}
      </div>

      {/* Features */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
        {features.map((f) => (
          <li
            key={f}
            style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--text-secondary)" }}
          >
            <span style={{ color: "var(--text-success)", fontSize: "16px", flexShrink: 0, marginTop: "-1px", fontWeight: 700 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onSelect?.(plan)}
        disabled={loading || isCurrentPlan || !plan.isActive}
        style={{
          marginTop: "auto",
          padding: "12px 20px",
          borderRadius: "10px",
          border: isCurrentPlan
            ? "1px solid var(--border-strong)"
            : isPopular
            ? "none"
            : "1px solid var(--border)",
          background: isCurrentPlan
            ? "var(--bg-surface-3)"
            : isPopular
            ? "var(--brand)"
            : "var(--bg-surface-2)",
          color: isCurrentPlan
            ? "var(--brand)"
            : isPopular
            ? "var(--text-inverse)"
            : "var(--text-primary)",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading || isCurrentPlan ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          transition: "all 0.2s ease",
          boxShadow: isPopular ? "0 4px 14px var(--brand-glow)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!isCurrentPlan && !loading) {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {isCurrentPlan
          ? "Current Plan"
          : loading
          ? "Processing…"
          : plan.isActive
          ? "Get Started"
          : "Coming Soon"}
      </button>
    </div>
  );
};
