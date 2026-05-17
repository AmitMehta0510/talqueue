import { Router } from "express";

import { protect }
from "modules/auth/auth.middleware";

import {

  getNotificationsHandler,

  markAsReadHandler,

  markAllAsReadHandler,

  archiveNotificationHandler,

  deleteNotificationHandler,

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

router.patch(
  "/read-all",
  protect,
  markAllAsReadHandler
);

router.patch(
  "/:id/archive",
  protect,
  archiveNotificationHandler
);

router.delete(
  "/:id",
  protect,
  deleteNotificationHandler
);

export default router;