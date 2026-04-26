/**
 * GET  /api/workspaces/[workspaceId]/teams/[teamId]/channels  — list channels
 * POST /api/workspaces/[workspaceId]/teams/[teamId]/channels  — create channel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createChannel, getWorkspaceMember } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  type: z.enum(["STANDARD", "ANNOUNCEMENT", "PRIVATE"]).optional().default("STANDARD"),
});

type Params = { params: Promise<{ workspaceId: string; teamId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const channels = await prisma.channel.findMany({
    where: {
      teamId,
      OR: [
        { type: { not: "PRIVATE" } },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      _count: { select: { messages: true, members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, teamId } = await params;

  const wsMember = await getWorkspaceMember(workspaceId, session.user.id);
  if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const channel = await createChannel({
    teamId,
    createdById: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json({ channel }, { status: 201 });
}
