"use client";

import { useState, useDeferredValue, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, SlidersHorizontal, SquarePen, Search, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format, isAfter, subHours } from "date-fns";
import { cn } from "@/lib/utils";
import { useChatStore, usePresenceStore } from "@/stores";
import type { ConversationWithDetails, PresenceStatus } from "@/types/db";
import { NewConversationModal } from "./new-conversation-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatListProps {
  currentUserId: string;
  selectedId: string | null;
  onSelect: (conversation: ConversationWithDetails) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic avatar color from a user ID string */
const AVATAR_COLORS = [
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-yellow-200 text-yellow-800",
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-red-200 text-red-800",
  "bg-indigo-200 text-indigo-800",
  "bg-cyan-200 text-cyan-800",
];

function deterministicColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTimestamp(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const cutoff = subHours(new Date(), 24);
  if (isAfter(d, cutoff)) {
    return formatDistanceToNow(d, { addSuffix: false });
  }
  return format(d, "MMM d");
}

function getConversationDisplay(
  conv: ConversationWithDetails,
  currentUserId: string
): { name: string; imageUrl: string | null; initials: string; colorClass: string; otherUserId: string | null } {
  if (conv.type === "DIRECT") {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    if (other) {
      const name = other.user.name ?? "Unknown";
      return {
        name,
        imageUrl: other.user.image ?? null,
        initials: getInitials(name),
        colorClass: deterministicColor(other.userId),
        otherUserId: other.userId,
      };
    }
    return { name: "Direct Message", imageUrl: null, initials: "DM", colorClass: AVATAR_COLORS[0], otherUserId: null };
  }

  // GROUP
  const names = conv.members.map((m) => m.user.name ?? "Unknown");
  const displayName =
    names.length <= 3
      ? names.join(", ")
      : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;

  return {
    name: displayName,
    imageUrl: null,
    initials: getInitials(displayName),
    colorClass: deterministicColor(conv.id),
    otherUserId: null,
  };
}

// ─── Presence dot ─────────────────────────────────────────────────────────────

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  AVAILABLE: "bg-green-500",
  BUSY: "bg-yellow-400",
  BE_RIGHT_BACK: "bg-yellow-400",
  AWAY: "bg-orange-400",
  DO_NOT_DISTURB: "bg-red-500",
  OFFLINE: "bg-muted-foreground",
};

function PresenceDot({ userId }: { userId: string | null }) {
  const status = usePresenceStore((s) => (userId ? s.getStatus(userId) : "OFFLINE"));
  if (!userId) return null;
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-background",
        PRESENCE_DOT[status]
      )}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ConvAvatar({
  conv,
  currentUserId,
}: {
  conv: ConversationWithDetails;
  currentUserId: string;
}) {
  const display = getConversationDisplay(conv, currentUserId);

  return (
    <div className="relative shrink-0">
      {display.imageUrl ? (
        <Image
          src={display.imageUrl}
          alt={display.name}
          width={40}
          height={40}
          unoptimized
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
            display.colorClass
          )}
        >
          {display.initials}
        </div>
      )}
      {conv.type === "DIRECT" && <PresenceDot userId={display.otherUserId} />}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-2.5 bg-muted rounded w-4/5" />
      </div>
    </div>
  );
}

// ─── Chat Row ─────────────────────────────────────────────────────────────────

function ChatRow({
  conv,
  currentUserId,
  selected,
  onSelect,
}: {
  conv: ConversationWithDetails;
  currentUserId: string;
  selected: boolean;
  onSelect: (conv: ConversationWithDetails) => void;
}) {
  const unreadCount = useChatStore((s) => s.unread[conv.id] ?? 0);
  const hasUnread = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const display = getConversationDisplay(conv, currentUserId);
  const preview = conv.lastMessage?.content ?? "";
  const timestamp = formatTimestamp(conv.lastMessage?.createdAt ?? conv.updatedAt);

  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(conv)}
      className={cn(
        "relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100",
        selected ? "bg-accent" : "hover:bg-muted/50"
      )}
    >
      {/* Unread dot on left edge */}
      {hasUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      <ConvAvatar conv={conv} currentUserId={currentUserId} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm text-foreground truncate",
              hasUnread ? "font-bold" : "font-medium"
            )}
          >
            {display.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasUnread && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                {badgeLabel}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground truncate",
            hasUnread && "font-semibold"
          )}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  label,
  conversations,
  currentUserId,
  selectedId,
  onSelect,
}: {
  label: string;
  conversations: ConversationWithDetails[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (conv: ConversationWithDetails) => void;
}) {
  const [open, setOpen] = useState(true);

  if (conversations.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-4 py-1.5 w-full hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18 }}
          className="text-muted-foreground"
        >
          <ChevronDown size={12} />
        </motion.span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="section"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {conversations.map((conv) => (
              <ChatRow
                key={conv.id}
                conv={conv}
                currentUserId={currentUserId}
                selected={selectedId === conv.id}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatList({ currentUserId, selectedId, onSelect }: ChatListProps) {
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  // useDeferredValue for 150ms-ish deferred filtering
  const deferredQuery = useDeferredValue(searchQuery);

  // ── Fetch conversations ──────────────────────────────────────────────────
  const [retryCount, setRetryCount] = useState(0);

  const fetchConversations = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`);
        const data = await res.json();
        if (!cancelled) setConversations(data.conversations ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load conversations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [retryCount, setConversations]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = deferredQuery.trim()
    ? conversations.filter((conv) => {
        const display = getConversationDisplay(conv, currentUserId);
        const q = deferredQuery.toLowerCase();
        return (
          display.name.toLowerCase().includes(q) ||
          (conv.lastMessage?.content ?? "").toLowerCase().includes(q)
        );
      })
    : conversations;

  // ── Bucket into sections ─────────────────────────────────────────────────
  const pinned = filtered.filter((c) =>
    c.members.some((m) => m.userId === currentUserId && m.isPinned)
  );
  const directMessages = filtered.filter(
    (c) =>
      c.type === "DIRECT" &&
      !c.members.some((m) => m.userId === currentUserId && m.isPinned)
  );
  const groupChats = filtered.filter(
    (c) =>
      c.type === "GROUP" &&
      !c.members.some((m) => m.userId === currentUserId && m.isPinned)
  );

  const hasAnyResults = pinned.length + directMessages.length + groupChats.length > 0;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button className="flex items-center gap-1 font-semibold text-foreground text-base hover:text-muted-foreground transition-colors">
          Chat
          <ChevronDown size={16} className="text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Filter conversations"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="New conversation"
            onClick={() => setShowNewConversation(true)}
          >
            <SquarePen size={16} />
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Body */}
      <div
        role="listbox"
        aria-label="Conversations"
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          // Skeleton loading state
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : error ? (
          // Error state with retry
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <AlertCircle size={24} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={fetchConversations}
              className="text-xs font-medium text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : !hasAnyResults ? (
          // Empty state
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {deferredQuery.trim()
                ? `No conversations match "${deferredQuery}"`
                : "No conversations yet"}
            </p>
          </div>
        ) : (
          <>
            <Section
              label="Pinned"
              conversations={pinned}
              currentUserId={currentUserId}
              selectedId={selectedId}
              onSelect={onSelect}
            />
            <Section
              label="Direct Messages"
              conversations={directMessages}
              currentUserId={currentUserId}
              selectedId={selectedId}
              onSelect={onSelect}
            />
            <Section
              label="Group Chats"
              conversations={groupChats}
              currentUserId={currentUserId}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
      />
    </div>
  );
}
