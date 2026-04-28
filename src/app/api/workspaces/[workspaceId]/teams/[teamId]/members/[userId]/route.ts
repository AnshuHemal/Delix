/**
 * DELETE /api/workspaces/[workspaceId]/teams/[teamId]/members/[userId] — remove a team member
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { removeTeamMember, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ workspaceId: string; teamId: string; userId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId, userId } = await params;

  // Verify requester is a workspace member
  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify team belongs to workspace
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check requester's role in the team
  const requesterMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: session.user.id } },
  });

  // Allow: Team Owner OR self-removal
  const isSelfRemoval = session.user.id === userId;
  const isTeamOwner = requesterMember?.role === "OWNER";

  if (!isSelfRemoval && !isTeamOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Guard: cannot remove the last owner
  const targetMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (targetMember?.role === "OWNER") {
    const ownerCount = await prisma.teamMember.count({
      where: { teamId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last team owner" },
        { status: 409 }
      );
    }
  }

  await removeTeamMember(teamId, userId);
  return NextResponse.json({ success: true });
}
