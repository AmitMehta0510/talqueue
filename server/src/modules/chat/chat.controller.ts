import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createDirectConversation,
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead
} from "./chat.service";

import {
  createDirectConversationSchema,
  sendMessageSchema,
} from "./chat.validation";

import { getIO } from "./socket";

export const createDirectConversationHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createDirectConversationSchema.parse(
          req.body
        );

      const conversation =
        await createDirectConversation(
          req.user.id,
          validatedData.userId
        );

      res.status(201).json(
        successResponse(
          conversation,
          "Conversation created"
        )
      );
    }
  );

export const getMyConversationsHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const conversations =
        await getMyConversations(
          req.user.id
        );

      res.json(
        successResponse(
          conversations
        )
      );
    }
  );

export const getMessagesHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const messages =
        await getConversationMessages(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(messages)
      );
    }
  );

export const sendMessageHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        sendMessageSchema.parse(
          req.body
        );

      const message =
        await sendMessage(
          req.user.id,
          req.params.id,
          validatedData.content
        );

      // Realtime emit
      const io = getIO();

      io.to(req.params.id).emit(
        "new_message",
        message
      );

      res.status(201).json(
        successResponse(
          message,
          "Message sent"
        )
      );
    }
  );

export const markConversationAsReadHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const result =
        await markConversationAsRead(
          req.user.id,
          req.params.id
        );

      res.json(
        successResponse(
          result,
          "Conversation marked as read"
        )
      );
    }
  );  