/**
 * Messages & Conversations database helpers
 */

import { prisma } from "@/lib/prisma";

const MESSAGE_PAGE_SIZE = 50;

// ─── Message includes (reused across queries) ─────────────────────────────

const messageInclude = {
  author: { include: { presence: true } },
  attachments: true,
  reactions: {
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  },
  _count: { select: { replies: true } },
} as const;

// ─── Channel messages ─────────────────────────────────────────────────────

export async function getChannelMessages(
  channelId: string,
  options: { cursor?: string; limit?: number } = {}
) {
  const limit = options.limit ?? MESSAGE_PAGE_SIZE;

  const messages = await prisma.message.findMany({
    where: { channelId, parentId: null }, // top-level only
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return {
    messages: messages.reverse(), // chronological order
    hasMore,
    nextCursor: hasMore ? messages[0]?.id : undefined,
  };
}

// ─── Conversation messages ─────────────────────────────────────────────────

export async function getConversationMessages(
  conversationId: string,
  options: { cursor?: string; limit?: number; search?: string; hasAttachment?: boolean } = {}
) {
  const limit = options.limit ?? MESSAGE_PAGE_SIZE;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      parentId: null,
      ...(options.search
        ? { content: { contains: options.search, mode: "insensitive" } }
        : {}),
      ...(options.hasAttachment
        ? { attachments: { some: {} } }
        : {}),
    },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return {
    messages: messages.reverse(),
    hasMore,
    nextCursor: hasMore ? messages[0]?.id : undefined,
  };
}

// ─── Thread replies ────────────────────────────────────────────────────────

export async function getThreadReplies(parentId: string) {
  return prisma.message.findMany({
    where: { parentId },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
  });
}

// ─── Create message ────────────────────────────────────────────────────────

export async function createMessage(data: {
  content: string;
  authorId: string;
  channelId?: string;
  conversationId?: string;
  parentId?: string;
}) {
  return prisma.message.create({
    data,
    include: messageInclude,
  });
}

// ─── Edit message ──────────────────────────────────────────────────────────

export async function editMessage(id: string, content: string) {
  return prisma.message.update({
    where: { id },
    data: { content, isEdited: true },
    include: messageInclude,
  });
}

// ─── Soft-delete message ───────────────────────────────────────────────────

export async function deleteMessage(id: string) {
  return prisma.message.update({
    where: { id },
    data: { isDeleted: true, content: "" },
  });
}

// ─── Reactions ─────────────────────────────────────────────────────────────

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
    return { action: "removed" as const };
  }

  await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
  return { action: "added" as const };
}

// ─── Conversations ─────────────────────────────────────────────────────────

export async function getConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: { user: { include: { presence: true } } },
      },
      messages: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: messageInclude,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    conversations.map(async ({ messages, ...conversation }) => ({
      ...conversation,
      lastMessage: messages[0] ?? null,
      unreadCount: await getUnreadCount(conversation.id, userId),
    }))
  );
}

export async function getOrCreateDirectConversation(userAId: string, userBId: string) {
  // Find existing DM between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      members: {
        every: { userId: { in: [userAId, userBId] } },
      },
    },
    include: {
      members: { include: { user: { include: { presence: true } } } },
    },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      type: "DIRECT",
      members: {
        create: [{ userId: userAId }, { userId: userBId }],
      },
    },
    include: {
      members: { include: { user: { include: { presence: true } } } },
    },
  });
}

export async function createGroupConversation(userIds: string[], name?: string) {
  return prisma.conversation.create({
    data: {
      type: "GROUP",
      members: {
        create: userIds.map((userId) => ({ userId })),
      },
    },
    include: {
      members: { include: { user: { include: { presence: true } } } },
    },
  });
}

// ─── Unread counts ─────────────────────────────────────────────────────────

export async function getUnreadCount(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!member?.lastReadAt) {
    return prisma.message.count({ where: { conversationId } });
  }

  return prisma.message.count({
    where: {
      conversationId,
      createdAt: { gt: member.lastReadAt },
      authorId: { not: userId },
    },
  });
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  return prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}
