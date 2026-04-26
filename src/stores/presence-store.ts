/**
 * Presence store — real-time user status
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PresenceStatus, UserPresence } from "@/types";

interface PresenceState {
  // Map of userId → presence
  presence: Record<string, UserPresence>;

  setPresence: (userId: string, presence: UserPresence) => void;
  setBulkPresence: (presences: UserPresence[]) => void;
  updateStatus: (userId: string, status: PresenceStatus, customMessage?: string) => void;
  getStatus: (userId: string) => PresenceStatus;
}

export const usePresenceStore = create<PresenceState>()(
  devtools(
    (set, get) => ({
      presence: {},

      setPresence: (userId, presence) =>
        set((s) => ({ presence: { ...s.presence, [userId]: presence } })),

      setBulkPresence: (presences) =>
        set((s) => {
          const next = { ...s.presence };
          for (const p of presences) next[p.userId] = p;
          return { presence: next };
        }),

      updateStatus: (userId, status, customMessage) =>
        set((s) => {
          const existing = s.presence[userId];
          if (!existing) return s;
          return {
            presence: {
              ...s.presence,
              [userId]: {
                ...existing,
                status,
                customMessage: customMessage ?? existing.customMessage,
                lastSeen: new Date(),
                updatedAt: new Date(),
              },
            },
          };
        }),

      getStatus: (userId) => get().presence[userId]?.status ?? "OFFLINE",
    }),
    { name: "presence-store" }
  )
);
