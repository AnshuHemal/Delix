/**
 * GET   /api/meetings/[meetingId]         — get meeting details
 * PATCH /api/meetings/[meetingId]         — update meeting status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getMeetingById,
  getMeetingByCode,
  updateMeetingStatus,
  joinMeeting,
  leaveMeeting,
} from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "ENDED", "CANCELLED"]).optional(),
  action: z.enum(["join", "leave"]).optional(),
});

type Params = { params: Promise<{ meetingId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;

  // Support both id and meetingCode lookup
  const meeting =
    (await getMeetingById(meetingId)) ?? (await getMeetingByCode(meetingId));

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ meeting });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;

  const meeting = await getMeetingById(meetingId);
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "join") {
    await joinMeeting(meetingId, session.user.id);
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "leave") {
    await leaveMeeting(meetingId, session.user.id);
    return NextResponse.json({ success: true });
  }

  if (parsed.data.status) {
    // Only organizer or host can change status
    const isOrganizer = meeting.organizerId === session.user.id;
    const isHost = meeting.participants.some(
      (p) => p.userId === session.user.id && p.role === "HOST"
    );
    if (!isOrganizer && !isHost) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await updateMeetingStatus(meetingId, parsed.data.status);
    return NextResponse.json({ meeting: updated });
  }

  return NextResponse.json({ error: "No action specified" }, { status: 400 });
}
