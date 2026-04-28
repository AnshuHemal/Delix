/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/set-state-in-effect */
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
  Hash,
  Search,
  Video,
  Settings,
  Users,
  MessageSquareDashed,
  ChevronDown,
  Smile,
  Paperclip,
  AtSign,
  Send,
  X,
  FileIcon,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTeamsStore } from "@/stores";
import { useSession } from "@/lib/auth-client";
import { useChannelRealtime } from "@/hooks/use-channel-realtime";
import { pusherClient } from "@/lib/pusher/client";
import { PusherChannels, PusherEvents } from "@/lib/pusher/events";
import type { MessageWithAuthor } from "@/types";
import { MessageContent } from "@/components/dashboard/chat/message-content";
import { MessageActions, InlineEdit, ReactionDisplay, ThreadLink } from "@/components/dashboard/chat/message-actions";
import { MessageAttachments } from "@/components/dashboard/chat/message-attachments";

init({ data });

const Picker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

// ─── Real ChannelSettingsModal (task 13.2) ────────────────────────────────────
import { ChannelSettingsModal } from "@/components/dashboard/teams/channel-settings-modal";

// Imported from task 11.3
import { ChannelFilesTab } from "@/components/dashboard/teams/channel-files-tab";

// Imported from task 11.1
import { PinnedMessages } from "@/components/dashboard/teams/pinned-messages";

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

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-xs text-muted-foreground">{formatDateSeparator(date)}</span>
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
  let previewData: LinkPreviewData | null = null;
  try {
    previewData = JSON.parse(raw) as LinkPreviewData;
  } catch {
    return null;
  }

  if (!previewData || !previewData.title) return null;

  return (
    <a
      href={previewData.domain ? `https://${previewData.domain}` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex gap-3 rounded-xl border border-border bg-muted/50 p-3 hover:bg-muted transition-colors no-underline max-w-[65%]"
      onClick={(e) => e.stopPropagation()}
    >
      {previewData.image && (
        <div className="shrink-0">
          <Image
            src={previewData.image}
            alt={previewData.title ?? "Link preview"}
            width={72}
            height={72}
            unoptimized
            className="w-18 h-18 rounded-lg object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        {previewData.domain && (
          <span className="text-xs text-muted-foreground truncate">{previewData.domain}</span>
        )}
        <span className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
          {previewData.title}
        </span>
        {previewData.description && (
          <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {previewData.description}
          </span>
        )}
      </div>
    </a>
  );
}

// ─── Skeleton message placeholder ────────────────────────────────────────────

function SkeletonMessage({ wide }: { wide: boolean }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-muted shrink-0 animate-pulse" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className={cn("h-9 rounded-xl bg-muted animate-pulse", wide ? "w-72" : "w-48")} />
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const TYPING_DEBOUNCE_MS = 2000;
const TYPING_EXPIRE_MS = 5000;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CHANNEL_TABS = ["Posts", "Files"] as const;
type ChannelTab = (typeof CHANNEL_TABS)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingAttachment {
  file: File;
  previewUrl?: string;
}

interface MentionMember {
  id: string;
  name: string;
  image: string | null;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <MessageSquareDashed className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="font-semibold text-foreground">Select a channel</p>
      <p className="text-sm text-muted-foreground">
        Choose a channel from the panel to start reading and posting messages.
      </p>
    </div>
  );
}

// ─── Stable empty arrays — avoids new reference on every render ──────────────
const EMPTY_MESSAGES: MessageWithAuthor[] = [];
const EMPTY_TYPING: { userId: string; name: string; timestamp: number }[] = [];

// ─── Main Component ───────────────────────────────────────────────────────────

interface ChannelViewProps {
  workspaceId: string;
}

