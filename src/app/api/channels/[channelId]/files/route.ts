/**
 * GET /api/channels/[channelId]/files — list files shared in a channel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  const files = await prisma.file.findMany({
    where: { channelId },
    include: {
      uploadedBy: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = files.length > limit;
  if (hasMore) files.pop();

  return NextResponse.json({
    files,
    hasMore,
    nextCursor: hasMore ? files[files.length - 1]?.id : undefined,
  });
}
