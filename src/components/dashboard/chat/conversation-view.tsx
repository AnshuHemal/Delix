/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { init } from "emoji-mart";
import { useTheme } from "next-themes";
import {
  Video, Phone, Search, MoreHorizontal,
  Smile, Paperclip, AtSign, Plus, Send,
  MessageSquareDashed, Users, ChevronDown, X, FileIcon,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatStore, usePresenceStore } from "@/stores";
import { useSession } from "@/lib/auth-client";
import { useConversationRealtime } from "@/hooks/use-conversation-realtime";
import { pusherClient } from "@/lib/pusher/client";
import { PusherChannels, PusherEvents } from "@/lib/pusher/events";
import type { MessageWithAuthor, PresenceStatus } from "@/types/db";
import { MessageContent } from "./message-content";
import { MessageActions, InlineEdit, ReactionDisplay, ThreadLink } from "./message-actions";
import { MessageAttachments } from "./message-attachments";

init({ data });

const Picker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const TYPING_DEBOUNCE_MS = 2000;
const TYPING_EXPIRE_MS = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingAttachment {
  file: File;
  previewUrl?: string; // object URL for images
}

interface MentionMember {
  id: string;
  name: string;
  image: string | null;
}

type Chat = {
  id: string;
  name: string;
  online: boolean;
  avatar?: string;
  initials?: string;
  avatarColor?: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const tabs = ["Chat", "Files", "Photos"];

// Stable empty arrays — avoids creating a new reference on every render
// which would cause infinite re-render loops in Zustand selectors.
const EMPTY_MESSAGES: MessageWithAuthor[] = [];
const EMPTY_TYPING: { userId: string; name: string; timestamp: number }[] = [];

// ─── Presence dot colors ──────────────────────────────────────────────────────

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  AVAILABLE: "bg-green-500",
  BUSY: "bg-yellow-400",
  BE_RIGHT_BACK: "bg-yellow-400",
  AWAY: "bg-orange-400",
  DO_NOT_DISTURB: "bg-red-500",
  OFFLINE: "bg-muted-foreground",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEmojiOnly(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  return emojiRegex.test(stripped) && stripped.length <= 8;
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <MessageSquareDashed className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="font-semibold text-foreground">Select a conversation</p>
      <p className="text-sm text-muted-foreground">
        Choose from your existing conversations or start a new one.
      </p>
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SkeletonMessage({ sent }: { sent: boolean }) {
  return (
    <div className={cn("flex items-end gap-2 mb-3", sent && "justify-end")}>
      {!sent && <div className="w-7 h-7 rounded-full bg-muted shrink-0 animate-pulse" />}
      <div className={cn("space-y-2", sent ? "items-end" : "items-start")}>
        <div className={cn("h-10 rounded-2xl bg-muted animate-pulse", sent ? "w-48" : "w-56")} />
      </div>
    </div>
  );
}

// ─── Link Preview Card ────────────────────────────────────────────────────────

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

function LinkPreviewCard({ raw }: { raw: string }) {
  let data: LinkPreviewData | null = null;
  try {
    data = JSON.parse(raw) as LinkPreviewData;
  } catch {
    return null;
  }

  if (!data || !data.title) return null;

  return (
    <a
      href={data.domain ? `https://${data.domain}` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex gap-3 rounded-xl border border-border bg-muted/50 p-3 hover:bg-muted transition-colors no-underline max-w-[65%]"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <div className="shrink-0">
          <Image
            src={data.image}
            alt={data.title ?? "Link preview"}
            width={72}
            height={72}
            unoptimized
            className="w-18 h-18 rounded-lg object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        {data.domain && (
          <span className="text-xs text-muted-foreground truncate">{data.domain}</span>
        )}
        <span className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
          {data.title}
        </span>
        {data.description && (
          <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {data.description}
          </span>
        )}
      </div>
    </a>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-xs text-muted-foreground">{formatDateSeparator(date)}</span>
    </div>
  );
}

// ─── Timestamp label ──────────────────────────────────────────────────────────

function TimeLabel({ time, side }: { time: string; side: "left" | "right" }) {
  return (
    <span className={cn(
      "text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 select-none whitespace-nowrap",
      side === "right" ? "self-end mb-0.5" : "self-end mb-0.5"
    )}>
      {time}
    </span>
  );
}

// ─── Top Bar Avatar with Presence ─────────────────────────────────────────────

function TopBarAvatar({ chat, otherUserId }: { chat: Chat; otherUserId?: string }) {
  const status = usePresenceStore((s) => (otherUserId ? s.getStatus(otherUserId) : "OFFLINE"));

  return (
    <div className="relative shrink-0">
      {chat.avatar ? (
        <Image src={chat.avatar as string} alt={chat.name} width={32} height={32} unoptimized
          className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold", chat.avatarColor as string)}>
          {chat.initials}
        </div>
      )}
      {otherUserId && (
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
          PRESENCE_DOT[status]
        )} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConversationView({
  chat,
  showSearch,
  onToggleSearch,
}: {
  chat: Chat | null;
  showSearch: boolean;
  onToggleSearch: () => void;
}) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const [activeTab, setActiveTab] = useState("Chat");
  const [input, setInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { resolvedTheme } = useTheme();

  // ── File attachment state ────────────────────────────────────────────────
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── @mention autocomplete state ──────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionMembers, setMentionMembers] = useState<MentionMember[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  // ── Typing indicator refs ────────────────────────────────────────────────
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const isTypingRef = useRef(false);
  const typingExpireTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const optimisticCounterRef = useRef(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const smileRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Store state ──────────────────────────────────────────────────────────
  const conversationId = chat?.id ?? null;
  const messages = useChatStore((s) => (conversationId ? s.messages[conversationId] : undefined) ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((s) => s.setMessages);
  const setCursor = useChatStore((s) => s.setCursor);
  const setHasMore = useChatStore((s) => s.setHasMore);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const hasMore = useChatStore((s) => (conversationId ? s.hasMore[conversationId] ?? true : false));
  const cursor = useChatStore((s) => (conversationId ? s.cursors[conversationId] : undefined));
  const conversations = useChatStore((s) => s.conversations);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // ── Store actions ────────────────────────────────────────────────────────
  const addMessage = useChatStore((s) => s.addMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const typingUsers = useChatStore((s) => (conversationId ? s.typing[conversationId] : undefined) ?? EMPTY_TYPING);
  const clearTyping = useChatStore((s) => s.clearTyping);
  const highlightedMessageId = useChatStore((s) => s.highlightedMessageId);
  const setHighlightedMessage = useChatStore((s) => s.setHighlightedMessage);

  // ── Derive other member for DM presence ──────────────────────────────────
  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUserId = conversation?.type === "DIRECT"
    ? conversation.members.find((m) => m.userId !== currentUserId)?.userId
    : undefined;

  // ── Real-time subscription ───────────────────────────────────────────────
  useConversationRealtime(conversationId ?? "", currentUserId);

  // ── Load messages on conversation selection ──────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const convId = conversationId;

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations/${convId}/messages?limit=50`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data = await res.json();

        if (!cancelled) {
          setMessages(convId, data.messages ?? []);
          setCursor(convId, data.nextCursor);
          setHasMore(convId, data.hasMore ?? false);

          // Mark as read
          await fetch(`/api/conversations/${convId}/members/read`, { method: "PATCH" });
          clearUnread(convId);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => { cancelled = true; };
  }, [conversationId, setMessages, setCursor, setHasMore, clearUnread]);

  // ── Infinite scroll pagination ───────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          try {
            const res = await fetch(
              `/api/conversations/${conversationId}/messages?limit=50${cursor ? `&cursor=${cursor}` : ""}`
            );
            if (!res.ok) throw new Error("Failed to load more messages");
            const data = await res.json();

            // Save scroll position
            const container = scrollContainerRef.current;
            const oldScrollHeight = container?.scrollHeight ?? 0;

            prependMessages(conversationId, data.messages ?? []);
            setCursor(conversationId, data.nextCursor);
            setHasMore(conversationId, data.hasMore ?? false);

            // Restore scroll position
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - oldScrollHeight;
            }
          } catch (err) {
            console.error("Failed to load more messages:", err);
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [conversationId, hasMore, cursor, loadingMore, prependMessages, setCursor, setHasMore]);

  // ── Auto-scroll to bottom on new message ─────────────────────────────────
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (messages.length > 0 && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  // ── Scroll button visibility ─────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      setShowScrollButton(!isNearBottom());
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isNearBottom]);

  // ── Emoji picker outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        smileRef.current && !smileRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPicker]);

  // ── Typing indicator helpers ─────────────────────────────────────────────
  function emitTypingStart() {
    if (!conversationId || !pusherClient) return;
    const channel = pusherClient.channel(PusherChannels.conversation(conversationId));
    channel?.trigger(PusherEvents.TYPING_START, {
      contextId: conversationId,
      userId: currentUserId,
      userName: session?.user?.name ?? "",
      userImage: session?.user?.image ?? null,
    });
  }

  function emitTypingStop() {
    if (!conversationId || !pusherClient) return;
    const channel = pusherClient.channel(PusherChannels.conversation(conversationId));
    channel?.trigger(PusherEvents.TYPING_STOP, {
      contextId: conversationId,
      userId: currentUserId,
      userName: session?.user?.name ?? "",
      userImage: session?.user?.image ?? null,
    });
    isTypingRef.current = false;
  }

  function handleTypingInput() {
    // Emit typing:start at most once every 2 seconds (throttle)
    if (!isTypingRef.current || (Date.now() - lastTypingEmitRef.current) >= TYPING_DEBOUNCE_MS) {
      isTypingRef.current = true;
      lastTypingEmitRef.current = Date.now();
      emitTypingStart();
    }

    // Stop typing after 2 seconds of no input
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        emitTypingStop();
      }
    }, TYPING_DEBOUNCE_MS);
  }

  // ── Auto-expire typing indicators ────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const otherTypers = typingUsers.filter((u) => u.userId !== currentUserId);

    otherTypers.forEach((u) => {
      // Clear any existing timer for this user
      const existing = typingExpireTimers.current.get(u.userId);
      if (existing) clearTimeout(existing);

      // Set a new 5-second expiry
      const timer = setTimeout(() => {
        clearTyping(conversationId, u.userId);
        typingExpireTimers.current.delete(u.userId);
      }, TYPING_EXPIRE_MS);

      typingExpireTimers.current.set(u.userId, timer);
    });
   
  }, [typingUsers, conversationId, currentUserId, clearTyping]);

  // Cleanup typing timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingExpireTimers.current.forEach((t) => clearTimeout(t));
      // Cleanup pending attachment preview URL
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  // ── Jump to highlighted message (from search) ────────────────────────────
  useEffect(() => {
    if (!highlightedMessageId) return;

    // Find the message element
    const messageElement = document.querySelector(`[data-message-id="${highlightedMessageId}"]`);
    if (!messageElement) {
      // Message not found, clear highlight
      setHighlightedMessage(null);
      return;
    }

    // Scroll to the message
    messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

    // Clear highlight after 2 seconds
    const timer = setTimeout(() => {
      setHighlightedMessage(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [highlightedMessageId, setHighlightedMessage]);

  // ── @mention autocomplete ─────────────────────────────────────────────────
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length === 0) {
      // Use a microtask to avoid calling setState synchronously in the effect body
      const id = setTimeout(() => setMentionMembers([]), 0);
      return () => clearTimeout(id);
    }

    const controller = new AbortController();
    fetch(`/api/workspaces/members?search=${encodeURIComponent(mentionQuery)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setMentionMembers(d.members ?? []))
      .catch(() => {});

    return () => controller.abort();
  }, [mentionQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInput(value);

    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    // Detect @mention trigger
    const cursor = el.selectionStart ?? 0;
    const textBefore = value.slice(0, cursor);
    const mentionMatch = textBefore.match(/@(\w+)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

    // Typing indicator
    handleTypingInput();
  }

  function insertMention(member: MentionMember) {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart ?? 0;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);

    // Replace the @prefix with @username
    const replaced = textBefore.replace(/@(\w+)$/, `@${member.name} `);
    const newValue = replaced + textAfter;
    setInput(newValue);
    setMentionQuery(null);
    setMentionMembers([]);

    // Restore focus and move cursor after the inserted mention
    requestAnimationFrame(() => {
      el.focus();
      const newCursor = replaced.length;
      el.setSelectionRange(newCursor, newCursor);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Handle mention dropdown navigation
    if (mentionQuery !== null && mentionMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionMembers[mentionIndex];
        if (selected) insertMention(selected);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        setMentionMembers([]);
        return;
      }
    }

    // Enter sends; Shift+Enter inserts newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── File attachment ───────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds the 25 MB limit");
      e.target.value = "";
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    setPendingAttachment({ file, previewUrl });
    e.target.value = "";
  }

  function removePendingAttachment() {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || !conversationId) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) emitTypingStop();

    // Capture and clear state immediately
    const messageText = text;
    const attachment = pendingAttachment;
    setInput("");
    setPendingAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Build optimistic message
    const optimisticId = `optimistic-${++optimisticCounterRef.current}`;
    const optimisticMsg: MessageWithAuthor = {
      id: optimisticId,
      content: messageText,
      authorId: currentUserId,
      conversationId,
      channelId: null,
      parentId: null,
      isEdited: false,
      isDeleted: false,
      linkPreview: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: currentUserId,
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        emailVerified: false,
        image: session?.user?.image ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        presence: null,
      },
      attachments: [],
      reactions: [],
      _count: { replies: 0 },
    };

    addMessage(conversationId, optimisticMsg);

    try {
      // Upload attachment if present
      let attachmentData: { fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null = null;
      if (attachment) {
        const formData = new FormData();
        formData.append("file", attachment.file);
        formData.append("conversationId", conversationId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("upload_failed");
        }

        const uploadData = await uploadRes.json();
        attachmentData = {
          fileName: uploadData.fileName,
          fileUrl: uploadData.url,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
        };

        // Update optimistic message with attachment data
        const optimisticWithAttachment: MessageWithAuthor = {
          ...optimisticMsg,
          attachments: [{
            id: `optimistic-attachment-${optimisticId}`,
            messageId: optimisticId,
            fileName: attachmentData.fileName,
            fileUrl: attachmentData.fileUrl,
            fileSize: attachmentData.fileSize,
            mimeType: attachmentData.mimeType,
            createdAt: new Date(),
          }],
        };
        // Update the optimistic message in the store
        removeMessage(conversationId, optimisticId);
        addMessage(conversationId, optimisticWithAttachment);
      }

      // Send message
      const body: Record<string, unknown> = { content: messageText };
      if (attachmentData) {
        body.attachments = [attachmentData];
      }

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("send_failed");

      const { message: realMessage } = await res.json();

      // Replace optimistic message with real one
      removeMessage(conversationId, optimisticId);
      addMessage(conversationId, realMessage);
    } catch (err) {
      // Remove optimistic message and restore input
      removeMessage(conversationId, optimisticId);
      setInput(messageText);
      if (attachment) setPendingAttachment(attachment);

      const isUploadError = err instanceof Error && err.message === "upload_failed";
      toast.error(isUploadError ? "File upload failed. Please try again." : "Failed to send message. Please try again.");
    }
  }

  // ── Group messages by date and author ────────────────────────────────────
  const groupedMessages: Array<{ type: "date"; date: Date } | { type: "message"; msg: MessageWithAuthor; showAvatar: boolean }> = [];

  let lastDate: Date | null = null;
  let lastAuthorId: string | null = null;
  let lastTimestamp: Date | null = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt);

    // Insert date separator if day changed
    if (!lastDate || !isSameDay(msgDate, lastDate)) {
      groupedMessages.push({ type: "date", date: msgDate });
      lastDate = msgDate;
      lastAuthorId = null;
      lastTimestamp = null;
    }

    // Determine if we should show avatar (new author or >5 min gap)
    const showAvatar =
      msg.authorId !== lastAuthorId ||
      !lastTimestamp ||
      (msgDate.getTime() - lastTimestamp.getTime()) > 5 * 60 * 1000;

    groupedMessages.push({ type: "message", msg, showAvatar });

    lastAuthorId = msg.authorId;
    lastTimestamp = msgDate;
  });

  if (!chat) {
    return (
      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
        <EmptyState />
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={chat.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex flex-col h-full bg-background"
      >

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 shrink-0 border-b border-border min-h-[52px]">
          <div className="flex items-center gap-3 self-stretch">
            <div className="flex items-center">
              <TopBarAvatar chat={chat} otherUserId={otherUserId} />
            </div>

            <div className="flex items-center gap-4 self-stretch">
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {chat.name}
              </span>

              <div className="flex items-end self-stretch">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative px-3 pb-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                      activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div layoutId="conv-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        transition={{ duration: 0.2, ease: EASE }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 py-2.5">
            {[
              { icon: Video, label: "Video call", onClick: undefined },
              { icon: Phone, label: "Audio call", onClick: undefined },
              { icon: Users, label: "Participants", onClick: undefined },
              { icon: Search, label: "Search", onClick: () => onToggleSearch() },
              { icon: MoreHorizontal, label: "More", onClick: undefined },
            ].map(({ icon: Icon, label, onClick }) => (
              <button key={label} title={label} onClick={onClick}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  label === "Search" && showSearch
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollContainerRef}
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto flex flex-col px-26 py-6"
        >
          {loading ? (
            <div className="mt-auto flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMessage key={i} sent={i % 2 === 0} />
              ))}
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-1">
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-1" />

              {/* Loading spinner at top */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Beginning of conversation label */}
              {!hasMore && messages.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <span className="text-xs text-muted-foreground">Beginning of conversation</span>
                </div>
              )}

              {/* Grouped messages */}
              {groupedMessages.map((item, idx) => {
                if (item.type === "date") {
                  return <DateSeparator key={`date-${idx}`} date={item.date} />;
                }

                const { msg, showAvatar } = item;
                const sent = msg.authorId === currentUserId;
                const emojiOnly = !msg.isDeleted && isEmojiOnly(msg.content);
                const timeStr = format(new Date(msg.createdAt), "h:mm a");

                if (msg.isDeleted) {
                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="flex items-center justify-center my-2"
                    >
                      <span className="text-xs italic text-muted-foreground">This message was deleted</span>
                    </motion.div>
                  );
                }

                if (sent) {
                  const isEditing = editingMessageId === msg.id;
                  const isHighlighted = highlightedMessageId === msg.id;
                  return (
                    <motion.div key={msg.id}
                      data-message-id={msg.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className={cn(
                        "flex flex-col items-end group",
                        emojiOnly ? "mb-4" : "mb-1",
                        isHighlighted && "bg-primary/10 rounded-lg px-2 py-1 transition-colors duration-300"
                      )}
                    >
                      <div className="flex justify-end items-center gap-3 w-full">
                        {/* Action toolbar — shown on hover, left of bubble */}
                        {!isEditing && (
                          <MessageActions
                            message={msg}
                            currentUserId={currentUserId}
                            conversationId={conversationId!}
                            onEditStart={() => setEditingMessageId(msg.id)}
                          />
                        )}

                        <TimeLabel time={timeStr} side="left" />

                        {isEditing ? (
                          <div className="max-w-[65%] w-full">
                            <InlineEdit
                              message={msg}
                              conversationId={conversationId!}
                              onCancel={() => setEditingMessageId(null)}
                              onSaved={() => setEditingMessageId(null)}
                            />
                          </div>
                        ) : emojiOnly ? (
                          <div className="relative">
                            <motion.span
                              whileHover={{ scale: 1.3, rotate: [0, -10, 10, -5, 0] }}
                              transition={{ duration: 0.4, ease: "easeInOut" }}
                              className="text-6xl leading-none select-none cursor-default inline-block"
                              style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))" }}
                            >
                              {msg.content}
                            </motion.span>
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                          </div>
                        ) : (
                          <div className="max-w-[65%]">
                            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                              <MessageContent
                                content={msg.content}
                                currentUserId={currentUserId}
                                currentUserName={session?.user?.name ?? undefined}
                              />
                              {msg.isEdited && (
                                <span className="ml-1.5 text-xs text-primary-foreground/70">(edited)</span>
                              )}
                            </div>
                            <MessageAttachments attachments={msg.attachments} />
                            {msg.linkPreview && (
                              <div className="flex justify-end">
                                <LinkPreviewCard raw={msg.linkPreview} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reactions and thread link — right-aligned */}
                      {!isEditing && (
                        <div className="flex flex-col items-end pr-0">
                          <ReactionDisplay
                            message={msg}
                            currentUserId={currentUserId}
                            conversationId={conversationId!}
                          />
                          <ThreadLink message={msg} />
                        </div>
                      )}
                    </motion.div>
                  );
                }

                // Received message
                const isHighlighted = highlightedMessageId === msg.id;
                return (
                  <motion.div key={msg.id}
                    data-message-id={msg.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={cn(
                      "flex flex-col group",
                      emojiOnly ? "mb-4" : "mb-1",
                      isHighlighted && "bg-primary/10 rounded-lg px-2 py-1 transition-colors duration-300"
                    )}
                  >
                    <div className="flex items-end gap-2">
                      {showAvatar ? (
                        <div className="relative shrink-0 self-end mb-0.5">
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
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-violet-200 text-violet-800">
                              {msg.author.name?.slice(0, 2).toUpperCase() ?? "?"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}

                      <div className="flex flex-col max-w-[65%]">
                        {showAvatar && msg.author.name && (
                          <span className="text-xs text-muted-foreground mb-1 ml-0.5">{msg.author.name}</span>
                        )}
                        {emojiOnly ? (
                          <motion.span
                            whileHover={{ scale: 1.3, rotate: [0, -10, 10, -5, 0] }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="text-6xl leading-none select-none cursor-default inline-block"
                            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))" }}
                          >
                            {msg.content}
                          </motion.span>
                        ) : (
                          <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed">
                            <MessageContent
                              content={msg.content}
                              currentUserId={currentUserId}
                              currentUserName={session?.user?.name ?? undefined}
                            />
                            {msg.isEdited && (
                              <span className="ml-1.5 text-xs text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        )}

                        {/* Attachments */}
                        <MessageAttachments attachments={msg.attachments} />

                        {/* Link preview */}
                        {msg.linkPreview && (
                          <LinkPreviewCard raw={msg.linkPreview} />
                        )}

                        {/* Reactions and thread link */}
                        <ReactionDisplay
                          message={msg}
                          currentUserId={currentUserId}
                          conversationId={conversationId!}
                        />
                        <ThreadLink message={msg} />
                      </div>

                      <TimeLabel time={timeStr} side="right" />

                      {/* Action toolbar — shown on hover, right of bubble */}
                      <MessageActions
                        message={msg}
                        currentUserId={currentUserId}
                        conversationId={conversationId!}
                        onEditStart={() => setEditingMessageId(msg.id)}
                      />
                    </div>
                  </motion.div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Scroll to bottom button ── */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="absolute bottom-24 right-8 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              aria-label="Scroll to bottom"
            >
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Input bar ── */}
        <div className="px-26 py-4 shrink-0">
          {/* Typing indicator */}
          {(() => {
            const others = typingUsers.filter((u) => u.userId !== currentUserId);
            if (others.length === 0) return null;
            let label: string;
            if (others.length === 1) {
              label = `${others[0].name} is typing…`;
            } else if (others.length === 2) {
              label = `${others[0].name} and ${others[1].name} are typing…`;
            } else {
              label = `${others.length} people are typing…`;
            }
            return (
              <p className="text-xs text-muted-foreground mb-1 px-1 animate-pulse" aria-live="polite">
                {label}
              </p>
            );
          })()}

          <div className="relative">
            {/* @mention dropdown */}
            <AnimatePresence>
              {mentionQuery !== null && mentionMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-64 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  {mentionMembers.map((member, idx) => (
                    <button
                      key={member.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(member);
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors",
                        idx === mentionIndex
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      {member.image ? (
                        <Image src={member.image} alt={member.name} width={24} height={24} unoptimized
                          className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{member.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emoji picker */}
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  ref={pickerRef}
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-xl overflow-hidden"
                  style={{ transformOrigin: "bottom right" }}
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: { native: string }) => {
                      // Insert at cursor position
                      const el = textareaRef.current;
                      if (el) {
                        const start = el.selectionStart ?? input.length;
                        const end = el.selectionEnd ?? input.length;
                        const newValue = input.slice(0, start) + emoji.native + input.slice(end);
                        setInput(newValue);
                        // Restore focus and cursor after emoji
                        requestAnimationFrame(() => {
                          el.focus();
                          const newPos = start + emoji.native.length;
                          el.setSelectionRange(newPos, newPos);
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        });
                      } else {
                        setInput((prev) => prev + emoji.native);
                      }
                      setShowPicker(false);
                    }}
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
                    set="native"
                    previewPosition="none"
                    skinTonePosition="none"
                    maxFrequentRows={2}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              aria-hidden="true"
            />

            {/* Attachment preview strip */}
            <AnimatePresence>
              {pendingAttachment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50">
                    {pendingAttachment.previewUrl ? (
                      <Image
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.file.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileIcon size={20} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pendingAttachment.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pendingAttachment.file.size < 1024 * 1024
                          ? `${(pendingAttachment.file.size / 1024).toFixed(1)} KB`
                          : `${(pendingAttachment.file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      onClick={removePendingAttachment}
                      className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Type a message"
                aria-label={`Message ${chat.name}`}
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none overflow-hidden leading-relaxed"
                style={{ maxHeight: "160px", overflowY: "auto" }}
              />
              <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
                <button
                  ref={smileRef}
                  type="button"
                  aria-label="Open emoji picker"
                  onClick={() => setShowPicker((v) => !v)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    showPicker ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Smile size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Paperclip size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Mention someone"
                  onClick={() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    const pos = el.selectionStart ?? input.length;
                    const newValue = input.slice(0, pos) + "@" + input.slice(pos);
                    setInput(newValue);
                    requestAnimationFrame(() => {
                      el.focus();
                      el.setSelectionRange(pos + 1, pos + 1);
                    });
                  }}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <AtSign size={17} />
                </button>
                <button
                  type="button"
                  aria-label="More options"
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
