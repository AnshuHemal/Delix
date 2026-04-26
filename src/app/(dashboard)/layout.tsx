import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard — Delix",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  // Fetch the user's first workspace for the presence channel.
  // Wrapped in try/catch so a DB error never crashes the whole dashboard.
  let workspaceId: string | undefined;
  if (session?.user?.id) {
    try {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true },
        orderBy: { joinedAt: "asc" },
      });
      workspaceId = membership?.workspaceId;
    } catch {
      // Non-fatal — real-time presence just won't subscribe to a workspace channel
    }
  }

  return (
    <RealtimeProvider
      userId={session?.user?.id ?? ""}
      workspaceId={workspaceId}
    >
      <DashboardShell>{children}</DashboardShell>
    </RealtimeProvider>
  );
}
