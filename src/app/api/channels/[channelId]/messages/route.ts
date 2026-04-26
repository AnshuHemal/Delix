/**
 * GET  /api/channels/[channelId]/messages  — paginated message history
 * POST /api/channels/[channelId]/messages  — send a message
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChannelMessages, createMessage } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const sendSchema = z.object({
  content: z.string().min(1).max(10_000),
  parentId: z.string().optional(),
});

type Params = { params: Promise<{ channelId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const result = await getChannelMessages(channelId, { cursor, limit });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await createMessage({
    content: parsed.data.content,
    authorId: session.user.id,
    channelId,
    parentId: parsed.data.parentId,
  });

  return NextResponse.json({ message }, { status: 201 });
}
