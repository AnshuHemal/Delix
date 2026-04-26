/**
 * GET    /api/calendar/[eventId]  — get event
 * PATCH  /api/calendar/[eventId]  — update event
 * DELETE /api/calendar/[eventId]  — delete event
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getEventById,
  updateCalendarEvent,
  deleteCalendarEvent,
  updateAttendeeStatus,
} from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  recurrence: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  // Attendee RSVP
  attendeeStatus: z.enum(["ACCEPTED", "DECLINED", "TENTATIVE"]).optional(),
});

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Handle RSVP separately
  if (parsed.data.attendeeStatus) {
    const updated = await updateAttendeeStatus(
      eventId,
      session.user.id,
      parsed.data.attendeeStatus
    );
    return NextResponse.json({ attendee: updated });
  }

  // Only organizer can edit event details
  if (event.organizerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { attendeeStatus: _, ...updateData } = parsed.data;
  const updated = await updateCalendarEvent(eventId, {
    ...updateData,
    startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
    endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (event.organizerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteCalendarEvent(eventId);
  return NextResponse.json({ success: true });
}
