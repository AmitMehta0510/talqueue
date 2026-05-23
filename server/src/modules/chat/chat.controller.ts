import {
  Request,
  Response
} from "express";
import type { AuthenticatedUser } from "modules/auth/auth.selectors";

interface AuthRequest
  extends Request {

  user: AuthenticatedUser;

  body: any;

  params: any;

  query: any;
}

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  addParticipant,
  createDirectConversation,
  createGroupConversation,
  uploadAttachments,
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  removeParticipant,
  reactToMessage,
  toggleArchiveConversation,
  toggleMuteConversation,
  togglePinConversation,
  searchMessages,
  forwardMessage,
  deleteMessage,
  editMessage,

} from "./chat.service";

import {
  createDirectConversationSchema,
  createGroupConversationSchema,
  muteConversationSchema,
  participantSchema,
  sendMessageSchema,
  uploadAttachmentsSchema,
} from "./chat.validation";

export const createDirectConversationHandler =  asyncHandler(
    async (
      req: AuthRequest,
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

export const createGroupConversationHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const validatedData = createGroupConversationSchema.parse(req.body);

    const conversation = await createGroupConversation(
      req.user.id,
      validatedData,
    );

    res.status(201).json(
      successResponse(
        conversation,
        "Group conversation created",
      ),
    );
  },
);

export const getMyConversationsHandler =  asyncHandler(
    async (
      req: AuthRequest,
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
      req: AuthRequest,
      res: Response
    ) => {

      const messages =
        await getConversationMessages(
          req.user.id,
          req.params.id,
          req.query.cursor as string | undefined
        );

      res.json(
        successResponse(messages)
      );
    }
  );

export const sendMessageHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {
      const validatedData = sendMessageSchema.parse(req.body);

      const message =
        await sendMessage(

          req.user!.id,

          req.params.id as string,

          {

            content:
              validatedData.content,

            type:
              validatedData.type,

            attachments:
              validatedData.attachments,

            replyToMessageId:
              validatedData.replyToMessageId,
          }
        );

      res.status(201).json(successResponse(message));
    }
  );

export const markConversationAsReadHandler =  asyncHandler(
    async (
      req: AuthRequest,
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

export const addParticipantHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const validatedData = participantSchema.parse(req.body);

    const participant = await addParticipant(
      req.user.id,
      req.params.id,
      validatedData.userId,
    );

    res.status(201).json(
      successResponse(participant, "Participant added"),
    );
  },
);

export const removeParticipantHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await removeParticipant(
      req.user.id,
      req.params.id,
      req.params.userId,
    );

    res.json(successResponse(result, "Participant removed"));
  },
);

export const uploadAttachmentsHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const validatedData = uploadAttachmentsSchema.parse(req.body);

    const result = await uploadAttachments(
      req.user.id,
      req.params.id,
      validatedData.attachments,
    );

    res.status(201).json(
      successResponse(result, "Attachments uploaded"),
    );
  },
);

  export const forwardMessageHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await forwardMessage(

          req.user!.id,

          req.body.messageId,

          req.body.targetConversationId
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const reactToMessageHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await reactToMessage(

          req.user!.id,

          req.params.messageId as string,

          req.body.emoji
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const editMessageHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await editMessage(

          req.user!.id,

          req.params.messageId as string,

          req.body.content
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const deleteMessageHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await deleteMessage(

          req.user!.id,

          req.params.messageId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const searchMessagesHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await searchMessages(

          req.user!.id,

          req.params.conversationId as string,

          req.query.q as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const togglePinConversationHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await togglePinConversation(

          req.user!.id,

          req.params.conversationId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const toggleMuteConversationHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await toggleMuteConversation(

          req.user!.id,

          req.params.conversationId as string,

          muteConversationSchema.parse(req.body).muted
        );

      res.json(
        successResponse(result)
      );
    }
  );

export const toggleArchiveConversationHandler =  asyncHandler(

    async (
      req: Request,
      res: Response
    ) => {

      const result =
        await toggleArchiveConversation(

          req.user!.id,

          req.params.conversationId as string
        );

      res.json(
        successResponse(result)
      );
    }
  );

