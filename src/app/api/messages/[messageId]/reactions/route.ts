/**
 * POST /api/messages/[messageId]/reactions  — toggle a reaction
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleReaction } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const schema = z.object({
  emoji: z.string().min(1).max(10),
});

type Params = { params: Promise<{ messageId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await toggleReaction(messageId, session.user.id, parsed.data.emoji);
  return NextResponse.json(result);
}
