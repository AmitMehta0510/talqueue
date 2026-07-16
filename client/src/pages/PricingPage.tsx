/**
 * PricingPage.tsx
 *
 * Public pricing page showing all active plans.
 * CTA behavior depends on PAYMENT_ENFORCEMENT_ENABLED env flag:
 *  - false (current): "Get Started" button opens CheckoutModal (test mode)
 *  - true (after milestone): fully enforced with real Razorpay live keys
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
        background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #0a0f1e 100%)",
        color: "#f1f5f9",
        fontFamily: "'Inter', 'Outfit', sans-serif",
        padding: "60px 24px 80px",
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 56px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "20px",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.3)",
            fontSize: "13px",
            color: "#818cf8",
            fontWeight: 600,
            letterSpacing: "0.05em",
            marginBottom: "20px",
          }}
        >
          SIMPLE PRICING
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            margin: "0 0 16px",
            lineHeight: 1.15,
            background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Unlock Your Hiring Potential
        </h1>

        <p style={{ fontSize: "17px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
          Start for free. Upgrade when you're ready to scale.
          No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "4px",
          marginBottom: "48px",
        }}
      >
        {(
          [
            { key: "RECRUITER", label: "For Recruiters" },
            { key: "COLLEGE", label: "For Colleges" },
            { key: "CREDITS", label: "Credit Packs" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === key ? "rgba(99,102,241,0.2)" : "transparent",
              color: activeTab === key ? "#818cf8" : "#475569",
              fontWeight: activeTab === key ? 700 : 500,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              outline: activeTab === key ? "1px solid rgba(99,102,241,0.3)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", color: "#475569", padding: "60px" }}>
            Loading plans…
          </div>
        ) : displayedPlans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#475569",
              padding: "60px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "16px",
              border: "1px dashed rgba(255,255,255,0.06)",
            }}
          >
            Plans coming soon. Stay tuned!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(displayedPlans.length, 3)}, 1fr)`,
              gap: "24px",
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
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            flexWrap: "wrap",
            color: "#475569",
            fontSize: "13px",
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
