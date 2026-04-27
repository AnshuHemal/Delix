/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { init } from "emoji-mart";
import { useTheme } from "next-themes";
import {
  X, Smile, Paperclip, AtSign, Plus, Send,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores";
import { useSession } from "@/lib/auth-client";
import type { MessageWithAuthor } from "@/types/db";
import { MessageContent } from "./message-content";
import { MessageActions, InlineEdit, ReactionDisplay } from "./message-actions";
import { MessageAttachments } from "./message-attachments";

init({ data });

const Picker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Stable empty array — avoids creating a new reference on every render
const EMPTY_MESSAGES: MessageWithAuthor[] = [];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadPanelProps {
  parentMessageId: string | null;
  conversationId: string;
}

interface MentionMember {
  id: string;
  name: string;
  image: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEmojiOnly(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  return emojiRegex.test(stripped) && stripped.length <= 8;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function ThreadPanel({ parentMessageId, conversationId }: ThreadPanelProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const [input, setInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { resolvedTheme } = useTheme();

  // ── @mention autocomplete state ──────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionMembers, setMentionMembers] = useState<MentionMember[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  const optimisticCounterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const smileRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Store state ──────────────────────────────────────────────────────────
  const setActiveThreadMessage = useChatStore((s) => s.setActiveThreadMessage);
  const messages = useChatStore((s) => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const addMessage = useChatStore((s) => s.addMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);

  const [threadReplies, setThreadReplies] = useState<MessageWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // ── Find parent message from store ───────────────────────────────────────
  const parentMessage = parentMessageId
    ? messages.find((m) => m.id === parentMessageId)
    : null;

  // ── Load thread replies ──────────────────────────────────────────────────
  useEffect(() => {
    if (!parentMessageId || !conversationId) return;

    let cancelled = false;

    async function loadThreadReplies() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages?parentId=${parentMessageId}`
        );
        if (!res.ok) throw new Error("Failed to load thread replies");
        const data = await res.json();

        if (!cancelled) {
          setThreadReplies(data.messages ?? []);
        }
      } catch (err) {
        console.error("Failed to load thread replies:", err);
        toast.error("Failed to load thread replies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadThreadReplies();
    return () => {
      cancelled = true;
    };
  }, [parentMessageId, conversationId]);

  // ── Auto-scroll to bottom on new reply ───────────────────────────────────
  useEffect(() => {
    if (threadReplies.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadReplies]);

  // ── Emoji picker outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        smileRef.current &&
        !smileRef.current.contains(e.target as Node)
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

  // ── Send thread reply ────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || !conversationId || !parentMessageId) return;

    // Capture and clear state immediately
    const messageText = text;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Build optimistic message
    const optimisticId = `optimistic-thread-${++optimisticCounterRef.current}`;
    const optimisticMsg: MessageWithAuthor = {
      id: optimisticId,
      content: messageText,
      authorId: currentUserId,
      conversationId,
      channelId: null,
      parentId: parentMessageId,
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

    // Add to thread replies
    setThreadReplies((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText, parentId: parentMessageId }),
      });

      if (!res.ok) throw new Error("send_failed");

      const { message: realMessage } = await res.json();

      // Replace optimistic message with real one
      setThreadReplies((prev) =>
        prev.map((m) => (m.id === optimisticId ? realMessage : m))
      );
    } catch (err) {
      // Remove optimistic message and restore input
      setThreadReplies((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(messageText);
      toast.error("Failed to send reply. Please try again.");
    }
  }

  // ── Render parent message ─────────────────────────────────────────────────
  function renderMessage(msg: MessageWithAuthor, isParent = false) {
    const sent = msg.authorId === currentUserId;
    const emojiOnly = !msg.isDeleted && isEmojiOnly(msg.content);
    const timeStr = format(new Date(msg.createdAt), "h:mm a");
    const isEditing = editingMessageId === msg.id;

    if (msg.isDeleted) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="flex items-center justify-center my-2"
        >
          <span className="text-xs italic text-muted-foreground">
            This message was deleted
          </span>
        </motion.div>
      );
    }

    if (sent) {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className={cn(
            "flex flex-col items-end group",
            emojiOnly ? "mb-4" : "mb-1",
            isParent && "pb-4 border-b border-border"
          )}
        >
          <div className="flex justify-end items-center gap-3 w-full">
            {/* Action toolbar */}
            {!isEditing && !isParent && (
              <MessageActions
                message={msg}
                currentUserId={currentUserId}
                conversationId={conversationId}
                onEditStart={() => setEditingMessageId(msg.id)}
              />
            )}

            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 select-none whitespace-nowrap self-end mb-0.5">
              {timeStr}
            </span>

            {isEditing ? (
              <div className="max-w-[65%] w-full">
                <InlineEdit
                  message={msg}
                  conversationId={conversationId}
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
                    <span className="ml-1.5 text-xs text-primary-foreground/70">
                      (edited)
                    </span>
                  )}
                </div>
                <MessageAttachments attachments={msg.attachments} />
              </div>
            )}
          </div>

          {/* Reactions */}
          {!isEditing && (
            <div className="flex flex-col items-end pr-0">
              <ReactionDisplay
                message={msg}
                currentUserId={currentUserId}
                conversationId={conversationId}
              />
            </div>
          )}
        </motion.div>
      );
    }

    // Received message
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className={cn(
          "flex flex-col group",
          emojiOnly ? "mb-4" : "mb-1",
          isParent && "pb-4 border-b border-border"
        )}
      >
        <div className="flex items-end gap-2">
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

          <div className="flex flex-col max-w-[65%]">
            {msg.author.name && (
              <span className="text-xs text-muted-foreground mb-1 ml-0.5">
                {msg.author.name}
              </span>
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
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (edited)
                  </span>
                )}
              </div>
            )}

            {/* Attachments */}
            <MessageAttachments attachments={msg.attachments} />

            {/* Reactions */}
            <ReactionDisplay
              message={msg}
              currentUserId={currentUserId}
              conversationId={conversationId}
            />
          </div>

          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 select-none whitespace-nowrap self-end mb-0.5">
            {timeStr}
          </span>

          {/* Action toolbar */}
          {!isParent && (
            <MessageActions
              message={msg}
              currentUserId={currentUserId}
              conversationId={conversationId}
              onEditStart={() => setEditingMessageId(msg.id)}
            />
          )}
        </div>
      </motion.div>
    );
  }

  if (!parentMessageId || !parentMessage) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="thread-panel"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex flex-col h-full bg-background border-l border-border"
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 shrink-0 border-b border-border min-h-[52px]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">Thread</h2>
          </div>

          <button
            type="button"
            aria-label="Close thread"
            onClick={() => setActiveThreadMessage(null)}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollContainerRef}
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto flex flex-col px-5 py-6"
        >
          {loading ? (
            <div className="mt-auto flex flex-col">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonMessage key={i} sent={i % 2 === 0} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {/* Parent message */}
              {renderMessage(parentMessage, true)}

              {/* Thread replies */}
              {threadReplies.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No replies yet. Start the conversation!
                  </p>
                </div>
              ) : (
                threadReplies.map((reply) => renderMessage(reply, false))
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="px-5 py-4 shrink-0">
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
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
                        const newValue =
                          input.slice(0, start) + emoji.native + input.slice(end);
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

            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Reply to thread"
                aria-label="Reply to thread"
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
