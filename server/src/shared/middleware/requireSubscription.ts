/**
 * requireSubscription.ts
 *
 * Middleware to gate routes behind an active subscription.
 *
 * While PAYMENT_ENFORCEMENT_ENABLED=false (default):
 *   → Always calls next(). Zero impact on users. Payment UI is visible but not enforced.
 *
 * When PAYMENT_ENFORCEMENT_ENABLED=true (flip at monetization milestone):
 *   → Checks for an active Subscription matching planSlug.
 *   → TPOs, CollegeAdmins, and PlatformAdmins always bypass (they never pay).
 *   → PAST_DUE subscriptions within 3-day grace period are treated as active.
 *
 * Usage:
 *   router.get("/contacts", requireSubscription("resdex-premium"), handler);
 *   router.post("/jobs", requireSubscription("job-credits-10"), handler);
 */

import { Request, Response, NextFunction } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import AppError from "shared/errors/AppError";
import { isPaymentEnforced } from "shared/config/env";
import { getActiveSubscription, isInGracePeriod } from "modules/payments/subscription.service";

const BYPASS_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "TPO", "COLLEGE_ADMIN"];

export const requireSubscription = (planSlug: string) =>
  asyncHandler(async (req: any, _res: Response, next: NextFunction) => {
    // FREE MODE — enforcement disabled (default). Let everyone through.
    if (!isPaymentEnforced()) return next();

    const user = req.user;
    if (!user) throw new AppError("Authentication required.", 401);

    // Bypass roles never need to pay
    if (BYPASS_ROLES.includes(user.primaryRole ?? "")) return next();

    // Check for active subscription on this plan
    const subscription = await getActiveSubscription(user.id);
    const hasMatchingPlan =
      subscription?.plan.slug === planSlug ||
      subscription?.plan.targetRole === "ANY";

    if (hasMatchingPlan) return next();

    // Grace period: PAST_DUE within 3 days still gets access
    const inGrace = await isInGracePeriod(user.id);
    if (inGrace) return next();

    throw new AppError(
      `This feature requires an active "${planSlug}" subscription. Upgrade to continue.`,
      402, // 402 Payment Required — semantically correct
    );
  });
