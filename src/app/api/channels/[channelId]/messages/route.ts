/**
 * GET  /api/channels/[channelId]/messages  — paginated message history
 * POST /api/channels/[channelId]/messages  — send a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChannelMessages, createMessage } from "@/lib/db";
import { publishNewMessage } from "@/lib/pusher/publish";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  content: z.string().min(1).max(10_000),
  parentId: z.string().optional(),
});

type Params = { params: Promise<{ channelId: string }> };

/** Verify the user is a member of the team that owns this channel */
async function assertChannelAccess(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  });
  if (!channel) return null;
  if (channel.team.members.length === 0) return null;
  return channel;
}
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;

  const channel = await assertChannelAccess(channelId, session.user.id);
  if (!channel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const result = await getChannelMessages(channelId, { cursor, limit });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;

  const channel = await assertChannelAccess(channelId, session.user.id);
  if (!channel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ANNOUNCEMENT channels: only Team Owners may post (Requirement 16.8, 5.9)
  if (channel.type === "ANNOUNCEMENT") {
    const teamMember = channel.team.members[0]; // already filtered to current user
    if (teamMember?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only team owners can post in announcement channels" },
        { status: 403 }
      );
    }
  }

  // 1. Persist
  const message = await createMessage({
    content: parsed.data.content,
    authorId: session.user.id,
    channelId,
    parentId: parsed.data.parentId,
  });

  // 2. Broadcast to channel subscribers (fire-and-forget)
  void publishNewMessage(channelId, "channel", message);

  return NextResponse.json({ message }, { status: 201 });
}