export function ChannelView({ workspaceId }: ChannelViewProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const activeChannelId = useTeamsStore((s) => s.activeChannelId);
  const teams = useTeamsStore((s) => s.teams);

  // Wire real-time events for the active channel (called unconditionally per React hooks rules)
  useChannelRealtime(activeChannelId ?? "", currentUserId);

  // Find the active channel across all teams
  const activeChannel = activeChannelId
    ? teams.flatMap((t) => t.channels).find((ch) => ch.id === activeChannelId) ?? null
    : null;

  // Find the team that owns the active channel (for member count)
  const activeTeam = activeChannelId
    ? teams.find((t) => t.channels.some((ch) => ch.id === activeChannelId)) ?? null
    : null;

  const [activeTab, setActiveTab] = useState<ChannelTab>("Posts");
  const [showSettings, setShowSettings] = useState(false);

  // ── Input state ────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { resolvedTheme } = useTheme();
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionMembers, setMentionMembers] = useState<MentionMember[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  // ── Typing indicator refs ──────────────────────────────────────────────────
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const isTypingRef = useRef(false);
  const typingExpireTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const optimisticCounterRef = useRef(0);

  // ── Input refs ─────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const smileRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Store selectors ────────────────────────────────────────────────────────
  // NOTE: selectors that return arrays must never inline `?? []` — that creates
  // a new reference on every render and triggers an infinite loop in
  // useSyncExternalStore. Use module-level stable fallbacks instead.
  const _messagesMap = useTeamsStore((s) => s.messages);
  const messages = (activeChannelId ? _messagesMap[activeChannelId] : undefined) ?? EMPTY_MESSAGES;

  const setMessages = useTeamsStore((s) => s.setMessages);
  const setCursor = useTeamsStore((s) => s.setCursor);
  const setHasMore = useTeamsStore((s) => s.setHasMore);
  const prependMessages = useTeamsStore((s) => s.prependMessages);
  const clearUnread = useTeamsStore((s) => s.clearUnread);
  const _hasMoreMap = useTeamsStore((s) => s.hasMore);
  const hasMore = activeChannelId ? (_hasMoreMap[activeChannelId] ?? true) : false;

  const _cursorsMap = useTeamsStore((s) => s.cursors);
  const cursor = activeChannelId ? _cursorsMap[activeChannelId] : undefined;

  const addMessage = useTeamsStore((s) => s.addMessage);
  const removeMessage = useTeamsStore((s) => s.removeMessage);
  const updateMessage = useTeamsStore((s) => s.updateMessage);
  const _typingMap = useTeamsStore((s) => s.typing);
  const typingUsers = (activeChannelId ? _typingMap[activeChannelId] : undefined) ?? EMPTY_TYPING;
  const clearTyping = useTeamsStore((s) => s.clearTyping);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Scroll refs ────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load messages on channel selection ────────────────────────────────────
  useEffect(() => {
    if (!activeChannelId) return;
    const channelId = activeChannelId;
    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/channels/${channelId}/messages?limit=50`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data = await res.json();

        if (!cancelled) {
          setMessages(channelId, data.messages ?? []);
          setCursor(channelId, data.nextCursor);
          setHasMore(channelId, data.hasMore ?? false);

          // Mark as read
          await fetch(`/api/channels/${channelId}/members/read`, { method: "PATCH" });
          clearUnread(channelId);
        }
      } catch (err) {
        console.error("Failed to load channel messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => { cancelled = true; };
  }, [activeChannelId, setMessages, setCursor, setHasMore, clearUnread]);

  // ── Scroll to bottom after initial load ───────────────────────────────────
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loading]);

  // ── Infinite scroll — IntersectionObserver sentinel at top ────────────────
  useEffect(() => {
    if (!activeChannelId || !sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          try {
            const res = await fetch(
              `/api/channels/${activeChannelId}/messages?limit=50${cursor ? `&cursor=${cursor}` : ""}`
            );
            if (!res.ok) throw new Error("Failed to load more messages");
            const data = await res.json();

            // Save scroll position before prepending
            const container = scrollContainerRef.current;
            const oldScrollHeight = container?.scrollHeight ?? 0;

            prependMessages(activeChannelId, data.messages ?? []);
            setCursor(activeChannelId, data.nextCursor);
            setHasMore(activeChannelId, data.hasMore ?? false);

            // Restore scroll position so view doesn't jump
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
  }, [activeChannelId, hasMore, cursor, loadingMore, prependMessages, setCursor, setHasMore]);

  // ── Near-bottom check (for auto-scroll on new messages) ───────────────────
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  }, []);

  // Auto-scroll to bottom when new messages arrive and user is near bottom
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // Track unread when user is not near bottom and new messages arrive
    if (messages.length > prevMessageCountRef.current && !isNearBottom()) {
      setUnreadCount((c) => c + (messages.length - prevMessageCountRef.current));
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isNearBottom]);

  // ── Scroll button visibility ─────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      const nearBottom = isNearBottom();
      setShowScrollButton(!nearBottom);
      if (nearBottom) setUnreadCount(0);
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isNearBottom]);

  // Reset unread count and scroll button when channel changes
  useEffect(() => {
    setUnreadCount(0);
    setShowScrollButton(false);
  }, [activeChannelId]);

  // ── ANNOUNCEMENT channel permission check ─────────────────────────────────
  const isAnnouncementChannel = activeChannel?.type === "ANNOUNCEMENT";
  const isTeamOwner = activeTeam?.members.some(
    (m) => m.userId === currentUserId && m.role === "OWNER"
  ) ?? false;
  const isReadOnly = isAnnouncementChannel && !isTeamOwner;

  // ── Emoji picker outside click ────────────────────────────────────────────
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

  // ── @mention autocomplete ─────────────────────────────────────────────────
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length === 0) {
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

  // ── Auto-expire typing indicators ─────────────────────────────────────────
  useEffect(() => {
    if (!activeChannelId) return;
    const otherTypers = typingUsers.filter((u) => u.userId !== currentUserId);

    otherTypers.forEach((u) => {
      const existing = typingExpireTimers.current.get(u.userId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        clearTyping(activeChannelId, u.userId);
        typingExpireTimers.current.delete(u.userId);
      }, TYPING_EXPIRE_MS);

      typingExpireTimers.current.set(u.userId, timer);
    });
  }, [typingUsers, activeChannelId, currentUserId, clearTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingExpireTimers.current.forEach((t) => clearTimeout(t));
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, []);

  // ── Typing event helpers ──────────────────────────────────────────────────
  function emitTypingStart() {
    if (!activeChannelId || !pusherClient) return;
    const ch = pusherClient.channel(PusherChannels.channel(activeChannelId));
    ch?.trigger(PusherEvents.TYPING_START, {
      contextId: activeChannelId,
      userId: currentUserId,
      userName: session?.user?.name ?? "",
      userImage: session?.user?.image ?? null,
    });
  }

  function emitTypingStop() {
    if (!activeChannelId || !pusherClient) return;
    const ch = pusherClient.channel(PusherChannels.channel(activeChannelId));
    ch?.trigger(PusherEvents.TYPING_STOP, {
      contextId: activeChannelId,
      userId: currentUserId,
      userName: session?.user?.name ?? "",
      userImage: session?.user?.image ?? null,
    });
    isTypingRef.current = false;
  }

  function handleTypingInput() {
    if (!isTypingRef.current || (Date.now() - lastTypingEmitRef.current) >= TYPING_DEBOUNCE_MS) {
      isTypingRef.current = true;
      lastTypingEmitRef.current = Date.now();
      emitTypingStart();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) emitTypingStop();
    }, TYPING_DEBOUNCE_MS);
  }

  // ── Input change handler ──────────────────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInput(value);

    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    // Detect @mention trigger
    const cursorPos = el.selectionStart ?? 0;
    const textBefore = value.slice(0, cursorPos);
    const mentionMatch = textBefore.match(/@(\w+)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

    handleTypingInput();
  }

  // ── Mention insertion ─────────────────────────────────────────────────────
  function insertMention(member: MentionMember) {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart ?? 0;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@(\w+)$/, `@${member.name} `);
    const newValue = replaced + textAfter;
    setInput(newValue);
    setMentionQuery(null);
    setMentionMembers([]);

    requestAnimationFrame(() => {
      el.focus();
      const newCursor = replaced.length;
      el.setSelectionRange(newCursor, newCursor);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }

  // ── Textarea key handler ──────────────────────────────────────────────────
  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
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

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || !activeChannelId) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) emitTypingStop();

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
      conversationId: null,
      channelId: activeChannelId,
      parentId: null,
      isEdited: false,
      isDeleted: false,
      isPinned: false,
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

    addMessage(activeChannelId, optimisticMsg);

    try {
      let attachmentData: { fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null = null;

      if (attachment) {
        const formData = new FormData();
        formData.append("file", attachment.file);
        formData.append("channelId", activeChannelId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("upload_failed");

        const uploadData = await uploadRes.json();
        attachmentData = {
          fileName: uploadData.fileName,
          fileUrl: uploadData.url,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
        };

        // Update optimistic message with attachment
        removeMessage(activeChannelId, optimisticId);
        addMessage(activeChannelId, {
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
        });
      }

      const body: Record<string, unknown> = { content: messageText };
      if (attachmentData) body.attachments = [attachmentData];

      const res = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("send_failed");

      const { message: realMessage } = await res.json();

      // Replace optimistic with real message
      removeMessage(activeChannelId, optimisticId);
      addMessage(activeChannelId, realMessage);
    } catch (err) {
      removeMessage(activeChannelId, optimisticId);
      setInput(messageText);
      if (attachment) setPendingAttachment(attachment);

      const isUploadError = err instanceof Error && err.message === "upload_failed";
      toast.error(
        isUploadError
          ? "File upload failed. Please try again."
          : "Failed to send message. Please try again."
      );
    }
  }

  // ── Pin / Unpin message ───────────────────────────────────────────────────
  async function handlePinToggle(messageId: string, isPinned: boolean) {
    if (!activeChannelId) return;

    // Optimistic update
    updateMessage(activeChannelId, messageId, { isPinned });

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin status");
    } catch {
      // Revert on failure
      updateMessage(activeChannelId, messageId, { isPinned: !isPinned });
      toast.error(isPinned ? "Failed to pin message" : "Failed to unpin message");
    }
  }

  // ── Group messages by date and author ────────────────────────────────────
  const groupedMessages: Array<
    | { type: "date"; date: Date }
    | { type: "message"; msg: MessageWithAuthor; showAvatar: boolean }
  > = [];

  {
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

      // Show avatar on first message of a group (new author or >5 min gap)
      const showAvatar =
        msg.authorId !== lastAuthorId ||
        !lastTimestamp ||
        msgDate.getTime() - lastTimestamp.getTime() > 5 * 60 * 1000;

      groupedMessages.push({ type: "message", msg, showAvatar });

      lastAuthorId = msg.authorId;
      lastTimestamp = msgDate;
    });
  }

  // ── Empty state (no channel selected) ────────────────────────────────────
  if (!activeChannelId || !activeChannel) {
    return (
      <motion.div
        key="channel-empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full"
      >
        <EmptyState />
      </motion.div>
    );
  }

  const memberCount = activeTeam?._count.members ?? activeTeam?.members.length ?? 0;
  const description = activeChannel.description ?? (activeChannel as { topic?: string | null }).topic ?? null;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChannelId}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex flex-col h-full bg-background relative"
        >
          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-5 shrink-0 border-b border-border min-h-[52px]">
            {/* Left: channel identity + tabs */}
            <div className="flex items-center gap-3 self-stretch min-w-0">
              {/* Channel name + description */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Hash size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {activeChannel.name}
                </span>
              </div>

              {description && (
                <>
                  <span className="text-muted-foreground/40 text-sm shrink-0">|</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {description}
                  </span>
                </>
              )}

              {/* Member count */}
              <div
                className="flex items-center gap-1 shrink-0 text-muted-foreground"
                title={`${memberCount} members`}
              >
                <Users size={13} />
                <span className="text-xs">{memberCount}</span>
              </div>

              {/* Tabs */}
              <div className="flex items-end self-stretch ml-2">
                {CHANNEL_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    aria-selected={activeTab === tab}
                    role="tab"
                    className={cn(
                      "relative px-3 pb-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                      activeTab === tab
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="channel-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        transition={{ duration: 0.2, ease: EASE }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-0.5 py-2.5 shrink-0">
              <button
                title="Search in channel"
                aria-label="Search in channel"
                className="p-2 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Search size={18} />
              </button>
              <button
                title="Start video call"
                aria-label="Start video call"
                className="p-2 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Video size={18} />
              </button>
              <button
                title="Channel settings"
                aria-label="Channel settings"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* ── Tab content ── */}
          {activeTab === "Posts" ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Pinned messages — filtered from the loaded message list */}
              <PinnedMessages messages={messages.filter((m) => m.isPinned)} />

              {/* ── Message area ── */}
              <div
                ref={scrollContainerRef}
                role="log"
                aria-live="polite"
                aria-label={`Messages in #${activeChannel.name}`}
                className="flex-1 overflow-y-auto flex flex-col px-6 py-6"
              >
                {loading ? (
                  /* Skeleton loading state */
                  <div className="mt-auto flex flex-col">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonMessage key={i} wide={i % 3 !== 0} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-1">
                    {/* Sentinel for infinite scroll — sits at the very top */}
                    <div ref={sentinelRef} className="h-1" />

                    {/* Loading spinner while fetching older messages */}
                    {loadingMore && (
                      <div className="flex justify-center py-2" aria-label="Loading older messages">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* "Beginning of #channel-name" label when no more history */}
                    {!hasMore && (
                      <div className="flex items-center justify-center py-4">
                        <span className="text-xs text-muted-foreground">
                          Beginning of #{activeChannel.name}
                        </span>
                      </div>
                    )}

                    {/* Empty state — no messages yet */}
                    {messages.length === 0 && !hasMore && (
                      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <MessageSquareDashed className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Be the first to post</p>
                        <p className="text-xs text-muted-foreground">
                          Start the conversation in #{activeChannel.name}
                        </p>
                      </div>
                    )}

                    {/* ── Grouped message list ── */}
                    {groupedMessages.map((item, idx) => {
                      if (item.type === "date") {
                        return <DateSeparator key={`date-${idx}`} date={item.date} />;
                      }

                      const { msg, showAvatar } = item;
                      const timeStr = format(new Date(msg.createdAt), "h:mm a");
                      const emojiOnly = !msg.isDeleted && isEmojiOnly(msg.content);

                      if (msg.isDeleted) {
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, ease: EASE }}
                            className="flex items-center my-1 pl-11"
                          >
                            <span className="text-xs italic text-muted-foreground">
                              This message was deleted
                            </span>
                          </motion.div>
                        );
                      }

                      const isEditing = editingMessageId === msg.id;

                      return (
                        <motion.div
                          key={msg.id}
                          data-message-id={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: EASE }}
                          className={cn(
                            "flex flex-col group",
                            emojiOnly ? "mb-4" : "mb-0.5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar column — always 32px wide */}
                            <div className="w-8 shrink-0 mt-0.5">
                              {showAvatar ? (
                                msg.author.image ? (
                                  <Image
                                    src={msg.author.image}
                                    alt={msg.author.name ?? "User"}
                                    width={32}
                                    height={32}
                                    unoptimized
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold bg-violet-200 text-violet-800">
                                    {msg.author.name?.slice(0, 2).toUpperCase() ?? "?"}
                                  </div>
                                )
                              ) : null}
                            </div>

                            {/* Message body */}
                            <div className="flex-1 min-w-0">
                              {showAvatar && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-foreground leading-none">
                                    {msg.author.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{timeStr}</span>
                                </div>
                              )}

                              {isEditing ? (
                                <InlineEdit
                                  message={msg}
                                  conversationId={activeChannelId}
                                  onCancel={() => setEditingMessageId(null)}
                                  onSaved={() => setEditingMessageId(null)}
                                />
                              ) : emojiOnly ? (
                                <motion.span
                                  whileHover={{ scale: 1.3, rotate: [0, -10, 10, -5, 0] }}
                                  transition={{ duration: 0.4, ease: "easeInOut" }}
                                  className="text-5xl leading-none select-none cursor-default inline-block"
                                  style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" }}
                                >
                                  {msg.content}
                                </motion.span>
                              ) : (
                                <div className="text-sm text-foreground leading-relaxed">
                                  <MessageContent
                                    content={msg.content}
                                    currentUserId={currentUserId}
                                    currentUserName={session?.user?.name ?? undefined}
                                  />
                                  {msg.isEdited && (
                                    <span className="ml-1 text-xs text-muted-foreground">(edited)</span>
                                  )}
                                </div>
                              )}

                              {/* Attachments */}
                              {!isEditing && (
                                <MessageAttachments attachments={msg.attachments} />
                              )}

                              {/* Link preview */}
                              {!isEditing && msg.linkPreview && (
                                <LinkPreviewCard raw={msg.linkPreview} />
                              )}

                              {/* Reactions */}
                              {!isEditing && (
                                <ReactionDisplay
                                  message={msg}
                                  currentUserId={currentUserId}
                                  conversationId={activeChannelId}
                                />
                              )}

                              {/* Thread link */}
                              {!isEditing && <ThreadLink message={msg} />}
                            </div>

                            {/* Timestamp (shown on hover when no avatar header) */}
                            {!showAvatar && !isEditing && (
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 self-center whitespace-nowrap">
                                {timeStr}
                              </span>
                            )}

                            {/* Action toolbar */}
                            {!isEditing && (
                              <MessageActions
                                message={msg}
                                currentUserId={currentUserId}
                                conversationId={activeChannelId}
                                onEditStart={() => setEditingMessageId(msg.id)}
                                canDelete={isTeamOwner || msg.authorId === currentUserId}
                                onPinToggle={isTeamOwner ? (isPinned) => handlePinToggle(msg.id, isPinned) : undefined}
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Bottom anchor for auto-scroll */}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* ── Scroll-to-bottom FAB ── */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                      setUnreadCount(0);
                    }}
                    className="absolute bottom-24 right-8 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                    aria-label="Scroll to bottom"
                  >
                    <ChevronDown size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div className="px-6 py-4 shrink-0">
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

                {/* Read-only notice for ANNOUNCEMENT channels */}
                {isReadOnly ? (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
                    role="status"
                    aria-label="Read-only channel"
                  >
                    <span>Only team owners can post in announcement channels.</span>
                  </div>
                ) : (
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
                                <Image
                                  src={member.image}
                                  alt={member.name}
                                  width={24}
                                  height={24}
                                  unoptimized
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
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
                          transition={{ duration: 0.18, ease: EASE }}
                          className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-xl overflow-hidden"
                          style={{ transformOrigin: "bottom right" }}
                        >
                          <Picker
                            data={data}
                            onEmojiSelect={(emoji: { native: string }) => {
                              const el = textareaRef.current;
                              if (el) {
                                const start = el.selectionStart ?? input.length;
                                const end = el.selectionEnd ?? input.length;
                                const newValue = input.slice(0, start) + emoji.native + input.slice(end);
                                setInput(newValue);
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
                        placeholder={`Post a message in #${activeChannel.name}…`}
                        aria-label={`Message #${activeChannel.name}`}
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
                            showPicker
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                          aria-label="Send message"
                          onClick={() => void handleSend()}
                          disabled={!input.trim()}
                          className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Send size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Files tab */
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ChannelFilesTab channelId={activeChannelId} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Channel settings modal */}
      <ChannelSettingsModal
        open={showSettings}
        channelId={activeChannelId}
        workspaceId={workspaceId}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
