"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MessageWithAuthor } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CONTENT_PREVIEW_MAX = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateContent(content: string): string {
  if (content.length <= CONTENT_PREVIEW_MAX) return content;
  return content.slice(0, CONTENT_PREVIEW_MAX).trimEnd() + "…";
}

// ─── PinnedMessageRow ─────────────────────────────────────────────────────────

function PinnedMessageRow({ msg }: { msg: MessageWithAuthor }) {
  const timeStr = format(new Date(msg.createdAt), "MMM d, h:mm a");
  const preview = truncateContent(msg.content);

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/50 transition-colors rounded-lg">
      {/* Author avatar */}
      <div className="shrink-0 mt-0.5">
        {msg.author.image ? (
          <Image
            src={msg.author.image}
            alt={msg.author.name ?? "User"}
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-violet-200 text-violet-800 select-none">
            {msg.author.name?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-foreground leading-none truncate">
            {msg.author.name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {preview}
        </p>
      </div>
    </div>
  );
}

// ─── PinnedMessages ───────────────────────────────────────────────────────────

interface PinnedMessagesProps {
  messages: MessageWithAuthor[];
}

export function PinnedMessages({ messages }: PinnedMessagesProps) {
  const [expanded, setExpanded] = useState(true);

  // Only render when there are pinned messages
  if (messages.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/30">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} pinned messages`}
        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground">
          📌 Pinned ({messages.length})
        </span>
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="ml-auto"
        >
          <ChevronDown size={14} className={cn("text-muted-foreground")} />
        </motion.div>
      </button>

      {/* Animated message list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="pinned-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-1">
              {messages.map((msg) => (
                <PinnedMessageRow key={msg.id} msg={msg} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
