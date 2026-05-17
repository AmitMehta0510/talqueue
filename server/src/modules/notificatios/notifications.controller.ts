import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {

  getMyNotifications,

  markAsRead,

  markAllAsRead,

  archiveNotification,

  deleteNotification,

} from "./notifications.service";

export const getNotificationsHandler =  asyncHandler(
    async (req: any, res: Response) => {

      const page =
        Number(req.query.page || 1);

      const limit =
        Number(req.query.limit || 20);

      const notifications =
        await getMyNotifications(
          req.user.id,
          page,
          limit
        );

      res.json(
        successResponse(
          notifications
        )
      );
    }
  );

export const markAsReadHandler =  asyncHandler(
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

export const markAllAsReadHandler =  asyncHandler(
    async (req: any, res: Response) => {

      await markAllAsRead(
        req.user.id
      );

      res.json(
        successResponse(
          null,
          "All notifications marked as read"
        )
      );
    }
  );

export const archiveNotificationHandler =  asyncHandler(
    async (req: any, res: Response) => {

      await archiveNotification(
        req.params.id,
        req.user.id
      );

      res.json(
        successResponse(
          null,
          "Notification archived"
        )
      );
    }
  );

export const deleteNotificationHandler =  asyncHandler(
    async (req: any, res: Response) => {

      await deleteNotification(
        req.params.id,
        req.user.id
      );

      res.json(
        successResponse(
          null,
          "Notification deleted"
        )
      );
    }
  );