import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  createReferralRequestHandler,
  reviewReferralRequestHandler,
  receivedReferralRequestsHandler,
  sentReferralRequestsHandler,
} from "./referrals.controller";

const router = Router();

router.post(
  "/request/:userId",
  protect,
  createReferralRequestHandler
);

router.patch(
  "/:requestId/review",
  protect,
  reviewReferralRequestHandler
);

router.get(
  "/received",
  protect,
  receivedReferralRequestsHandler
);

router.get(
  "/sent",
  protect,
  sentReferralRequestsHandler
);

export default router;