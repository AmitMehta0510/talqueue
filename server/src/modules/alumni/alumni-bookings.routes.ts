import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import {
  checkAlumniStatusHandler,
  createAvailabilitySlotsHandler,
  getAvailableSlotsForAlumniHandler,
  bookAlumniSlotHandler,
  getAlumniIncomingBookingsHandler,
  getStudentOutgoingBookingsHandler,
  cancelAlumniBookingHandler,
} from "./alumni-bookings.controller";

const router = Router();

// GET /api/v1/alumni/status — check if verified alumni
router.get("/status", protect, checkAlumniStatusHandler);

// POST /api/v1/alumni/slots — publish new availability slots
router.post("/slots", protect, createAvailabilitySlotsHandler);

// GET /api/v1/alumni/:alumniId/slots — list available slots for booking
router.get("/:alumniId/slots", protect, getAvailableSlotsForAlumniHandler);

// POST /api/v1/alumni/slots/:slotId/book — book a slot
router.post("/slots/:slotId/book", protect, bookAlumniSlotHandler);

// GET /api/v1/alumni/bookings/incoming — get sessions scheduled with the alumni
router.get("/bookings/incoming", protect, getAlumniIncomingBookingsHandler);

// GET /api/v1/alumni/bookings/outgoing — get sessions scheduled by the student
router.get("/bookings/outgoing", protect, getStudentOutgoingBookingsHandler);

// PATCH /api/v1/alumni/bookings/:bookingId/cancel — cancel a booking
router.patch("/bookings/:bookingId/cancel", protect, cancelAlumniBookingHandler);

export default router;
