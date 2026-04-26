/**
 * GET   /api/workspaces/[workspaceId]  — get workspace details
 * PATCH /api/workspaces/[workspaceId]  — update workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkspaceBySlug, updateWorkspace, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).optional(),
  logo: z.string().url().optional(),
});

type Params = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await params;

  // workspaceId can be either an id or a slug
  const workspace = await prisma.workspace.findFirst({
    where: { OR: [{ id: workspaceId }, { slug: workspaceId }] },
    include: {
      owner: true,
      members: {
        include: { user: { include: { presence: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { members: true, teams: true } },
    },
  });

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify membership
  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ workspace });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await params;

  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await updateWorkspace(workspaceId, parsed.data);
  return NextResponse.json({ workspace });
}
