import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import {
  createEvent,
  getEventById,
  getEventAttendees,
  getEvents,
  updateEvent,
  deleteEvent,
  rsvpEvent,
} from "./events.service";
import { createEventSchema, updateEventSchema } from "./events.validation";
import { RSVPStatus } from "@prisma/client";
import AppError from "shared/errors/AppError";



export const createEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = createEventSchema.parse(req.body);
    const event = await createEvent(req.user.id, validatedData);

    res.status(201).json(
      successResponse(event, "Event created successfully!")
    );
  }
);

export const getEventsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const filters = {
      collegeId: req.query.collegeId?.toString(),
      companyId: req.query.companyId?.toString(),
      communityId: req.query.communityId?.toString(),
      type: req.query.type?.toString(),
    };

    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const safePage = isNaN(page as number) ? 1 : page;
    const rawLimit = isNaN(limit as number) ? 10 : (limit as number);
    const safeLimitParam = Math.min(Math.max(1, rawLimit), 100);

    const events = await getEvents(filters, { page: safePage, limit: safeLimitParam }, req.user?.id);

    res.json(successResponse(events));
  }
);

export const getEventAttendeesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const safePage = isNaN(page as number) ? 1 : page;
    const rawLimit = isNaN(limit as number) ? 10 : (limit as number);
    const safeLimitParam = Math.min(Math.max(1, rawLimit), 100);

    const result = await getEventAttendees(req.params.id, { page: safePage, limit: safeLimitParam });

    res.json(successResponse(result));
  }
);

export const getEventByIdHandler = asyncHandler(
  async (req: any, res: Response) => {
    const event = await getEventById(req.params.id, req.user?.id);

    res.json(successResponse(event));
  }
);

export const updateEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = updateEventSchema.parse(req.body);
    const isAdministrativeActor = req.user.roles?.map((r: any) => r.role?.name).includes('SUPER_ADMIN') || false;
    const event = await updateEvent(req.user.id, req.params.id, validatedData, isAdministrativeActor);

    res.json(successResponse(event, "Event updated successfully!"));
  }
);

export const deleteEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    const isAdministrativeActor = req.user.roles?.map((r: any) => r.role?.name).includes('SUPER_ADMIN') || false;
    await deleteEvent(req.user.id, req.params.id, isAdministrativeActor);

    res.json(successResponse(null, "Event deleted successfully!"));
  }
);

export const rsvpEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { status } = req.body;
    if (!status || !Object.values(RSVPStatus).includes(status)) {
      throw new AppError("Valid RSVP status parameter is required", 400);
    }

    const rsvp = await rsvpEvent(req.user.id, req.params.id, status as RSVPStatus);

    res.json(successResponse(rsvp, `RSVP status updated to ${status}!`));
  }
);
