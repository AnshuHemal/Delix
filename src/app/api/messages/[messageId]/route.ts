/**
 * PATCH  /api/messages/[messageId]  — edit a message (content or isPinned)
 * DELETE /api/messages/[messageId]  — soft-delete a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteMessage } from "@/lib/db";
import {
  publishMessageUpdated,
  publishMessageDeleted,
} from "@/lib/pusher/publish";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const editSchema = z.object({
  content: z.string().min(1).max(10_000).optional(),
  isPinned: z.boolean().optional(),
});

const messageInclude = {
  author: { include: { presence: true } },
  attachments: true,
  reactions: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  _count: { select: { replies: true } },
} as const;

type Params = { params: Promise<{ messageId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { content, isPinned } = parsed.data;

  if (content === undefined && isPinned === undefined) {
    return NextResponse.json({ error: "At least one of content or isPinned must be provided" }, { status: 400 });
  }

  // For content edits, only the author can edit
  if (content !== undefined && existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: { content?: string; isEdited?: boolean; isPinned?: boolean } = {};
  if (content !== undefined) {
    updateData.content = content;
    updateData.isEdited = true;
  }
  if (isPinned !== undefined) {
    updateData.isPinned = isPinned;
  }

  const message = await prisma.message.update({
    where: { id: messageId },
    data: updateData,
    include: messageInclude,
  });

  // Broadcast content edits via Pusher
  const contextId = existing.channelId ?? existing.conversationId;
  const contextType = existing.channelId ? "channel" : "conversation";

  if (contextId && content !== undefined) {
    void publishMessageUpdated(
      contextId,
      contextType,
      messageId,
      content,
      message.updatedAt
    );
  }

  return NextResponse.json({ message });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteMessage(messageId);

  const contextId = existing.channelId ?? existing.conversationId;
  const contextType = existing.channelId ? "channel" : "conversation";

  if (contextId) {
    void publishMessageDeleted(contextId, contextType, messageId);
  }

  return NextResponse.json({ success: true });
}
