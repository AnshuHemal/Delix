/**
 * useConversationRealtime
 *
 * Subscribes to the `private-conversation-{conversationId}` Pusher channel
 * and keeps the Zustand chat store in sync with real-time events:
 *   - message:new        → addMessage (top-level messages only; thread replies handled separately)
 *   - message:updated    → updateMessage
 *   - message:deleted    → updateMessage({ isDeleted: true, content: "" })
 *   - reaction:added     → update message reactions array (add)
 *   - reaction:removed   → update message reactions array (remove)
 *   - client-typing:start → setTyping
 *   - client-typing:stop  → clearTyping
 *
 * Requirements: 6.1, 6.2, 6.6, 6.7, 11.7, 14.3
 */

"use client";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { useChatStore } from "@/stores";
import { PusherChannels, PusherEvents } from "@/lib/pusher/events";
import type {
  MessageNewPayload,
  MessageUpdatedPayload,
  MessageDeletedPayload,
  ReactionAddedPayload,
  ReactionRemovedPayload,
  TypingPayload,
} from "@/lib/pusher/events";

export function useConversationRealtime(
  conversationId: string,
  currentUserId: string
) {
  const { addMessage, updateMessage, activeThreadMessageId, addThreadMessage } = useChatStore();

  usePusherChannel(PusherChannels.conversation(conversationId), {
    // ── New message ──────────────────────────────────────────────────────
    [PusherEvents.MESSAGE_NEW]: (payload: MessageNewPayload) => {
      const { message } = payload;
      // Only handle top-level messages here; thread replies (parentId set)
      // are handled by the Thread Panel via a separate subscription.
      if (message.parentId == null) {
        addMessage(conversationId, message);
      } else if (message.parentId === activeThreadMessageId) {
        // If this is a reply to the currently open thread, append it to threadMessages
        addThreadMessage(message);
      }
    },

    // ── Message updated ──────────────────────────────────────────────────
    [PusherEvents.MESSAGE_UPDATED]: (payload: MessageUpdatedPayload) => {
      updateMessage(conversationId, payload.messageId, {
        content: payload.content,
        isEdited: payload.isEdited,
        updatedAt: new Date(payload.updatedAt),
      });
    },

    // ── Message deleted ──────────────────────────────────────────────────
    [PusherEvents.MESSAGE_DELETED]: (payload: MessageDeletedPayload) => {
      updateMessage(conversationId, payload.messageId, {
        isDeleted: true,
        content: "",
      });
    },

    // ── Reaction added ───────────────────────────────────────────────────
    [PusherEvents.REACTION_ADDED]: (payload: ReactionAddedPayload) => {
      const currentMessages = useChatStore.getState().messages[conversationId] ?? [];
      const target = currentMessages.find((m) => m.id === payload.messageId);
      if (!target) return;

      const newReaction = {
        id: `${payload.messageId}-${payload.userId}-${payload.emoji}`,
        messageId: payload.messageId,
        userId: payload.userId,
        emoji: payload.emoji,
        createdAt: new Date(),
        user: {
          id: payload.userId,
          name: payload.userName,
          image: payload.userImage,
        },
      };

      updateMessage(conversationId, payload.messageId, {
        reactions: [...target.reactions, newReaction],
      });
    },

    // ── Reaction removed ─────────────────────────────────────────────────
    [PusherEvents.REACTION_REMOVED]: (payload: ReactionRemovedPayload) => {
      const currentMessages = useChatStore.getState().messages[conversationId] ?? [];
      const target = currentMessages.find((m) => m.id === payload.messageId);
      if (!target) return;

      updateMessage(conversationId, payload.messageId, {
        reactions: target.reactions.filter(
          (r) => !(r.userId === payload.userId && r.emoji === payload.emoji)
        ),
      });
    },

    // ── Typing start ─────────────────────────────────────────────────────
    [PusherEvents.TYPING_START]: (payload: TypingPayload) => {
      // Don't show the current user's own typing indicator
      if (payload.userId === currentUserId) return;

      useChatStore.getState().setTyping(conversationId, {
        userId: payload.userId,
        name: payload.userName,
        timestamp: Date.now(),
      });
    },

    // ── Typing stop ──────────────────────────────────────────────────────
    [PusherEvents.TYPING_STOP]: (payload: TypingPayload) => {
      if (payload.userId === currentUserId) return;

      useChatStore.getState().clearTyping(conversationId, payload.userId);
    },
  });
}
