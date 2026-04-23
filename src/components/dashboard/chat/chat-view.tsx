"use client";

import { useState } from "react";
import { ChatList } from "./chat-list";
import { ConversationView } from "./conversation-view";

type Chat = { id: string; name: string; [key: string]: unknown };

export function ChatView() {
  const [selected, setSelected] = useState<Chat | null>(null);

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 border-r border-border h-full overflow-hidden">
        <ChatList selected={selected} onSelect={setSelected} />
      </div>
      <div className="flex-1 h-full overflow-hidden">
        <ConversationView chat={selected} />
      </div>
    </div>
  );
}
