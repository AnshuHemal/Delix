/**
 * GET    /api/workspaces/[workspaceId]/teams/[teamId]  — get team
 * PATCH  /api/workspaces/[workspaceId]/teams/[teamId]  — update team
 * DELETE /api/workspaces/[workspaceId]/teams/[teamId]  — delete team
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamById, updateTeam, deleteTeam, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  avatar: z.string().url().optional(),
  isPrivate: z.boolean().optional(),
});

type Params = { params: Promise<{ workspaceId: string; teamId: string }> };

async function getTeamMemberRole(teamId: string, userId: string) {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return m?.role ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await getTeamById(teamId);
  if (!team || team.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ team });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamRole = await getTeamMemberRole(teamId, session.user.id);
  if (teamRole !== "OWNER" && wsMember.role !== "OWNER" && wsMember.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const team = await updateTeam(teamId, parsed.data);
  return NextResponse.json({ team });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teamRole = await getTeamMemberRole(teamId, session.user.id);
  if (teamRole !== "OWNER" && wsMember.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteTeam(teamId);
  return NextResponse.json({ success: true });
}
