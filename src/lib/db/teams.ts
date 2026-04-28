/**
 * Teams & Channels database helpers
 */

import { prisma } from "@/lib/prisma";
import type { ChannelType, TeamRole } from "@/types";

// ─── Teams ────────────────────────────────────────────────────────────────

export async function getTeamsForWorkspace(workspaceId: string, userId: string) {
  return prisma.team.findMany({
    where: {
      workspaceId,
      OR: [
        { isPrivate: false },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: {
        include: { user: { include: { presence: true } } },
      },
      channels: {
        include: {
          _count: { select: { messages: true, members: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { members: true, channels: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTeamById(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: { user: { include: { presence: true } } },
      },
      channels: {
        include: {
          _count: { select: { messages: true, members: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { members: true, channels: true } },
    },
  });
}

export async function createTeam(data: {
  workspaceId: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  createdById: string;
}) {
  return prisma.team.create({
    data: {
      ...data,
      // Creator is automatically an owner member
      members: {
        create: { userId: data.createdById, role: "OWNER" },
      },
      // Every team gets a General channel by default
      channels: {
        create: {
          name: "General",
          description: "General discussion",
          type: "STANDARD",
          createdById: data.createdById,
        },
      },
    },
    include: {
      members: { include: { user: { include: { presence: true } } } },
      channels: { include: { _count: { select: { messages: true, members: true } } } },
      _count: { select: { members: true, channels: true } },
    },
  });
}

export async function updateTeam(
  id: string,
  data: Partial<{ name: string; description: string; avatar: string; isPrivate: boolean }>
) {
  return prisma.team.update({ where: { id }, data });
}

export async function deleteTeam(id: string) {
  return prisma.team.delete({ where: { id } });
}

export async function addTeamMember(teamId: string, userId: string, role: TeamRole = "MEMBER") {
  return prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, role },
    update: { role },
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });
}

// ─── Channels ─────────────────────────────────────────────────────────────

export async function getChannelById(channelId: string) {
  return prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      team: true,
      members: { include: { user: { include: { presence: true } } } },
      _count: { select: { messages: true, members: true } },
    },
  });
}

export async function createChannel(data: {
  teamId: string;
  name: string;
  description?: string;
  type?: ChannelType;
  createdById: string;
}) {
  return prisma.channel.create({
    data: {
      ...data,
      type: data.type ?? "STANDARD",
    },
    include: {
      _count: { select: { messages: true, members: true } },
    },
  });
}

export async function updateChannel(
  id: string,
  data: Partial<{ name: string; description: string; type: ChannelType; topic: string; isArchived: boolean }>
) {
  return prisma.channel.update({ where: { id }, data });
}

export async function deleteChannel(id: string) {
  return prisma.channel.delete({ where: { id } });
}

export async function addChannelMember(channelId: string, userId: string) {
  return prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId },
    update: {},
  });
}

export async function removeChannelMember(channelId: string, userId: string) {
  return prisma.channelMember.delete({
    where: { channelId_userId: { channelId, userId } },
  });
}
