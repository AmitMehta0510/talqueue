/**
 * usePaymentQueries.ts
 *
 * React Query hooks for the payment system:
 *  - usePlansQuery           → list all active plans
 *  - useMySubscriptionQuery  → current user's subscription + history
 *  - useMyInvoicesQuery      → invoice history
 *  - useMyCreditsQuery       → credit balances
 *  - useCreateOrderMutation  → create Razorpay order before checkout
 *  - useVerifyPaymentMutation → verify payment signature after checkout
 *  - useCancelSubscriptionMutation → cancel subscription
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const paymentQueryKeys = {
  plans: ["payments", "plans"] as const,
  plan: (slug: string) => ["payments", "plans", slug] as const,
  subscription: ["payments", "subscription"] as const,
  invoices: ["payments", "invoices"] as const,
  credits: ["payments", "credits"] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const usePlansQuery = (targetRole?: string) =>
  useQuery({
    queryKey: [...paymentQueryKeys.plans, targetRole],
    queryFn: () => api.payments.listPlans(targetRole),
    staleTime: 10 * 60 * 1000, // plans change rarely
  });

export const useMySubscriptionQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.subscription,
    queryFn: () => api.payments.getSubscription(),
    staleTime: 60 * 1000, // 1 min
  });

export const useMyInvoicesQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.invoices,
    queryFn: () => api.payments.listInvoices(),
    staleTime: 5 * 60 * 1000,
  });

export const useMyCreditsQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.credits,
    queryFn: () => api.payments.getCredits(),
    staleTime: 60 * 1000,
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const useCreateOrderMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: { planSlug: string; subscriptionId?: string }) =>
      api.payments.createOrder(body),
    onError: (err) => {
      showToast(getErrorMessage(err), "error");
    },
  });
};

export const useVerifyPaymentMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => api.payments.verifyPayment(body),
    onSuccess: () => {
      showToast(
        "Payment successful! Your subscription is being activated.",
        "success",
      );
      // Invalidate subscription — it will refresh after webhook activates it
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: paymentQueryKeys.subscription });
        queryClient.invalidateQueries({ queryKey: paymentQueryKeys.invoices });
      }, 3000); // Small delay to allow webhook processing
    },
    onError: (err) => {
      showToast(getErrorMessage(err), "error");
    },
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => api.payments.cancelSubscription(),
    onSuccess: () => {
      showToast(
        "Subscription cancelled. You'll retain access until the end of your current period.",
        "success",
      );
      queryClient.invalidateQueries({ queryKey: paymentQueryKeys.subscription });
    },
    onError: (err) => {
      showToast(getErrorMessage(err), "error");
    },
  });
};
