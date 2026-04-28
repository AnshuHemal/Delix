/**
 * Teams store — teams, channels, messages, typing indicators, unread counts
 * Mirrors chat-store.ts structure exactly, substituting teams/channels for conversations.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { TeamWithDetails, MessageWithAuthor } from "@/types";

interface TypingUser {
  userId: string;
  name: string;
  timestamp: number;
}

interface TeamsState {
  // Teams list
  teams: TeamWithDetails[];
  setTeams: (teams: TeamWithDetails[]) => void;
  addTeam: (team: TeamWithDetails) => void;
  updateTeam: (id: string, data: Partial<TeamWithDetails>) => void;
  removeTeam: (id: string) => void;

  // Active selection
  activeTeamId: string | null;
  setActiveTeam: (id: string | null) => void;
  activeChannelId: string | null;
  setActiveChannel: (id: string | null) => void;

  // Messages per channel (keyed by channelId)
  messages: Record<string, MessageWithAuthor[]>;
  setMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  prependMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  addMessage: (channelId: string, message: MessageWithAuthor) => void;
  updateMessage: (channelId: string, messageId: string, data: Partial<MessageWithAuthor>) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  // Pagination
  cursors: Record<string, string | undefined>;
  setCursor: (channelId: string, cursor: string | undefined) => void;
  hasMore: Record<string, boolean>;
  setHasMore: (channelId: string, value: boolean) => void;

  // Typing indicators (keyed by channelId)
  typing: Record<string, TypingUser[]>;
  setTyping: (channelId: string, user: TypingUser) => void;
  clearTyping: (channelId: string, userId: string) => void;

  // Unread counts (keyed by channelId)
  unread: Record<string, number>;
  setUnread: (channelId: string, count: number) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
}

export const useTeamsStore = create<TeamsState>()(
  devtools(
    (set) => ({
      // ── Teams ──────────────────────────────────────────────────────────
      teams: [],
      setTeams: (teams) => set({ teams }),
      addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
      updateTeam: (id, data) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      removeTeam: (id) =>
        set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),

      // ── Active selection ───────────────────────────────────────────────
      activeTeamId: null,
      setActiveTeam: (id) => set({ activeTeamId: id }),
      activeChannelId: null,
      setActiveChannel: (id) => set({ activeChannelId: id }),

      // ── Messages ───────────────────────────────────────────────────────
      messages: {},
      setMessages: (channelId, messages) =>
        set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),
      prependMessages: (channelId, messages) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: [...messages, ...(s.messages[channelId] ?? [])],
          },
        })),
      addMessage: (channelId, message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: [...(s.messages[channelId] ?? []), message],
          },
        })),
      updateMessage: (channelId, messageId, data) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === messageId ? { ...m, ...data } : m
            ),
          },
        })),
      removeMessage: (channelId, messageId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).filter(
              (m) => m.id !== messageId
            ),
          },
        })),

      // ── Pagination ─────────────────────────────────────────────────────
      cursors: {},
      setCursor: (channelId, cursor) =>
        set((s) => ({ cursors: { ...s.cursors, [channelId]: cursor } })),
      hasMore: {},
      setHasMore: (channelId, value) =>
        set((s) => ({ hasMore: { ...s.hasMore, [channelId]: value } })),

      // ── Typing indicators ──────────────────────────────────────────────
      typing: {},
      setTyping: (channelId, user) =>
        set((s) => {
          const current = s.typing[channelId] ?? [];
          const filtered = current.filter((u) => u.userId !== user.userId);
          return { typing: { ...s.typing, [channelId]: [...filtered, user] } };
        }),
      clearTyping: (channelId, userId) =>
        set((s) => ({
          typing: {
            ...s.typing,
            [channelId]: (s.typing[channelId] ?? []).filter(
              (u) => u.userId !== userId
            ),
          },
        })),

      // ── Unread counts ──────────────────────────────────────────────────
      unread: {},
      setUnread: (channelId, count) =>
        set((s) => ({ unread: { ...s.unread, [channelId]: count } })),
      incrementUnread: (channelId) =>
        set((s) => ({
          unread: {
            ...s.unread,
            [channelId]: (s.unread[channelId] ?? 0) + 1,
          },
        })),
      clearUnread: (channelId) =>
        set((s) => {
          const next = { ...s.unread };
          delete next[channelId];
          return { unread: next };
        }),
    }),
    { name: "teams-store" }
  )
);
