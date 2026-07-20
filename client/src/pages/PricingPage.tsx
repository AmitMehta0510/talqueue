/**
 * PricingPage.tsx
 *
 * Public pricing page showing all active plans.
 * Dynamic theme compliant: uses design system CSS tokens (var(--bg-base), var(--text-primary), etc.)
 *
 * Accessible at: /pricing
 */

import React, { useState } from "react";
import { PlanCard } from "../components/payments/PlanCard";
import { CheckoutModal } from "../components/payments/CheckoutModal";
import { usePlansQuery } from "../hooks/queries/usePaymentQueries";
import { useMySubscriptionQuery } from "../hooks/queries/usePaymentQueries";
import { useAuth } from "../core/contexts/AuthContext";
import type { Plan } from "../lib/api";

export const PricingPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<"RECRUITER" | "COLLEGE" | "CREDITS">("RECRUITER");

  const { user } = useAuth();
  const { data: plans = [], isLoading } = usePlansQuery();
  const { data: subscriptionData } = useMySubscriptionQuery();

  const activePlanSlug = subscriptionData?.active?.plan?.slug;

  const recruiterPlans = plans.filter((p) => p.targetRole === "RECRUITER");
  const collegePlans = plans.filter((p) => p.targetRole === "COLLEGE");
  const creditPlans = plans.filter((p) => p.billingInterval === "ONE_TIME");

  const displayedPlans =
    activeTab === "RECRUITER" ? recruiterPlans
    : activeTab === "COLLEGE" ? collegePlans
    : creditPlans;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "'Inter', 'Outfit', sans-serif",
        padding: "60px 24px 80px",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 56px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "20px",
            background: "var(--brand-light)",
            border: "1px solid var(--border-strong)",
            fontSize: "13px",
            color: "var(--brand)",
            fontWeight: 600,
            letterSpacing: "0.05em",
            marginBottom: "20px",
          }}
        >
          SIMPLE & TRANSPARENT PRICING
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            margin: "0 0 16px",
            lineHeight: 1.15,
            color: "var(--text-primary)",
          }}
        >
          Unlock Your Hiring Potential
        </h1>

        <p style={{ fontSize: "17px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Start for free. Upgrade when you're ready to scale.
          No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "48px",
        }}
      >
        {(
          [
            { key: "RECRUITER", label: "For Recruiters" },
            { key: "COLLEGE", label: "For Colleges" },
            { key: "CREDITS", label: "Credit Packs" },
          ] as const
        ).map(({ key, label }) => {
          const isSelected = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "10px 22px",
                borderRadius: "12px",
                border: isSelected ? "1px solid var(--border-focus)" : "1px solid var(--border)",
                background: isSelected ? "var(--brand)" : "var(--bg-surface)",
                color: isSelected ? "var(--text-inverse)" : "var(--text-secondary)",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 4px 12px var(--brand-glow)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Plan cards */}
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "60px" }}>
            Loading plans…
          </div>
        ) : displayedPlans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "60px",
              background: "var(--bg-surface)",
              borderRadius: "16px",
              border: "1px dashed var(--border-strong)",
            }}
          >
            Plans coming soon. Stay tuned!
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            {displayedPlans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={activePlanSlug === plan.slug}
                isPopular={activeTab === "RECRUITER" && i === 0}
                onSelect={(p) => {
                  if (!user) {
                    window.location.href = "/login?redirect=/pricing";
                    return;
                  }
                  setSelectedPlan(p);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAQ / trust signals */}
      <div
        style={{
          maxWidth: "680px",
          margin: "72px auto 0",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
          paddingTop: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            flexWrap: "wrap",
            color: "var(--text-muted)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {[
            "🔒 Secure payments via Razorpay",
            "📄 GST-compliant invoices",
            "↩️ Cancel anytime",
            "🎯 14-day free trial for recruiters",
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  );
};
