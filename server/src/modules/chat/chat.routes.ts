import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createDirectConversationHandler,
  getMyConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markConversationAsReadHandler
} from "./chat.controller";

const router = Router();

router.post(
  "/direct",
  protect,
  createDirectConversationHandler
);

router.get(
  "/",
  protect,
  getMyConversationsHandler
);

router.get(
  "/:id/messages",
  protect,
  getMessagesHandler
);

router.post(
  "/:id/messages",
  protect,
  sendMessageHandler
);

router.patch(
  "/:id/read",
  protect,
  markConversationAsReadHandler
);

export default router;