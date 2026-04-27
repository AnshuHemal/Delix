/**
 * GET /api/workspaces/members — list workspace members for @mention autocomplete and new conversation modal
 *
 * Query params:
 *   search  (optional) — filter members by name (case-insensitive), up to 20 results
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the workspace the current user belongs to
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json({ members: [] });
  }

  const { workspaceId } = membership;
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      // Exclude the current user from results
      userId: { not: session.user.id },
      ...(search
        ? {
            user: {
              name: { contains: search, mode: "insensitive" },
            },
          }
        : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
    take: 20,
  });

  const members = workspaceMembers.map((wm) => ({
    id: wm.user.id,
    name: wm.user.name,
    image: wm.user.image,
  }));

  return NextResponse.json({ members });
}
