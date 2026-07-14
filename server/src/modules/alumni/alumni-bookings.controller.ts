import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import {
  createAvailabilitySlots,
  getAvailableSlotsForAlumni,
  bookAlumniSlot,
  getAlumniIncomingBookings,
  getStudentOutgoingBookings,
  cancelAlumniBooking,
  checkVerifiedAlumni,
} from "./alumni-bookings.service";

/**
 * Checks if the authenticated user is a verified alumni.
 */
export const checkAlumniStatusHandler = asyncHandler(async (req: any, res: Response) => {
  const isAlumni = await checkVerifiedAlumni(req.user.id);
  res.json(successResponse({ isAlumni }));
});

/**
 * Creates multiple availability slots for the logged-in alumni.
 */
export const createAvailabilitySlotsHandler = asyncHandler(async (req: any, res: Response) => {
  const { slots } = req.body;
  const result = await createAvailabilitySlots(req.user.id, slots || []);
  res.status(201).json(successResponse(result, "Availability slots created successfully."));
});

/**
 * Lists available slots for booking for a specific alumni.
 */
export const getAvailableSlotsForAlumniHandler = asyncHandler(async (req: any, res: Response) => {
  const { alumniId } = req.params;
  const slots = await getAvailableSlotsForAlumni(alumniId);
  res.json(successResponse(slots));
});

/**
 * Books a slot for a student.
 */
export const bookAlumniSlotHandler = asyncHandler(async (req: any, res: Response) => {
  const { slotId } = req.params;
  const { topic, notes, meetingUrl } = req.body;
  
  if (!topic?.trim()) {
    return res.status(400).json({ error: "Booking topic is required." });
  }

  const booking = await bookAlumniSlot(req.user.id, slotId, {
    topic,
    notes,
    meetingUrl,
  });

  res.status(201).json(successResponse(booking, "Slot booked successfully."));
});

/**
 * Retrieves incoming bookings for the authenticated alumni.
 */
export const getAlumniIncomingBookingsHandler = asyncHandler(async (req: any, res: Response) => {
  const bookings = await getAlumniIncomingBookings(req.user.id);
  res.json(successResponse(bookings));
});

/**
 * Retrieves outgoing bookings scheduled by the authenticated student.
 */
export const getStudentOutgoingBookingsHandler = asyncHandler(async (req: any, res: Response) => {
  const bookings = await getStudentOutgoingBookings(req.user.id);
  res.json(successResponse(bookings));
});

/**
 * Cancels a booking (by student or alumni).
 */
export const cancelAlumniBookingHandler = asyncHandler(async (req: any, res: Response) => {
  const { bookingId } = req.params;
  const result = await cancelAlumniBooking(req.user.id, bookingId);
  res.json(successResponse(result, "Booking cancelled successfully."));
});
