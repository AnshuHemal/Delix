/**
 * Workspace database helpers
 */

import { prisma } from "@/lib/prisma";
import type { WorkspaceRole } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────

export async function getWorkspaceBySlug(slug: string) {
  return prisma.workspace.findUnique({
    where: { slug },
    include: {
      owner: true,
      members: {
        include: {
          user: { include: { presence: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { members: true, teams: true } },
    },
  });
}

export async function getWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { members: true, teams: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { user: { include: { presence: true } } },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export async function createWorkspace(data: {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: string;
}) {
  return prisma.workspace.create({
    data: {
      ...data,
      members: {
        create: {
          userId: data.ownerId,
          role: "OWNER",
        },
      },
    },
    include: {
      _count: { select: { members: true, teams: true } },
    },
  });
}

export async function updateWorkspace(
  id: string,
  data: Partial<{ name: string; description: string; logo: string }>
) {
  return prisma.workspace.update({ where: { id }, data });
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = "MEMBER"
) {
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { workspaceId, userId, role },
    update: { role },
  });
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
) {
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { role },
  });
}
