/**
 * payments.routes.ts
 *
 * Route registration for the payments module.
 *
 * IMPORTANT: The webhook route uses express.raw() to capture the raw body
 * for HMAC verification. All other routes use JSON parsing.
 *
 * Mount in app.ts:
 *   app.use("/api/v1/payments", paymentsRouter);
 *   app.use("/api/v1/webhooks", paymentsRouter); // for /webhooks/razorpay
 */

import { Router, json, raw } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  listPlansHandler,
  getPlanBySlugHandler,
  createOrderHandler,
  verifyPaymentHandler,
  getMySubscriptionHandler,
  cancelMySubscriptionHandler,
  listInvoicesHandler,
  getInvoiceHandler,
  getMyCreditsHandler,
  razorpayWebhookHandler,
  validateCouponHandler,
  adminListCouponsHandler,
  adminGetCouponHandler,
  adminCreateCouponHandler,
  adminUpdateCouponHandler,
  adminToggleCouponHandler,
  adminDeleteCouponHandler,
} from "./payments.controller";



const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────

/** GET /api/v1/payments/plans — list all active plans */
router.get("/plans", listPlansHandler);

/** GET /api/v1/payments/plans/:slug — single plan details */
router.get("/plans/:slug", getPlanBySlugHandler);

// ── Authenticated ─────────────────────────────────────────────────────────────

router.use(protect);

/**
 * POST /api/v1/payments/orders
 * Body: { planSlug: string, subscriptionId?: string }
 * Returns: { orderId, localOrderId, amount, currency, keyId }
 */
router.post("/orders", createOrderHandler);

/**
 * POST /api/v1/payments/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * UX confirmation only — subscription activated by webhook.
 */
router.post("/verify", verifyPaymentHandler);

/** GET /api/v1/payments/subscription — current subscription + history */
router.get("/subscription", getMySubscriptionHandler);

/**
 * DELETE /api/v1/payments/subscription
 * Cancel: sets cancelAtPeriodEnd=true. Access continues until period end.
 */
router.delete("/subscription", cancelMySubscriptionHandler);

/** GET /api/v1/payments/invoices — invoice history */
router.get("/invoices", listInvoicesHandler);

/** GET /api/v1/payments/invoices/:id — single invoice */
router.get("/invoices/:id", getInvoiceHandler);

/** GET /api/v1/payments/credits — credit balances per type */
router.get("/credits", getMyCreditsHandler);

/**
 * POST /api/v1/payments/coupons/validate
 * Body: { code: string, planSlug: string }
 * Returns: { valid, discountType, discountValue, discountInPaise, finalAmountInPaise, savingsLabel }
 */
router.post("/coupons/validate", validateCouponHandler);

// ── Admin — Coupon management (Platform Admin only) ────────────────────────
// Note: requirePlatformAdmin is imported from the admin module middleware
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";

/** GET /api/v1/payments/admin/coupons — list all coupons (paginated) */
router.get("/admin/coupons", requirePlatformAdmin, adminListCouponsHandler);

/** GET /api/v1/payments/admin/coupons/:id — single coupon + usage history */
router.get("/admin/coupons/:id", requirePlatformAdmin, adminGetCouponHandler);

/** POST /api/v1/payments/admin/coupons — create new coupon */
router.post("/admin/coupons", requirePlatformAdmin, adminCreateCouponHandler);

/** PATCH /api/v1/payments/admin/coupons/:id — update coupon fields */
router.patch("/admin/coupons/:id", requirePlatformAdmin, adminUpdateCouponHandler);

/** PATCH /api/v1/payments/admin/coupons/:id/toggle — activate/deactivate */
router.patch("/admin/coupons/:id/toggle", requirePlatformAdmin, adminToggleCouponHandler);

/** DELETE /api/v1/payments/admin/coupons/:id — delete (only if unused) */
router.delete("/admin/coupons/:id", requirePlatformAdmin, adminDeleteCouponHandler);

export { router as paymentsRouter };


// ── Webhook (separate export — needs raw body parsing) ─────────────────────

const webhookRouter = Router();

/**
 * POST /api/v1/webhooks/razorpay
 *
 * Razorpay sends webhooks here. express.raw() captures the raw body so we
 * can verify HMAC-SHA256 signature.
 * Must NOT go through express.json() or the signature check will fail.
 */
webhookRouter.post(
  "/razorpay",
  raw({ type: "application/json" }),
  (req, _res, next) => {
    // Expose raw body as string for webhook.handler.ts
    (req as any).rawBody = req.body.toString("utf8");
    next();
  },
  razorpayWebhookHandler,
);

export { webhookRouter };
