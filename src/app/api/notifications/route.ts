/**
 * GET   /api/notifications         — list notifications
 * PATCH /api/notifications         — mark all as read
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
} from "@/lib/db";
import { pusherServer } from "@/lib/pusher/server";
import { PusherChannels, PusherEvents } from "@/lib/pusher/events";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const countOnly = searchParams.get("countOnly") === "true";

  if (countOnly) {
    const count = await getUnreadNotificationCount(session.user.id);
    return NextResponse.json({ count });
  }

  const notifications = await getNotificationsForUser(session.user.id, {
    unreadOnly,
    limit,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllNotificationsAsRead(session.user.id);

  // Notify other tabs/devices
  void pusherServer.trigger(
    PusherChannels.user(session.user.id),
    PusherEvents.NOTIFICATION_ALL_READ,
    { userId: session.user.id }
  );

  return NextResponse.json({ success: true });
}
