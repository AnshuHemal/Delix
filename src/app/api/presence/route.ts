/**
 * GET   /api/presence         — get presence for a list of userIds
 * PATCH /api/presence         — update current user's presence
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresenceForUsers, upsertPresence } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum([
    "AVAILABLE",
    "BUSY",
    "AWAY",
    "DO_NOT_DISTURB",
    "BE_RIGHT_BACK",
    "OFFLINE",
  ]),
  customMessage: z.string().max(140).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userIds = searchParams.getAll("userId");

  if (!userIds.length) {
    return NextResponse.json({ error: "At least one userId is required" }, { status: 400 });
  }

  const presences = await getPresenceForUsers(userIds);
  return NextResponse.json({ presences });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const presence = await upsertPresence(
    session.user.id,
    parsed.data.status,
    parsed.data.customMessage
  );

  return NextResponse.json({ presence });
}
