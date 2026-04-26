/**
 * PATCH  /api/messages/[messageId]  — edit a message
 * DELETE /api/messages/[messageId]  — soft-delete a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { editMessage, deleteMessage } from "@/lib/db";
import {
  publishMessageUpdated,
  publishMessageDeleted,
} from "@/lib/pusher/publish";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const editSchema = z.object({
  content: z.string().min(1).max(10_000),
});

type Params = { params: Promise<{ messageId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await editMessage(messageId, parsed.data.content);

  // Determine context for the Pusher channel
  const contextId = existing.channelId ?? existing.conversationId;
  const contextType = existing.channelId ? "channel" : "conversation";

  if (contextId) {
    void publishMessageUpdated(
      contextId,
      contextType,
      messageId,
      parsed.data.content,
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
