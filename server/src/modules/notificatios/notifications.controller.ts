import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  getMyNotifications,
  markAsRead,
} from "./notifications.service";

export const getNotificationsHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const notifications =
        await getMyNotifications(
          req.user.id
        );

      res.json(
        successResponse(notifications)
      );
    }
  );

export const markAsReadHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      await markAsRead(
        req.params.id,
        req.user.id
      );

      res.json(
        successResponse(
          null,
          "Notification marked as read"
        )
      );
    }
  );