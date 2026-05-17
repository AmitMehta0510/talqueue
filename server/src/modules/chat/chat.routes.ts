import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createDirectConversationHandler,
  getMyConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markConversationAsReadHandler,
  forwardMessageHandler,
  reactToMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  searchMessagesHandler,
  togglePinConversationHandler,
  toggleMuteConversationHandler,
  toggleArchiveConversationHandler
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

router.post(
  "/message/forward",
  protect,
  forwardMessageHandler
);

router.post(
  "/message/:messageId/react",
  protect,
  reactToMessageHandler
);

router.patch(
  "/message/:messageId/edit",
  protect,
  editMessageHandler
);

router.delete(
  "/message/:messageId",
  protect,
  deleteMessageHandler
);

router.get(
  "/conversation/:conversationId/search",
  protect,
  searchMessagesHandler
);

router.patch(
  "/conversation/:conversationId/pin",
  protect,
  togglePinConversationHandler
);

router.patch(
  "/conversation/:conversationId/mute",
  protect,
  toggleMuteConversationHandler
);

router.patch(
  "/conversation/:conversationId/archive",
  protect,
  toggleArchiveConversationHandler
);

export default router;