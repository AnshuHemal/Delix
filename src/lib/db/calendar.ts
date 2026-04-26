/**
 * Calendar database helpers
 */

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import type { AttendeeStatus } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────

export async function getEventsForUser(
  userId: string,
  from: Date,
  to: Date
) {
  return prisma.calendarEvent.findMany({
    where: {
      OR: [
        { organizerId: userId },
        { attendees: { some: { userId } } },
      ],
      startTime: { gte: startOfDay(from) },
      endTime: { lte: endOfDay(to) },
    },
    include: {
      organizer: { include: { presence: true } },
      attendees: {
        include: { user: { include: { presence: true } } },
      },
      meeting: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getEventById(id: string) {
  return prisma.calendarEvent.findUnique({
    where: { id },
    include: {
      organizer: { include: { presence: true } },
      attendees: {
        include: { user: { include: { presence: true } } },
      },
      meeting: true,
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  organizerId: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  recurrence?: string;
  color?: string;
  meetingId?: string;
  attendeeIds?: string[];
}) {
  const { attendeeIds = [], ...eventData } = data;

  return prisma.calendarEvent.create({
    data: {
      ...eventData,
      attendees: {
        create: [
          // Organizer is always an accepted attendee
          { userId: data.organizerId, status: "ACCEPTED" },
          // Other attendees start as pending
          ...attendeeIds
            .filter((id) => id !== data.organizerId)
            .map((userId) => ({ userId, status: "PENDING" as AttendeeStatus })),
        ],
      },
    },
    include: {
      organizer: { include: { presence: true } },
      attendees: { include: { user: { include: { presence: true } } } },
      meeting: true,
    },
  });
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    recurrence: string;
    color: string;
  }>
) {
  return prisma.calendarEvent.update({
    where: { id },
    data,
    include: {
      organizer: { include: { presence: true } },
      attendees: { include: { user: { include: { presence: true } } } },
      meeting: true,
    },
  });
}

export async function deleteCalendarEvent(id: string) {
  return prisma.calendarEvent.delete({ where: { id } });
}

export async function updateAttendeeStatus(
  eventId: string,
  userId: string,
  status: AttendeeStatus
) {
  return prisma.calendarEventAttendee.update({
    where: { eventId_userId: { eventId, userId } },
    data: { status },
  });
}
