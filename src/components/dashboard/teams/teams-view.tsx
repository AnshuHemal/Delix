"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TeamsPanel } from "./teams-panel";
import { ChannelView } from "./channel-view";
import { ThreadPanel } from "@/components/dashboard/chat/thread-panel";
import { useChatStore, useTeamsStore } from "@/stores";
import { useSession } from "@/lib/auth-client";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function TeamsView() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const router = useRouter();

  const activeThreadMessageId = useChatStore((s) => s.activeThreadMessageId);
  const activeChannelId = useTeamsStore((s) => s.activeChannelId);

  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWorkspace() {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) return;
        const data = await res.json();
        const first = data.workspaces?.[0];
        if (cancelled) return;
        if (first?.id) {
          setWorkspaceId(first.id);
        } else {
          // No workspace — redirect to onboarding
          router.replace("/onboarding");
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }

    fetchWorkspace();
    return () => { cancelled = true; };
  }, [router]);

  // Show nothing while resolving workspace (avoids flash of broken UI)
  if (workspaceLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workspaceId) {
    return null; // redirect in progress
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: teams + channels panel */}
      <div className="w-96 shrink-0 border-r border-border h-full overflow-hidden">
        <TeamsPanel currentUserId={currentUserId} workspaceId={workspaceId} />
      </div>

      {/* Center: channel view — shrinks when thread panel opens */}
      <motion.div
        animate={{ flex: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="min-w-0 h-full overflow-hidden"
      >
        <ChannelView workspaceId={workspaceId} />
      </motion.div>

      {/* Right: thread panel — slides in as a flex sibling, pushes channel view */}
      <AnimatePresence>
        {activeThreadMessageId && activeChannelId && (
          <motion.div
            key="thread-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="shrink-0 h-full overflow-hidden"
          >
            <ThreadPanel
              parentMessageId={activeThreadMessageId}
              conversationId={activeChannelId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
