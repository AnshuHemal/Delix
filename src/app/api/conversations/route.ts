/**
 * GET  /api/conversations  — list conversations for current user
 * POST /api/conversations  — create a DM or group conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getConversationsForUser,
  getOrCreateDirectConversation,
  createGroupConversation,
} from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DIRECT"),
    userId: z.string(), // the other user
  }),
  z.object({
    type: z.literal("GROUP"),
    userIds: z.array(z.string()).min(2).max(25),
    name: z.string().max(80).optional(),
  }),
]);

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await getConversationsForUser(session.user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.type === "DIRECT") {
    const conversation = await getOrCreateDirectConversation(
      session.user.id,
      parsed.data.userId
    );
    return NextResponse.json({ conversation }, { status: 201 });
  }

  // GROUP
  const allUserIds = Array.from(
    new Set([session.user.id, ...parsed.data.userIds])
  );
  const conversation = await createGroupConversation(allUserIds, parsed.data.name);
  return NextResponse.json({ conversation }, { status: 201 });
}
