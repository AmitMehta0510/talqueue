import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import type { AuthenticatedUser } from "modules/auth/auth.selectors";

import {

  getMyNotifications,

  markAsRead,

  markAllAsRead,

  archiveNotification,

  deleteNotification,

} from "./notifications.service";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const getNotificationsHandler =  asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {

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
    async (req: AuthenticatedRequest, res: Response) => {

      await markAsRead(
        req.params.id as string,
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
    async (req: AuthenticatedRequest, res: Response) => {

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
    async (req: AuthenticatedRequest, res: Response) => {

      await archiveNotification(
        req.params.id as string,
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
    async (req: AuthenticatedRequest, res: Response) => {

      await deleteNotification(
        req.params.id as string,
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