/**
 * PATCH  /api/notifications/[notificationId]  — mark as read
 * DELETE /api/notifications/[notificationId]  — delete notification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationAsRead, deleteNotification } from "@/lib/db";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ notificationId: string }> };

async function assertOwner(notificationId: string, userId: string) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  return n?.userId === userId ? n : null;
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await params;
  const n = await assertOwner(notificationId, session.user.id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await markNotificationAsRead(notificationId);
  return NextResponse.json({ notification: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await params;
  const n = await assertOwner(notificationId, session.user.id);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteNotification(notificationId);
  return NextResponse.json({ success: true });
}
