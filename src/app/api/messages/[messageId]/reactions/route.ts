/**
 * POST /api/messages/[messageId]/reactions  — toggle a reaction
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleReaction } from "@/lib/db";
import {
  publishReactionAdded,
  publishReactionRemoved,
} from "@/lib/pusher/publish";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  emoji: z.string().min(1).max(10),
});

type Params = { params: Promise<{ messageId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await toggleReaction(messageId, session.user.id, parsed.data.emoji);

  const contextId = message.channelId ?? message.conversationId;
  const contextType = message.channelId ? "channel" : "conversation";

  if (contextId) {
    if (result.action === "added") {
      void publishReactionAdded(contextId, contextType, {
        messageId,
        emoji: parsed.data.emoji,
        userId: session.user.id,
        userName: session.user.name,
        userImage: session.user.image ?? null,
      });
    } else {
      void publishReactionRemoved(contextId, contextType, {
        messageId,
        emoji: parsed.data.emoji,
        userId: session.user.id,
      });
    }
  }

  return NextResponse.json(result);
}
