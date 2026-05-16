import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  getNotificationsHandler,
  markAsReadHandler,
} from "./notifications.controller";

const router = Router();

router.get(
  "/",
  protect,
  getNotificationsHandler
);

router.patch(
  "/:id/read",
  protect,
  markAsReadHandler
);

export default router;