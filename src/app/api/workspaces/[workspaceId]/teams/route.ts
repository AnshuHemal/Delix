/**
 * GET  /api/workspaces/[workspaceId]/teams  — list teams in workspace
 * POST /api/workspaces/[workspaceId]/teams  — create a team
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamsForWorkspace, createTeam, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  isPrivate: z.boolean().optional().default(false),
});

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await params;

  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teams = await getTeamsForWorkspace(workspaceId, session.user.id);
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await params;

  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const team = await createTeam({
    workspaceId,
    createdById: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json({ team }, { status: 201 });
}
