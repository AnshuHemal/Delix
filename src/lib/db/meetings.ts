/**
 * Meetings database helpers
 */

import { prisma } from "@/lib/prisma";
import type { MeetingStatus, MeetingType, MeetingParticipantRole } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────

export async function getMeetingByCode(meetingCode: string) {
  return prisma.meeting.findUnique({
    where: { meetingCode },
    include: {
      organizer: { include: { presence: true } },
      participants: {
        include: { user: { include: { presence: true } } },
      },
      calendarEvent: true,
      _count: { select: { participants: true } },
    },
  });
}

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      organizer: { include: { presence: true } },
      participants: {
        include: { user: { include: { presence: true } } },
      },
      calendarEvent: true,
      _count: { select: { participants: true } },
    },
  });
}

export async function getMeetingsForUser(userId: string) {
  return prisma.meeting.findMany({
    where: {
      OR: [
        { organizerId: userId },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      organizer: { include: { presence: true } },
      participants: {
        include: { user: { include: { presence: true } } },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getUpcomingMeetings(userId: string, limit = 5) {
  return prisma.meeting.findMany({
    where: {
      OR: [
        { organizerId: userId },
        { participants: { some: { userId } } },
      ],
      startTime: { gte: new Date() },
      status: { in: ["SCHEDULED", "ACTIVE"] },
    },
    include: {
      organizer: { include: { presence: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function createMeeting(data: {
  title: string;
  description?: string;
  organizerId: string;
  startTime: Date;
  endTime?: Date;
  meetingCode: string;
  type?: MeetingType;
}) {
  return prisma.meeting.create({
    data: {
      ...data,
      type: data.type ?? "SCHEDULED",
      status: "SCHEDULED",
      // Organizer is automatically a host participant
      participants: {
        create: {
          userId: data.organizerId,
          role: "HOST",
        },
      },
    },
    include: {
      organizer: { include: { presence: true } },
      participants: { include: { user: { include: { presence: true } } } },
      _count: { select: { participants: true } },
    },
  });
}

export async function updateMeetingStatus(id: string, status: MeetingStatus) {
  return prisma.meeting.update({ where: { id }, data: { status } });
}

export async function joinMeeting(
  meetingId: string,
  userId: string,
  role: MeetingParticipantRole = "PARTICIPANT"
) {
  return prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId, userId } },
    create: { meetingId, userId, role, joinedAt: new Date() },
    update: { joinedAt: new Date(), leftAt: null },
  });
}

export async function leaveMeeting(meetingId: string, userId: string) {
  return prisma.meetingParticipant.update({
    where: { meetingId_userId: { meetingId, userId } },
    data: { leftAt: new Date() },
  });
}

/** Generate a unique 9-character meeting code (e.g. "abc-def-ghi") */
export function generateMeetingCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segment = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment()}-${segment()}-${segment()}`;
}
