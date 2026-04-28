/**
 * Teams Store — Property-Based Tests
 *
 * Task 6.2: Property 1 — Unread count monotonicity
 *   Validates: Requirements 20.1, 20.2, 20.3
 *
 * Task 6.3: Property 3 — Optimistic message idempotency
 *   Validates: Requirements 5.3, 5.4
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { useTeamsStore } from "../teams-store";
import type { MessageWithAuthor } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Arbitrary for channel IDs that are safe to use as plain-object keys.
 * We prefix with "ch-" to avoid collisions with Object.prototype properties
 * (e.g. "valueOf", "toString", "constructor") that fast-check may generate.
 */
const safeChannelId = fc
  .stringMatching(/^[a-z0-9]{1,16}$/)
  .map((s) => `ch-${s}`);

/** Build a minimal MessageWithAuthor fixture with the given id. */
function makeMessage(id: string): MessageWithAuthor {
  return {
    id,
    content: `Message ${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId: "user-1",
    conversationId: null,
    channelId: "ch-1",
    parentId: null,
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    linkPreview: null,
    author: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      presence: null,
    },
    attachments: [],
    reactions: [],
    replies: [],
    _count: { replies: 0 },
  } as unknown as MessageWithAuthor;
}

/** Reset the store to a clean slate before each test. */
function resetStore() {
  useTeamsStore.setState({
    unread: {},
    messages: {},
    teams: [],
    activeTeamId: null,
    activeChannelId: null,
    cursors: {},
    hasMore: {},
    typing: {},
  });
}

// ─── Task 6.2: Property 1 — Unread count monotonicity ────────────────────────
// **Validates: Requirements 20.1, 20.2, 20.3**

describe("Teams Store — unread count monotonicity", () => {
  beforeEach(resetStore);

  it("count never goes negative: after N incrementUnread calls, count equals N", () => {
    /**
     * Property: for any N ≥ 0 increments, the unread count for a channel
     * equals exactly N and is never negative.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        safeChannelId,
        (n, channelId) => {
          resetStore();

          const { incrementUnread } = useTeamsStore.getState();
          for (let i = 0; i < n; i++) {
            incrementUnread(channelId);
          }

          const count = useTeamsStore.getState().unread[channelId] ?? 0;
          // Count must equal N (never negative, never over-counted)
          expect(count).toBe(n);
          expect(count).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it("clearUnread always resets to zero regardless of prior increments", () => {
    /**
     * Property: for any sequence of increments followed by clearUnread,
     * the resulting count is always 0 (key absent or value 0).
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        safeChannelId,
        (n, channelId) => {
          resetStore();

          const { incrementUnread, clearUnread } = useTeamsStore.getState();
          for (let i = 0; i < n; i++) {
            incrementUnread(channelId);
          }

          clearUnread(channelId);

          const count = useTeamsStore.getState().unread[channelId] ?? 0;
          expect(count).toBe(0);
        }
      )
    );
  });

  it("clearUnread on a channel with no prior increments leaves count at zero", () => {
    /**
     * Edge case: clearUnread on a channel that was never incremented
     * should be a no-op (count stays 0).
     */
    fc.assert(
      fc.property(safeChannelId, (channelId) => {
        resetStore();

        useTeamsStore.getState().clearUnread(channelId);

        const count = useTeamsStore.getState().unread[channelId] ?? 0;
        expect(count).toBe(0);
      })
    );
  });

  it("incrementUnread on multiple channels are independent", () => {
    /**
     * Property: incrementing channel A does not affect channel B's count.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (nA, nB) => {
          resetStore();

          const { incrementUnread } = useTeamsStore.getState();
          const channelA = "channel-a";
          const channelB = "channel-b";

          for (let i = 0; i < nA; i++) incrementUnread(channelA);
          for (let i = 0; i < nB; i++) incrementUnread(channelB);

          const countA = useTeamsStore.getState().unread[channelA] ?? 0;
          const countB = useTeamsStore.getState().unread[channelB] ?? 0;

          expect(countA).toBe(nA);
          expect(countB).toBe(nB);
        }
      )
    );
  });
});

// ─── Task 6.3: Property 3 — Optimistic message idempotency ───────────────────
// **Validates: Requirements 5.3, 5.4**

describe("Teams Store — optimistic message idempotency", () => {
  beforeEach(resetStore);

  it("addMessage(optimistic) → removeMessage(optimistic) → addMessage(real) yields exactly one real message", () => {
    /**
     * Property: the optimistic-send → remove → confirm flow always results
     * in exactly one message with the real ID and zero messages with the
     * optimistic ID.
     */
    fc.assert(
      fc.property(
        safeChannelId,
        (channelId) => {
          resetStore();

          const { addMessage, removeMessage } = useTeamsStore.getState();

          const optimisticId = "optimistic-1";
          const realId = "real-1";

          // Step 1: add optimistic message
          addMessage(channelId, makeMessage(optimisticId));

          // Verify optimistic message is present
          const afterOptimistic = useTeamsStore.getState().messages[channelId] ?? [];
          expect(afterOptimistic.some((m) => m.id === optimisticId)).toBe(true);

          // Step 2: remove optimistic message (server confirmed / rollback)
          removeMessage(channelId, optimisticId);

          // Step 3: add real message
          addMessage(channelId, makeMessage(realId));

          const finalMessages = useTeamsStore.getState().messages[channelId] ?? [];

          // Exactly one message with the real ID
          const realMessages = finalMessages.filter((m) => m.id === realId);
          expect(realMessages).toHaveLength(1);

          // No optimistic remnants
          const optimisticRemnants = finalMessages.filter(
            (m) => m.id === optimisticId
          );
          expect(optimisticRemnants).toHaveLength(0);
        }
      )
    );
  });

  it("multiple optimistic messages can be independently resolved", () => {
    /**
     * Property: resolving multiple optimistic messages in sequence leaves
     * only the real messages in the list.
     */
    const channelId = "ch-multi";
    resetStore();

    const { addMessage, removeMessage } = useTeamsStore.getState();

    // Add two optimistic messages
    addMessage(channelId, makeMessage("optimistic-1"));
    addMessage(channelId, makeMessage("optimistic-2"));

    // Resolve first
    removeMessage(channelId, "optimistic-1");
    addMessage(channelId, makeMessage("real-1"));

    // Resolve second
    removeMessage(channelId, "optimistic-2");
    addMessage(channelId, makeMessage("real-2"));

    const finalMessages = useTeamsStore.getState().messages[channelId] ?? [];

    expect(finalMessages.filter((m) => m.id === "real-1")).toHaveLength(1);
    expect(finalMessages.filter((m) => m.id === "real-2")).toHaveLength(1);
    expect(finalMessages.filter((m) => m.id.startsWith("optimistic-"))).toHaveLength(0);
    expect(finalMessages).toHaveLength(2);
  });

  it("failed send: addMessage(optimistic) → removeMessage(optimistic) leaves empty list", () => {
    /**
     * Edge case (Requirement 5.4): if the API call fails, the optimistic
     * message is removed and no real message is added — the list should
     * be empty (or back to its prior state).
     */
    fc.assert(
      fc.property(
        safeChannelId,
        (channelId) => {
          resetStore();

          const { addMessage, removeMessage } = useTeamsStore.getState();

          addMessage(channelId, makeMessage("optimistic-1"));
          removeMessage(channelId, "optimistic-1");

          const finalMessages = useTeamsStore.getState().messages[channelId] ?? [];
          expect(finalMessages).toHaveLength(0);
        }
      )
    );
  });
});

// ─── Task 7.2: Property 5 — Real-time event completeness ─────────────────────
// **Validates: Requirements 9.1, 9.2, 9.8**

describe("Teams Store — real-time event completeness", () => {
  beforeEach(resetStore);

  it("arbitrary sequences of message:new events produce no duplicates", () => {
    /**
     * Property: for any sequence of N unique message IDs added via addMessage,
     * the store's message list contains exactly N entries with no duplicate IDs.
     */
    fc.assert(
      fc.property(
        safeChannelId,
        fc.array(
          fc.stringMatching(/^[a-z0-9]{4,12}$/).map((s) => `msg-${s}`),
          { minLength: 1, maxLength: 30 }
        ),
        (channelId, rawIds) => {
          resetStore();

          // Deduplicate IDs to simulate unique messages
          const uniqueIds = [...new Set(rawIds)];
          const { addMessage } = useTeamsStore.getState();

          for (const id of uniqueIds) {
            addMessage(channelId, makeMessage(id));
          }

          const messages = useTeamsStore.getState().messages[channelId] ?? [];

          // Exactly one entry per unique message ID
          expect(messages).toHaveLength(uniqueIds.length);

          // No duplicate IDs
          const ids = messages.map((m) => m.id);
          const uniqueStoredIds = new Set(ids);
          expect(uniqueStoredIds.size).toBe(uniqueIds.length);

          // All expected IDs are present
          for (const id of uniqueIds) {
            expect(uniqueStoredIds.has(id)).toBe(true);
          }
        }
      )
    );
  });

  it("messages from different channels are stored independently", () => {
    /**
     * Property: adding messages to channel A does not affect channel B's list.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (nA, nB) => {
          resetStore();

          const channelA = "ch-realtime-a";
          const channelB = "ch-realtime-b";
          const { addMessage } = useTeamsStore.getState();

          for (let i = 0; i < nA; i++) {
            addMessage(channelA, makeMessage(`msg-a-${i}`));
          }
          for (let i = 0; i < nB; i++) {
            addMessage(channelB, makeMessage(`msg-b-${i}`));
          }

          const messagesA = useTeamsStore.getState().messages[channelA] ?? [];
          const messagesB = useTeamsStore.getState().messages[channelB] ?? [];

          expect(messagesA).toHaveLength(nA);
          expect(messagesB).toHaveLength(nB);
        }
      )
    );
  });
});
