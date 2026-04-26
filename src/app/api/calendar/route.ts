/**
 * GET  /api/calendar  — get events for a date range
 * POST /api/calendar  — create a calendar event
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEventsForUser, createCalendarEvent } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().optional().default(false),
  recurrence: z.string().optional(), // JSON string
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  meetingId: z.string().optional(),
  attendeeIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params 'from' and 'to' are required (ISO date strings)" },
      { status: 400 }
    );
  }

  const events = await getEventsForUser(
    session.user.id,
    new Date(from),
    new Date(to)
  );

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await createCalendarEvent({
    ...parsed.data,
    organizerId: session.user.id,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
  });

  return NextResponse.json({ event }, { status: 201 });
}
