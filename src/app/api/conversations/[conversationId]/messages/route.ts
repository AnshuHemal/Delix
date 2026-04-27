/**
 * GET  /api/conversations/[conversationId]/messages  — paginated messages
 * POST /api/conversations/[conversationId]/messages  — send a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getConversationMessages,
  getThreadReplies,
  createMessage,
  markConversationAsRead,
} from "@/lib/db";
import {
  publishNewMessage,
  publishConversationUpdated,
} from "@/lib/pusher/publish";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const attachmentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

const sendSchema = z.object({
  content: z.string().min(1).max(10_000),
  parentId: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

type Params = { params: Promise<{ conversationId: string }> };

async function getConversationWithMembers(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: { select: { userId: true } } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const search = searchParams.get("search") ?? undefined;
  const parentId = searchParams.get("parentId") ?? undefined;
  const hasAttachment = searchParams.get("hasAttachment") === "true";

  // Thread mode: return replies for a parent message instead of paginated messages
  if (parentId) {
    const replies = await getThreadReplies(parentId);
    return NextResponse.json({ messages: replies, hasMore: false, nextCursor: undefined });
  }

  const result = await getConversationMessages(conversationId, {
    cursor,
    limit,
    search,
    hasAttachment: hasAttachment || undefined,
  });

  // Mark as read on first load (no cursor, no search)
  if (!cursor && !search) {
    await markConversationAsRead(conversationId, session.user.id);
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 1. Persist to DB
  const message = await createMessage({
    content: parsed.data.content,
    authorId: session.user.id,
    conversationId,
    parentId: parsed.data.parentId,
  });

  // 1b. Persist attachments if provided
  if (parsed.data.attachments && parsed.data.attachments.length > 0) {
    await prisma.messageAttachment.createMany({
      data: parsed.data.attachments.map((a) => ({ ...a, messageId: message.id })),
    });
  }

  // 2. Update conversation timestamp
  const now = new Date();
  const conversation = await getConversationWithMembers(conversationId);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: now },
  });

  // 3. Publish real-time events (fire-and-forget — don't block the response)
  const memberIds = conversation?.members.map((m) => m.userId) ?? [];
  void Promise.all([
    // Broadcast new message to the conversation channel
    publishNewMessage(conversationId, "conversation", message),
    // Notify each member's personal channel (for sidebar preview + unread)
    publishConversationUpdated(conversationId, memberIds, message, now),
  ]);

  return NextResponse.json({ message }, { status: 201 });
}
