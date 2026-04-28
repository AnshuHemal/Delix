/**
 * PATCH  /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]  — update channel
 * DELETE /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]  — delete channel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateChannel, deleteChannel, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  topic: z.string().max(120).optional(),
  isArchived: z.boolean().optional(),
});

type Params = { params: Promise<{ workspaceId: string; teamId: string; channelId: string }> };

async function getTeamOwnerRole(teamId: string, userId: string) {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return m?.role ?? null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId, channelId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamRole = await getTeamOwnerRole(teamId, session.user.id);
  if (teamRole !== "OWNER") {
    return NextResponse.json({ error: "Forbidden: Team Owner required" }, { status: 403 });
  }

  // Verify channel belongs to this team
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.teamId !== teamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateChannel(channelId, parsed.data);
  return NextResponse.json({ channel: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId, channelId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamRole = await getTeamOwnerRole(teamId, session.user.id);
  if (teamRole !== "OWNER") {
    return NextResponse.json({ error: "Forbidden: Team Owner required" }, { status: 403 });
  }

  // Verify channel belongs to this team
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.teamId !== teamId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Guard: cannot delete the last channel in a team
  const channelCount = await prisma.channel.count({ where: { teamId } });
  if (channelCount <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last channel" },
      { status: 409 }
    );
  }

  await deleteChannel(channelId);
  return NextResponse.json({ success: true });
}
