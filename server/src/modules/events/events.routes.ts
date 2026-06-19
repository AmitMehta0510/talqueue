import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  createEventHandler,
  getEventsHandler,
  getEventByIdHandler,
  getEventAttendeesHandler,
  updateEventHandler,
  deleteEventHandler,
  rsvpEventHandler,
} from "./events.controller";

const router = Router();

router.get("/", getEventsHandler);
router.post("/", protect, createEventHandler);
router.get("/:id", getEventByIdHandler);
router.get("/:id/attendees", getEventAttendeesHandler);
router.put("/:id", protect, updateEventHandler);
router.delete("/:id", protect, deleteEventHandler);
router.post("/:id/rsvp", protect, rsvpEventHandler);

export default router;
