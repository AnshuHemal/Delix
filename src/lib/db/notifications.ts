/**
 * Notifications database helpers
 */

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────

export async function getNotificationsForUser(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  relatedId?: string;
  relatedType?: string;
}) {
  return prisma.notification.create({ data });
}

export async function markNotificationAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(id: string) {
  return prisma.notification.delete({ where: { id } });
}
