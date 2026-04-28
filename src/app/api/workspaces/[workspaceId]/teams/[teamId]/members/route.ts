/**
 * POST /api/workspaces/[workspaceId]/teams/[teamId]/members — add a member to a team
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addTeamMember, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["MEMBER", "OWNER"]).optional().default("MEMBER"),
});

type Params = { params: Promise<{ workspaceId: string; teamId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  // Verify requester is a workspace member
  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify team belongs to workspace
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify the target user is a workspace member
  const targetWsMember = await getWorkspaceMember(workspaceId, parsed.data.userId);
  if (!targetWsMember) {
    return NextResponse.json({ error: "User is not a workspace member" }, { status: 400 });
  }

  const member = await addTeamMember(teamId, parsed.data.userId, parsed.data.role);
  return NextResponse.json({ member }, { status: 201 });
}
