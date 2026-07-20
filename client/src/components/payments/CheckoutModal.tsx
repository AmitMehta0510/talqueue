/**
 * CheckoutModal.tsx
 *
 * Opens Razorpay checkout for a given plan.
 * Uses dynamic theme variables (var(--bg-surface), var(--text-primary), etc.) for Light & Dark mode cohesion.
 */

import React, { useEffect, useRef, useState } from "react";
import type { Plan } from "../../lib/api";
import { useCreateOrderMutation, useVerifyPaymentMutation } from "../../hooks/queries/usePaymentQueries";
import { useToast } from "../../core/contexts/ToastContext";

interface CheckoutModalProps {
  plan: Plan | null;
  onClose: () => void;
}

// Load Razorpay checkout.js script once
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ plan, onClose }) => {
  const [step, setStep] = useState<"confirm" | "processing" | "success" | "error">("confirm");
  const razorpayInstance = useRef<any>(null);

  const createOrder = useCreateOrderMutation();
  const verifyPayment = useVerifyPaymentMutation();
  const { showToast } = useToast();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "processing") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, onClose]);

  if (!plan) return null;

  const priceRupees = (plan.priceInPaise / 100).toLocaleString("en-IN");
  const interval =
    plan.billingInterval === "MONTHLY"
      ? "per month"
      : plan.billingInterval === "YEARLY"
      ? "per year"
      : "one-time";

  const handleCheckout = async () => {
    setStep("processing");

    // 1. Load Razorpay script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showToast("error", "Failed to load payment gateway. Please try again.");
      setStep("error");
      return;
    }

    // 2. Create order on backend
    let orderData: { orderId: string; amount: number; currency: string; keyId: string };
    try {
      orderData = await createOrder.mutateAsync({ planSlug: plan.slug });
    } catch {
      setStep("error");
      return;
    }

    // 3. Open Razorpay checkout
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Engineers Platform",
      description: plan.name,
      order_id: orderData.orderId,
      theme: { color: "#4f46e5" },
      modal: {
        ondismiss: () => {
          setStep("confirm");
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await verifyPayment.mutateAsync({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setStep("success");
        } catch {
          setStep("error");
        }
      },
    };

    razorpayInstance.current = new (window as any).Razorpay(options);
    razorpayInstance.current.open();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "processing") onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          padding: "36px",
          maxWidth: "440px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          color: "var(--text-primary)",
        }}
      >
        {/* Success State */}
        {step === "success" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                Payment Successful!
              </h2>
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                Your subscription is being activated. This may take a few seconds.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "var(--brand)",
                color: "var(--text-inverse)",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
                boxShadow: "0 4px 14px var(--brand-glow)",
              }}
            >
              Continue
            </button>
          </>
        )}

        {/* Error State */}
        {step === "error" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                Something went wrong
              </h2>
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                Your payment could not be processed. Please try again.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setStep("confirm")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface-2)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Confirm / Processing State */}
        {(step === "confirm" || step === "processing") && (
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                Confirm Purchase
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
                You will be redirected to a secure payment page.
              </p>
            </div>

            {/* Plan summary */}
            <div
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-strong)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "16px" }}>
                  {plan.name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
                  {interval}
                  {plan.trialDays > 0 && (
                    <span style={{ color: "var(--text-success)", marginLeft: "8px", fontWeight: 600 }}>
                      · {plan.trialDays}-day trial
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                ₹{priceRupees}
              </div>
            </div>

            {/* Payment methods */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ height: "1px", flex: 1, background: "var(--border)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Secure payment via</span>
              <div style={{ height: "1px", flex: 1, background: "var(--border)" }} />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {["UPI", "Cards", "NetBanking", "Wallets", "EMI"].map((method) => (
                <span
                  key={method}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface-2)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {method}
                </span>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onClose}
                disabled={step === "processing"}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface-2)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: step === "processing" ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={step === "processing"}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: "10px",
                  border: "none",
                  background: "var(--brand)",
                  color: "var(--text-inverse)",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: step === "processing" ? "not-allowed" : "pointer",
                  opacity: step === "processing" ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px var(--brand-glow)",
                }}
              >
                {step === "processing" ? (
                  <>
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "var(--text-inverse)",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Processing…
                  </>
                ) : (
                  `Pay ₹${priceRupees}`
                )}
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
              🔒 256-bit SSL encrypted · Powered by Razorpay
            </p>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
