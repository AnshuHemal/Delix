/**
 * Chat store — conversations, messages, typing indicators
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ConversationWithDetails, MessageWithAuthor } from "@/types";

interface TypingUser {
  userId: string;
  name: string;
  timestamp: number;
}

interface ChatState {
  // Conversations list
  conversations: ConversationWithDetails[];
  setConversations: (conversations: ConversationWithDetails[]) => void;
  addConversation: (conversation: ConversationWithDetails) => void;
  updateConversation: (id: string, data: Partial<ConversationWithDetails>) => void;

  // Active conversation
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // Active thread (message whose replies are shown in the Thread Panel)
  activeThreadMessageId: string | null;
  setActiveThreadMessage: (id: string | null) => void;

  // Highlighted message (used by Search Drawer jump-to)
  highlightedMessageId: string | null;
  setHighlightedMessage: (id: string | null) => void;

  // Messages per conversation/channel
  messages: Record<string, MessageWithAuthor[]>;
  setMessages: (contextId: string, messages: MessageWithAuthor[]) => void;
  prependMessages: (contextId: string, messages: MessageWithAuthor[]) => void;
  addMessage: (contextId: string, message: MessageWithAuthor) => void;
  updateMessage: (contextId: string, messageId: string, data: Partial<MessageWithAuthor>) => void;
  removeMessage: (contextId: string, messageId: string) => void;

  // Thread messages (replies to the active thread)
  threadMessages: MessageWithAuthor[];
  setThreadMessages: (messages: MessageWithAuthor[]) => void;
  addThreadMessage: (message: MessageWithAuthor) => void;

  // Pagination cursors
  cursors: Record<string, string | undefined>;
  setCursor: (contextId: string, cursor: string | undefined) => void;
  hasMore: Record<string, boolean>;
  setHasMore: (contextId: string, value: boolean) => void;

  // Typing indicators
  typing: Record<string, TypingUser[]>;
  setTyping: (contextId: string, user: TypingUser) => void;
  clearTyping: (contextId: string, userId: string) => void;

  // Unread counts per conversation
  unread: Record<string, number>;
  setUnread: (conversationId: string, count: number) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      conversations: [],
      setConversations: (conversations) => set({ conversations }),
      addConversation: (conversation) =>
        set((s) => ({ conversations: [conversation, ...s.conversations] })),
      updateConversation: (id, data) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      activeConversationId: null,
      setActiveConversation: (id) => set({ activeConversationId: id }),

      activeThreadMessageId: null,
      setActiveThreadMessage: (id) => set({ activeThreadMessageId: id }),

      highlightedMessageId: null,
      setHighlightedMessage: (id) => set({ highlightedMessageId: id }),

      messages: {},
      setMessages: (contextId, messages) =>
        set((s) => ({ messages: { ...s.messages, [contextId]: messages } })),
      prependMessages: (contextId, messages) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [contextId]: [...messages, ...(s.messages[contextId] ?? [])],
          },
        })),
      addMessage: (contextId, message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [contextId]: [...(s.messages[contextId] ?? []), message],
          },
        })),
      updateMessage: (contextId, messageId, data) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [contextId]: (s.messages[contextId] ?? []).map((m) =>
              m.id === messageId ? { ...m, ...data } : m
            ),
          },
        })),
      removeMessage: (contextId, messageId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [contextId]: (s.messages[contextId] ?? []).filter(
              (m) => m.id !== messageId
            ),
          },
        })),

      threadMessages: [],
      setThreadMessages: (messages) => set({ threadMessages: messages }),
      addThreadMessage: (message) =>
        set((s) => ({ threadMessages: [...s.threadMessages, message] })),

      cursors: {},
      setCursor: (contextId, cursor) =>
        set((s) => ({ cursors: { ...s.cursors, [contextId]: cursor } })),
      hasMore: {},
      setHasMore: (contextId, value) =>
        set((s) => ({ hasMore: { ...s.hasMore, [contextId]: value } })),

      typing: {},
      setTyping: (contextId, user) =>
        set((s) => {
          const current = s.typing[contextId] ?? [];
          const filtered = current.filter((u) => u.userId !== user.userId);
          return { typing: { ...s.typing, [contextId]: [...filtered, user] } };
        }),
      clearTyping: (contextId, userId) =>
        set((s) => ({
          typing: {
            ...s.typing,
            [contextId]: (s.typing[contextId] ?? []).filter(
              (u) => u.userId !== userId
            ),
          },
        })),

      unread: {},
      setUnread: (conversationId, count) =>
        set((s) => ({ unread: { ...s.unread, [conversationId]: count } })),
      incrementUnread: (conversationId) =>
        set((s) => ({
          unread: {
            ...s.unread,
            [conversationId]: (s.unread[conversationId] ?? 0) + 1,
          },
        })),
      clearUnread: (conversationId) =>
        set((s) => {
          const next = { ...s.unread };
          delete next[conversationId];
          return { unread: next };
        }),
    }),
    { name: "chat-store" }
  )
);
