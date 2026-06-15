import { RSVPStatus, EventType } from "@prisma/client";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

export const createEvent = async (userId: string, data: any) => {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      location: data.location,
      meetingUrl: data.meetingUrl || null,
      capacity: data.capacity,
      type: data.type,
      collegeId: data.collegeId || null,
      companyId: data.companyId || null,
      communityId: data.communityId || null,
      createdById: userId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      college: true,
      company: true,
      community: true,
    },
  });

  return event;
};

export const getEventById = async (id: string, userId?: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      college: true,
      company: true,
      community: true,
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  let userRSVPStatus = null;
  if (userId) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
      select: { status: true },
    });
    userRSVPStatus = rsvp?.status || null;
  }

  return {
    ...event,
    userRSVPStatus,
  };
};

export const getEvents = async (filters: {
  collegeId?: string;
  companyId?: string;
  communityId?: string;
  type?: string;
}, userId?: string) => {
  const where: any = {};

  if (filters.collegeId) where.collegeId = filters.collegeId;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.communityId) where.communityId = filters.communityId;
  if (filters.type) where.type = filters.type as EventType;

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { rsvps: true },
      },
    },
  });

  if (userId) {
    const userRsvps = await prisma.eventRSVP.findMany({
      where: {
        userId,
        eventId: { in: events.map((e) => e.id) },
      },
      select: { eventId: true, status: true },
    });

    const rsvpMap = new Map(userRsvps.map((r) => [r.eventId, r.status]));
    return events.map((e) => ({
      ...e,
      userRSVPStatus: rsvpMap.get(e.id) || null,
    }));
  }

  return events.map((e) => ({ ...e, userRSVPStatus: null }));
};

export const updateEvent = async (userId: string, id: string, data: any) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  if (event.createdById !== userId) {
    throw new AppError("Unauthorized to modify this event", 403);
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      location: data.location,
      meetingUrl: data.meetingUrl !== undefined ? (data.meetingUrl || null) : undefined,
      capacity: data.capacity,
      type: data.type,
      collegeId: data.collegeId !== undefined ? (data.collegeId || null) : undefined,
      companyId: data.companyId !== undefined ? (data.companyId || null) : undefined,
      communityId: data.communityId !== undefined ? (data.communityId || null) : undefined,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  return updated;
};

export const deleteEvent = async (userId: string, id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  if (event.createdById !== userId) {
    throw new AppError("Unauthorized to delete this event", 403);
  }

  await prisma.event.delete({
    where: { id },
  });

  return { success: true };
};

export const rsvpEvent = async (userId: string, eventId: string, status: RSVPStatus) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: {
        select: { rsvps: true },
      },
    },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  // Check capacity limit if setting to GOING
  if (status === RSVPStatus.GOING && event.capacity && event._count.rsvps >= event.capacity) {
    // Check if the user is already going (so we're just updating status or keeping it)
    const existing = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing?.status !== RSVPStatus.GOING) {
      throw new AppError("Event capacity has been reached", 400);
    }
  }

  const rsvp = await prisma.eventRSVP.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
    update: {
      status,
    },
    create: {
      eventId,
      userId,
      status,
    },
  });

  return rsvp;
};
