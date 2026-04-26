"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatList } from "./chat-list";
import { ConversationView } from "./conversation-view";
import { SearchDrawer } from "./search-drawer";
import type { Chat } from "./types";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ChatView() {
  const [selected, setSelected] = useState<Chat | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">

      {/* Chat list */}
      <div className="w-96 shrink-0 border-r border-border h-full overflow-hidden">
        <ChatList selected={selected} onSelect={setSelected} />
      </div>

      {/* Conversation — shrinks when drawer opens */}
      <motion.div
        animate={{ flex: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="min-w-0 h-full overflow-hidden"
      >
        <ConversationView
          chat={selected}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch((v) => !v)}
        />
      </motion.div>

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
              messages={[]}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
