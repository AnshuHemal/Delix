/**
 * GET  /api/meetings  — list meetings for current user
 * POST /api/meetings  — create a meeting
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMeetingsForUser, createMeeting, generateMeetingCode } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  type: z.enum(["SCHEDULED", "INSTANT"]).optional().default("SCHEDULED"),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await getMeetingsForUser(session.user.id);
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const meetingCode = generateMeetingCode();

  const meeting = await createMeeting({
    title: parsed.data.title,
    description: parsed.data.description,
    organizerId: session.user.id,
    startTime: new Date(parsed.data.startTime),
    endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
    meetingCode,
    type: parsed.data.type,
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
