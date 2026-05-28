import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  addParticipantHandler,
  createDirectConversationHandler,
  createGroupConversationHandler,
  getMyConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markConversationAsReadHandler,
  removeParticipantHandler,
  uploadAttachmentsHandler,
  forwardMessageHandler,
  reactToMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  searchMessagesHandler,
  togglePinConversationHandler,
  toggleMuteConversationHandler,
  toggleArchiveConversationHandler,
  deleteConversationHandler,
  getArchivedConversationsHandler,
} from "./chat.controller";

const router = Router();

router.post("/direct", protect, createDirectConversationHandler);

router.post("/group", protect, createGroupConversationHandler);

router.get("/", protect, getMyConversationsHandler);

router.get("/:id/messages", protect, getMessagesHandler);

router.post("/:id/messages", protect, sendMessageHandler);

router.post("/:id/attachments", protect, uploadAttachmentsHandler);

router.patch("/:id/read", protect, markConversationAsReadHandler);

router.post("/:id/participants", protect, addParticipantHandler);

router.delete("/:id/participants/:userId", protect, removeParticipantHandler);

router.post("/message/forward", protect, forwardMessageHandler);

router.post("/message/:messageId/react", protect, reactToMessageHandler);

router.patch("/message/:messageId/edit", protect, editMessageHandler);

router.delete("/message/:messageId", protect, deleteMessageHandler);

router.get(
  "/conversation/:conversationId/search",
  protect,
  searchMessagesHandler,
);

router.patch(
  "/conversation/:conversationId/pin",
  protect,
  togglePinConversationHandler,
);

router.patch(
  "/conversation/:conversationId/mute",
  protect,
  toggleMuteConversationHandler,
);

router.patch(
  "/conversation/:conversationId/archive",
  protect,
  toggleArchiveConversationHandler,
);

router.delete("/:id", protect, deleteConversationHandler);

router.get("/archived", protect, getArchivedConversationsHandler);

export default router;
