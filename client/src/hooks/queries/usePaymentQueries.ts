/**
 * usePaymentQueries.ts
 *
 * React Query hooks for the payment system.
 * All hooks unwrap ApiEnvelope<T>.data following the project's request() pattern.
 * showToast signature: showToast(type, message) — type-first.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Plan, Subscription, Invoice } from "../../core/types/models";
import { useToast } from "../../core/contexts/ToastContext";
import { getErrorMessage } from "../../core/utils/format";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const paymentQueryKeys = {
  plans: (targetRole?: string) =>
    targetRole ? (["payments", "plans", targetRole] as const) : (["payments", "plans"] as const),
  subscription: ["payments", "subscription"] as const,
  invoices: ["payments", "invoices"] as const,
  credits: ["payments", "credits"] as const,
  adminCoupons: (page?: number) => ["payments", "admin", "coupons", page] as const,
} as const;


// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const usePlansQuery = (targetRole?: string) =>
  useQuery({
    queryKey: paymentQueryKeys.plans(targetRole),
    queryFn: async () => {
      const res = await api.payments.listPlans(targetRole);
      return res.data as Plan[];
    },
    staleTime: 10 * 60 * 1000, // plans change rarely
  });

export const useMySubscriptionQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.subscription,
    queryFn: async () => {
      const res = await api.payments.getSubscription();
      return res.data as { active: Subscription | null; history: Subscription[] };
    },
    staleTime: 60 * 1000,
  });

export const useMyInvoicesQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.invoices,
    queryFn: async () => {
      const res = await api.payments.listInvoices();
      return res.data as Invoice[];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useMyCreditsQuery = () =>
  useQuery({
    queryKey: paymentQueryKeys.credits,
    queryFn: async () => {
      const res = await api.payments.getCredits();
      return res.data as Record<string, number>;
    },
    staleTime: 60 * 1000,
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const useCreateOrderMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (body: { planSlug: string; subscriptionId?: string; couponCode?: string }) => {
      const res = await api.payments.createOrder(body);
      return res.data as {
        orderId: string;
        localOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        discountInPaise: number;
        originalAmountInPaise: number;
      };
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

/** Validate a coupon code without consuming it. Safe to call multiple times. */
export const useValidateCouponMutation = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (body: { code: string; planSlug: string }) => {
      const res = await api.payments.validateCoupon(body);
      return res.data as {
        valid: boolean;
        discountType: "PERCENTAGE" | "FLAT" | "FREE_TRIAL";
        discountValue: number;
        discountInPaise: number;
        finalAmountInPaise: number;
        originalAmountInPaise: number;
        savingsLabel: string;
      };
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useVerifyPaymentMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const res = await api.payments.verifyPayment(body);
      return res.data as { verified: boolean; paymentId: string };
    },
    onSuccess: () => {
      showToast(
        "success",
        "Payment successful! Your subscription is being activated.",
      );
      // Delay invalidation to allow webhook to process before refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: paymentQueryKeys.subscription });
        queryClient.invalidateQueries({ queryKey: paymentQueryKeys.invoices });
      }, 3000);
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await api.payments.cancelSubscription();
      return res.data as Subscription;
    },
    onSuccess: () => {
      showToast(
        "success",
        "Subscription cancelled. You'll retain access until the end of your current period.",
      );
      queryClient.invalidateQueries({ queryKey: paymentQueryKeys.subscription });
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

// ---------------------------------------------------------------------------
// Admin Coupon Queries
// ---------------------------------------------------------------------------

export const useAdminCouponsQuery = (page = 1) =>
  useQuery({
    queryKey: paymentQueryKeys.adminCoupons(page),
    queryFn: async () => {
      const res = await api.payments.admin.listCoupons(page);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

export const useAdminCreateCouponMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (body: object) => {
      const res = await api.payments.admin.createCoupon(body);
      return res.data;
    },
    onSuccess: () => {
      showToast("success", "Coupon created successfully!");
      queryClient.invalidateQueries({ queryKey: ["payments", "admin", "coupons"] });
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useAdminToggleCouponMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.payments.admin.toggleCoupon(id, isActive);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      showToast("success", `Coupon ${vars.isActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["payments", "admin", "coupons"] });
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};

export const useAdminDeleteCouponMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.payments.admin.deleteCoupon(id);
    },
    onSuccess: () => {
      showToast("success", "Coupon deleted");
      queryClient.invalidateQueries({ queryKey: ["payments", "admin", "coupons"] });
    },
    onError: (err) => {
      showToast("error", getErrorMessage(err));
    },
  });
};
