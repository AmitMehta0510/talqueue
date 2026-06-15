import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import {
  createEvent,
  getEventById,
  getEvents,
  updateEvent,
  deleteEvent,
  rsvpEvent,
} from "./events.service";
import { createEventSchema, updateEventSchema } from "./events.validation";
import { RSVPStatus } from "@prisma/client";

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

    const events = await getEvents(filters, req.user?.id);

    res.json(successResponse(events));
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
    const event = await updateEvent(req.user.id, req.params.id, validatedData);

    res.json(successResponse(event, "Event updated successfully!"));
  }
);

export const deleteEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    await deleteEvent(req.user.id, req.params.id);

    res.json(successResponse(null, "Event deleted successfully!"));
  }
);

export const rsvpEventHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { status } = req.body;
    if (!status || !Object.values(RSVPStatus).includes(status)) {
      res.status(400).json({ success: false, message: "Valid RSVP status is required" });
      return;
    }

    const rsvp = await rsvpEvent(req.user.id, req.params.id, status as RSVPStatus);

    res.json(successResponse(rsvp, `RSVP status updated to ${status}!`));
  }
);
