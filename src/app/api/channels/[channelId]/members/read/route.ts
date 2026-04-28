/**
 * PATCH /api/channels/[channelId]/members/read — mark channel as read for current user
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

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;

  const channel = await assertChannelAccess(channelId, session.user.id);
  if (!channel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    create: { channelId, userId: session.user.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
