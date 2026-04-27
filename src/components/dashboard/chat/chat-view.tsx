"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatList } from "./chat-list";
import { ConversationView } from "./conversation-view";
import { SearchDrawer } from "./search-drawer";
import { ThreadPanel } from "./thread-panel";
import { useChatStore } from "@/stores";
import { useSession } from "@/lib/auth-client";
import type { ConversationWithDetails } from "@/types/db";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ChatView() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const conversations = useChatStore((s) => s.conversations);
  const activeThreadMessageId = useChatStore((s) => s.activeThreadMessageId);
  const setActiveThreadMessage = useChatStore((s) => s.setActiveThreadMessage);

  const [showSearch, setShowSearch] = useState(false);

  // Derive the selected conversation object from the store
  const selectedConversation: ConversationWithDetails | null =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  function handleSelect(conv: ConversationWithDetails) {
    setActiveConversation(conv.id);
  }

  // When opening search, close thread panel first (Requirement 12.8)
  function handleToggleSearch() {
    if (!showSearch && activeThreadMessageId) {
      setActiveThreadMessage(null);
    }
    setShowSearch((v) => !v);
  }

  // Build a minimal chat-compatible shape for ConversationView (still uses local Chat type internally)
  // ConversationView will be updated in task 5 — for now we adapt the shape
  const chatForView = selectedConversation
    ? {
        id: selectedConversation.id,
        name: (() => {
          if (selectedConversation.type === "DIRECT") {
            const other = selectedConversation.members.find(
              (m) => m.userId !== currentUserId
            );
            return other?.user.name ?? "Direct Message";
          }
          return selectedConversation.members
            .map((m) => m.user.name ?? "Unknown")
            .slice(0, 3)
            .join(", ");
        })(),
        online: false,
        avatar: (() => {
          if (selectedConversation.type === "DIRECT") {
            const other = selectedConversation.members.find(
              (m) => m.userId !== currentUserId
            );
            return other?.user.image ?? undefined;
          }
          return undefined;
        })(),
      }
    : null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* Chat list */}
      <div className="w-96 shrink-0 border-r border-border h-full overflow-hidden">
        <ChatList
          currentUserId={currentUserId}
          selectedId={activeConversationId}
          onSelect={handleSelect}
        />
      </div>

      {/* Conversation — shrinks when drawer opens */}
      <motion.div
        animate={{ flex: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="min-w-0 h-full overflow-hidden"
      >
        <ConversationView
          chat={chatForView}
          showSearch={showSearch}
          onToggleSearch={handleToggleSearch}
        />
      </motion.div>

      {/* Thread Panel — slides in as a flex sibling, pushes conversation */}
      <AnimatePresence>
        {activeThreadMessageId && activeConversationId && (
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
              conversationId={activeConversationId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search drawer — slides in as a flex sibling, pushes conversation */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            key="search-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="shrink-0 h-full overflow-hidden border-l border-border"
          >
            <SearchDrawer
              open={showSearch}
              onClose={() => setShowSearch(false)}
              conversationId={activeConversationId}
              currentUserId={currentUserId}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
