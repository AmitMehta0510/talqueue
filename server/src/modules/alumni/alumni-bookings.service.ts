import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

/**
 * Validates whether the user is a TPO-verified alumni.
 */
export const checkVerifiedAlumni = async (userId: string): Promise<boolean> => {
  const education = await prisma.education.findFirst({
    where: {
      userId,
      isAlumni: true,
      alumniVerified: true,
    },
  });
  return !!education;
};

/**
 * Allows verified alumni to publish multiple mentorship time slots.
 */
export const createAvailabilitySlots = async (
  alumniId: string,
  slots: Array<{ startTime: Date | string; endTime: Date | string }>,
) => {
  const isVerified = await checkVerifiedAlumni(alumniId);
  if (!isVerified) {
    throw new AppError("Only verified alumni can publish availability slots.", 403);
  }

  if (!slots.length) {
    throw new AppError("At least one slot must be provided.", 400);
  }

  // Map dates and check constraints
  const data = slots.map((s) => {
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);

    if (start >= end) {
      throw new AppError("Start time must be before end time.", 400);
    }
    if (start < new Date()) {
      throw new AppError("Cannot publish slots in the past.", 400);
    }

    return {
      alumniId,
      startTime: start,
      endTime: end,
      status: "AVAILABLE" as const,
    };
  });

  const created = await prisma.alumniAvailabilitySlot.createMany({
    data,
  });

  return created;
};

/**
 * Returns available slots for a specific alumni.
 */
export const getAvailableSlotsForAlumni = async (alumniId: string) => {
  const slots = await prisma.alumniAvailabilitySlot.findMany({
    where: {
      alumniId,
      status: "AVAILABLE",
      startTime: { gt: new Date() },
    },
    orderBy: { startTime: "asc" },
  });
  return slots;
};

/**
 * Book a specific slot for mentorship.
 */
export const bookAlumniSlot = async (
  studentId: string,
  slotId: string,
  payload: { topic: string; notes?: string; meetingUrl?: string },
) => {
  const slot = await prisma.alumniAvailabilitySlot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw new AppError("Availability slot not found.", 404);
  }

  if (slot.status !== "AVAILABLE") {
    throw new AppError("Slot is already booked or unavailable.", 400);
  }

  if (slot.alumniId === studentId) {
    throw new AppError("Alumni cannot book their own availability slot.", 400);
  }

  // Use a transaction to safely mark slot as booked and create booking log
  const [updatedSlot, booking] = await prisma.$transaction([
    prisma.alumniAvailabilitySlot.update({
      where: { id: slotId },
      data: { status: "BOOKED" },
    }),
    prisma.alumniSlotBooking.create({
      data: {
        slotId,
        studentId,
        topic: payload.topic,
        notes: payload.notes || null,
        meetingUrl: payload.meetingUrl || null,
        status: "SCHEDULED",
      },
      include: {
        slot: {
          include: {
            alumni: {
              select: {
                id: true,
                username: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return booking;
};

/**
 * Fetch incoming mentorship requests booked with the alumni.
 */
export const getAlumniIncomingBookings = async (alumniId: string) => {
  const bookings = await prisma.alumniSlotBooking.findMany({
    where: {
      slot: { alumniId },
    },
    include: {
      slot: true,
      student: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: {
      slot: { startTime: "asc" },
    },
  });
  return bookings;
};

/**
 * Fetch outgoing mentorship slots scheduled by the student.
 */
export const getStudentOutgoingBookings = async (studentId: string) => {
  const bookings = await prisma.alumniSlotBooking.findMany({
    where: { studentId },
    include: {
      slot: {
        include: {
          alumni: {
            select: {
              id: true,
              username: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
    orderBy: {
      slot: { startTime: "asc" },
    },
  });
  return bookings;
};

/**
 * Cancel a scheduled booking and restore the slot availability.
 */
export const cancelAlumniBooking = async (userId: string, bookingId: string) => {
  const booking = await prisma.alumniSlotBooking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });

  if (!booking) {
    throw new AppError("Booking not found.", 404);
  }

  // Ensure requester is participant (student or alumni)
  if (booking.studentId !== userId && booking.slot.alumniId !== userId) {
    throw new AppError("Access denied. You are not a participant in this booking.", 403);
  }

  const [updatedBooking] = await prisma.$transaction([
    prisma.alumniSlotBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    }),
    prisma.alumniAvailabilitySlot.update({
      where: { id: booking.slotId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  return updatedBooking;
};
