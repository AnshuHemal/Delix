/**
 * GET  /api/workspaces        — list workspaces for the current user
 * POST /api/workspaces        — create a new workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkspacesForUser, createWorkspace } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(300).optional(),
  logo: z.string().url().optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaces = await getWorkspacesForUser(session.user.id);
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const workspace = await createWorkspace({
      ...parsed.data,
      ownerId: session.user.id,
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
