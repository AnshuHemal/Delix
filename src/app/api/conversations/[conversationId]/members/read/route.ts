/**
 * PATCH /api/conversations/[conversationId]/members/read — mark conversation as read
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markConversationAsRead } from "@/lib/db";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ conversationId: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await markConversationAsRead(conversationId, session.user.id);

  return NextResponse.json({ success: true });
}
