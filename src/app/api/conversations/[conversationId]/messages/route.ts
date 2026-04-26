/**
 * GET  /api/conversations/[conversationId]/messages  — paginated messages
 * POST /api/conversations/[conversationId]/messages  — send a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getConversationMessages,
  createMessage,
  markConversationAsRead,
} from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  content: z.string().min(1).max(10_000),
  parentId: z.string().optional(),
});

type Params = { params: Promise<{ conversationId: string }> };

async function assertMember(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!member;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  const isMember = await assertMember(conversationId, session.user.id);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const result = await getConversationMessages(conversationId, { cursor, limit });

  // Mark as read when fetching latest messages (no cursor = first load)
  if (!cursor) {
    await markConversationAsRead(conversationId, session.user.id);
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  const isMember = await assertMember(conversationId, session.user.id);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await createMessage({
    content: parsed.data.content,
    authorId: session.user.id,
    conversationId,
    parentId: parsed.data.parentId,
  });

  // Update conversation updatedAt for sorting
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message }, { status: 201 });
}
