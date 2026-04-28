/**
 * useChannelRealtime
 *
 * Subscribes to the `private-channel-{channelId}` Pusher channel
 * and keeps the Zustand teams store in sync with real-time events:
 *   - message:new        → addMessage (top-level) or addThreadMessage (thread reply)
 *   - message:updated    → updateMessage
 *   - message:deleted    → updateMessage({ isDeleted: true, content: "" })
 *   - reaction:added     → update message reactions array (add)
 *   - reaction:removed   → update message reactions array (remove)
 *   - client-typing:start → setTyping
 *   - client-typing:stop  → clearTyping
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.3, 10.4, 10.5, 10.6
 */

"use client";

import { usePusherChannel } from "@/hooks/use-pusher-channel";
import { useTeamsStore } from "@/stores";
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

export function useChannelRealtime(
  channelId: string,
  currentUserId: string
) {
  const { addMessage, updateMessage } = useTeamsStore();
  const { activeThreadMessageId, addThreadMessage } = useChatStore();

  usePusherChannel(PusherChannels.channel(channelId), {
    // ── New message ──────────────────────────────────────────────────────
    [PusherEvents.MESSAGE_NEW]: (payload: MessageNewPayload) => {
      const { message } = payload;
      if (message.parentId == null) {
        // Top-level message → add to channel message list
        addMessage(channelId, message);
      } else if (message.parentId === activeThreadMessageId) {
        // Thread reply to the currently open thread
        addThreadMessage(message);
      }
    },

    // ── Message updated ──────────────────────────────────────────────────
    [PusherEvents.MESSAGE_UPDATED]: (payload: MessageUpdatedPayload) => {
      updateMessage(channelId, payload.messageId, {
        content: payload.content,
        isEdited: payload.isEdited,
        updatedAt: new Date(payload.updatedAt),
      });
    },

    // ── Message deleted ──────────────────────────────────────────────────
    [PusherEvents.MESSAGE_DELETED]: (payload: MessageDeletedPayload) => {
      updateMessage(channelId, payload.messageId, {
        isDeleted: true,
        content: "",
      });
    },

    // ── Reaction added ───────────────────────────────────────────────────
    [PusherEvents.REACTION_ADDED]: (payload: ReactionAddedPayload) => {
      const currentMessages = useTeamsStore.getState().messages[channelId] ?? [];
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

      updateMessage(channelId, payload.messageId, {
        reactions: [...target.reactions, newReaction],
      });
    },

    // ── Reaction removed ─────────────────────────────────────────────────
    [PusherEvents.REACTION_REMOVED]: (payload: ReactionRemovedPayload) => {
      const currentMessages = useTeamsStore.getState().messages[channelId] ?? [];
      const target = currentMessages.find((m) => m.id === payload.messageId);
      if (!target) return;

      updateMessage(channelId, payload.messageId, {
        reactions: target.reactions.filter(
          (r) => !(r.userId === payload.userId && r.emoji === payload.emoji)
        ),
      });
    },

    // ── Typing start ─────────────────────────────────────────────────────
    [PusherEvents.TYPING_START]: (payload: TypingPayload) => {
      if (payload.userId === currentUserId) return;

      useTeamsStore.getState().setTyping(channelId, {
        userId: payload.userId,
        name: payload.userName,
        timestamp: Date.now(),
      });
    },

    // ── Typing stop ──────────────────────────────────────────────────────
    [PusherEvents.TYPING_STOP]: (payload: TypingPayload) => {
      if (payload.userId === currentUserId) return;

      useTeamsStore.getState().clearTyping(channelId, payload.userId);
    },
  });
}
