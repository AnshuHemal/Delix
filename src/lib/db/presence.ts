/**
 * User Presence database helpers
 */

import { prisma } from "@/lib/prisma";
import type { PresenceStatus } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────

export async function getUserPresence(userId: string) {
  return prisma.userPresence.findUnique({ where: { userId } });
}

export async function getPresenceForUsers(userIds: string[]) {
  return prisma.userPresence.findMany({
    where: { userId: { in: userIds } },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function upsertPresence(
  userId: string,
  status: PresenceStatus,
  customMessage?: string
) {
  return prisma.userPresence.upsert({
    where: { userId },
    create: {
      userId,
      status,
      customMessage,
      lastSeen: new Date(),
    },
    update: {
      status,
      customMessage,
      lastSeen: new Date(),
    },
  });
}

export async function setUserOffline(userId: string) {
  return prisma.userPresence.upsert({
    where: { userId },
    create: { userId, status: "OFFLINE", lastSeen: new Date() },
    update: { status: "OFFLINE", lastSeen: new Date() },
  });
}

export async function refreshLastSeen(userId: string) {
  return prisma.userPresence.upsert({
    where: { userId },
    create: { userId, status: "AVAILABLE", lastSeen: new Date() },
    update: { lastSeen: new Date() },
  });
}
