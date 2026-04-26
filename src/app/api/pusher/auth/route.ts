/**
 * POST /api/pusher/auth
 *
 * Pusher channel authentication endpoint.
 * Called automatically by the Pusher client when subscribing to
 * private-* or presence-* channels.
 *
 * Validates the user's session and authorizes them for the requested channel.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pusher sends form-encoded body
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  const userId = session.user.id;
  const userName = session.user.name;
  const userImage = session.user.image ?? null;

  // ── Authorization rules ──────────────────────────────────────────────────

  // private-conversation-{id}
  if (channelName.startsWith("private-conversation-")) {
    const conversationId = channelName.replace("private-conversation-", "");
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // private-channel-{id}
  else if (channelName.startsWith("private-channel-")) {
    const channelId = channelName.replace("private-channel-", "");
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { team: { include: { members: { where: { userId } } } } },
    });
    if (!channel || channel.team.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // private-user-{id} — only the user themselves
  else if (channelName.startsWith("private-user-")) {
    const targetUserId = channelName.replace("private-user-", "");
    if (targetUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // presence-workspace-{id}
  else if (channelName.startsWith("presence-workspace-")) {
    const workspaceId = channelName.replace("presence-workspace-", "");
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // private-meeting-{id}
  else if (channelName.startsWith("private-meeting-")) {
    const meetingId = channelName.replace("private-meeting-", "");
    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Unknown channel pattern — deny
  else {
    return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
  }

  // ── Sign the auth token ──────────────────────────────────────────────────

  // Presence channels need user info
  if (channelName.startsWith("presence-")) {
    const presenceData = {
      user_id: userId,
      user_info: { name: userName, image: userImage },
    };
    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channelName,
      presenceData
    );
    return NextResponse.json(authResponse);
  }

  // Private channels
  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
