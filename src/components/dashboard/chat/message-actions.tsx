/* eslint-disable react-hooks/purity */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
import { Smile, Reply, Pencil, Trash2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MessageWithAuthor } from "@/types/db";

// ─── Dynamic emoji picker (no SSR) ───────────────────────────────────────────

const Picker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageActionsProps {
  message: MessageWithAuthor;
  currentUserId: string;
  conversationId: string;
  /** Called when the user clicks Edit — parent switches to inline edit mode */
  onEditStart: () => void;
  /**
   * Optional: if provided, show a Pin/Unpin button.
   * Called with the new isPinned value when the user clicks Pin/Unpin.
   */
  onPinToggle?: (isPinned: boolean) => void;
  /**
   * Optional: override whether the delete button is shown.
   * Defaults to showing delete only for own messages.
   * Pass `true` to show delete for all messages (e.g. Team Owners).
   */
  canDelete?: boolean;
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── Reaction display ─────────────────────────────────────────────────────────

interface ReactionDisplayProps {
  message: MessageWithAuthor;
  currentUserId: string;
  conversationId: string;
}

export function ReactionDisplay({
  message,
  currentUserId,
  conversationId,
}: ReactionDisplayProps) {
  const updateMessage = useChatStore((s) => s.updateMessage);

  if (!message.reactions || message.reactions.length === 0) return null;

  // Group reactions by emoji
  const grouped = message.reactions.reduce<
    Record<string, { emoji: string; users: { id: string; name: string | null }[] }>
  >((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { emoji: r.emoji, users: [] };
    }
    acc[r.emoji].users.push({ id: r.userId, name: r.user.name });
    return acc;
  }, {});

  async function handleToggle(emoji: string) {
    const hasReacted = grouped[emoji]?.users.some((u) => u.id === currentUserId);

    // Optimistic update
    const prevReactions = message.reactions;
    const newReactions = hasReacted
      ? message.reactions.filter((r) => !(r.emoji === emoji && r.userId === currentUserId))
      : [
          ...message.reactions,
          {
            id: `optimistic-${Date.now()}`,
            messageId: message.id,
            userId: currentUserId,
            emoji,
            createdAt: new Date(),
            user: { id: currentUserId, name: null, image: null },
          },
        ];

    updateMessage(conversationId, message.id, { reactions: newReactions as MessageWithAuthor["reactions"] });

    try {
      const res = await fetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Failed to toggle reaction");
    } catch {
      // Revert
      updateMessage(conversationId, message.id, { reactions: prevReactions });
      toast.error("Failed to update reaction");
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.values(grouped).map(({ emoji, users }) => {
          const isMine = users.some((u) => u.id === currentUserId);
          const names = users.map((u) => u.name ?? "Unknown").join(", ");

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${emoji} reaction by ${names}. Click to ${isMine ? "remove" : "add"} reaction`}
                  onClick={() => handleToggle(emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                    isMine
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                      : "bg-muted border-border text-foreground hover:bg-muted/80"
                  )}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{names}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ─── Thread reply link ────────────────────────────────────────────────────────

interface ThreadLinkProps {
  message: MessageWithAuthor;
}

export function ThreadLink({ message }: ThreadLinkProps) {
  const setActiveThreadMessage = useChatStore((s) => s.setActiveThreadMessage);
  const count = message._count?.replies ?? 0;

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => setActiveThreadMessage(message.id)}
      className="mt-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      aria-label={`View ${count} ${count === 1 ? "reply" : "replies"} in thread`}
    >
      {count} {count === 1 ? "reply" : "replies"}
    </button>
  );
}

// ─── Inline edit textarea ─────────────────────────────────────────────────────

interface InlineEditProps {
  message: MessageWithAuthor;
  conversationId: string;
  onCancel: () => void;
  onSaved: () => void;
}

export function InlineEdit({
  message,
  conversationId,
  onCancel,
  onSaved,
}: InlineEditProps) {
  const [value, setValue] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateMessage = useChatStore((s) => s.updateMessage);

  // Auto-focus and resize on mount
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.selectionStart = el.selectionEnd = el.value.length;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === message.content) {
      onCancel();
      return;
    }

    // Optimistic update
    const prevContent = message.content;
    updateMessage(conversationId, message.id, { content: trimmed, isEdited: true });
    setSaving(true);

    try {
      const res = await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to edit message");
      onSaved();
    } catch {
      // Revert
      updateMessage(conversationId, message.id, { content: prevContent, isEdited: message.isEdited });
      toast.error("Failed to edit message");
      onCancel();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={saving}
        aria-label="Edit message"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 overflow-hidden"
        rows={1}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          <kbd className="font-mono">Enter</kbd> to save ·{" "}
          <kbd className="font-mono">Esc</kbd> to cancel
        </span>
      </div>
    </div>
  );
}

// ─── Main MessageActions toolbar ──────────────────────────────────────────────

export function MessageActions({
  message,
  currentUserId,
  conversationId,
  onEditStart,
  onPinToggle,
  canDelete,
}: MessageActionsProps) {
  const { resolvedTheme } = useTheme();
  const isOwn = message.authorId === currentUserId;
  const showDelete = canDelete !== undefined ? canDelete : isOwn;
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setActiveThreadMessage = useChatStore((s) => s.setActiveThreadMessage);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Keyboard navigation within toolbar
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleArrowKey = useCallback((e: React.KeyboardEvent) => {
    if (!toolbarRef.current) return;
    const buttons = Array.from(
      toolbarRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
    );
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowRight" && idx < buttons.length - 1) {
      e.preventDefault();
      buttons[idx + 1].focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      buttons[idx - 1].focus();
    }
  }, []);

  async function handleEmojiSelect(emoji: { native: string }) {
    setShowEmojiPicker(false);

    const emojiChar = emoji.native;
    const prevReactions = message.reactions;

    // Optimistic add
    const newReaction = {
      id: `optimistic-${Date.now()}`,
      messageId: message.id,
      userId: currentUserId,
      emoji: emojiChar,
      createdAt: new Date(),
      user: { id: currentUserId, name: null, image: null },
    };
    updateMessage(conversationId, message.id, {
      reactions: [...message.reactions, newReaction] as MessageWithAuthor["reactions"],
    });

    try {
      const res = await fetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: emojiChar }),
      });
      if (!res.ok) throw new Error("Failed to add reaction");
    } catch {
      updateMessage(conversationId, message.id, { reactions: prevReactions });
      toast.error("Failed to add reaction");
    }
  }

  async function handleDelete() {
    const prevMessage = { ...message };
    setDeleting(true);

    // Optimistic soft-delete
    updateMessage(conversationId, message.id, { isDeleted: true, content: "" });

    try {
      const res = await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete message");
      setShowDeleteDialog(false);
    } catch {
      // Revert
      updateMessage(conversationId, message.id, {
        isDeleted: prevMessage.isDeleted,
        content: prevMessage.content,
      });
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Floating toolbar */}
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Message actions"
        onKeyDown={handleArrowKey}
        className={cn(
          "flex items-center gap-0.5 rounded-lg border border-border bg-background shadow-sm px-1 py-0.5",
          "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
        )}
      >
        {/* Reaction picker */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <ToolbarButton label="Add reaction">
              <Smile size={15} />
            </ToolbarButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 border-0 shadow-xl"
            side="top"
            align="start"
            sideOffset={6}
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              set="native"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
            />
          </PopoverContent>
        </Popover>

        {/* Reply button */}
        <ToolbarButton
          label="Reply in thread"
          onClick={() => setActiveThreadMessage(message.id)}
        >
          <Reply size={15} />
        </ToolbarButton>

        {/* Edit button — own messages only */}
        {isOwn && (
          <ToolbarButton label="Edit message" onClick={onEditStart}>
            <Pencil size={15} />
          </ToolbarButton>
        )}

        {/* Delete button — own messages only (or Team Owner via canDelete prop) */}
        {showDelete && (
          <ToolbarButton
            label="Delete message"
            onClick={() => setShowDeleteDialog(true)}
            className="hover:text-destructive"
          >
            <Trash2 size={15} />
          </ToolbarButton>
        )}

        {/* Pin / Unpin button — only shown when onPinToggle is provided */}
        {onPinToggle && (
          <ToolbarButton
            label={message.isPinned ? "Unpin message" : "Pin message"}
            onClick={() => onPinToggle(!message.isPinned)}
          >
            {message.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          </ToolbarButton>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
