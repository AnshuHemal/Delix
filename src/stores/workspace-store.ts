/**
 * Workspace store — active workspace, teams, channels
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  WorkspaceWithMembers,
  TeamWithDetails,
  ChannelWithDetails,
} from "@/types";

interface WorkspaceState {
  // Active workspace
  workspace: WorkspaceWithMembers | null;
  setWorkspace: (workspace: WorkspaceWithMembers | null) => void;

  // Teams
  teams: TeamWithDetails[];
  setTeams: (teams: TeamWithDetails[]) => void;
  addTeam: (team: TeamWithDetails) => void;
  updateTeam: (id: string, data: Partial<TeamWithDetails>) => void;
  removeTeam: (id: string) => void;

  // Active team/channel selection
  activeTeamId: string | null;
  activeChannelId: string | null;
  setActiveTeam: (teamId: string | null) => void;
  setActiveChannel: (channelId: string | null) => void;

  // Collapsed teams in sidebar
  collapsedTeams: Set<string>;
  toggleTeamCollapse: (teamId: string) => void;

  // Channel unread counts
  channelUnread: Record<string, number>;
  setChannelUnread: (channelId: string, count: number) => void;
  incrementChannelUnread: (channelId: string) => void;
  clearChannelUnread: (channelId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set) => ({
      workspace: null,
      setWorkspace: (workspace) => set({ workspace }),

      teams: [],
      setTeams: (teams) => set({ teams }),
      addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
      updateTeam: (id, data) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      removeTeam: (id) =>
        set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),

      activeTeamId: null,
      activeChannelId: null,
      setActiveTeam: (teamId) => set({ activeTeamId: teamId }),
      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

      collapsedTeams: new Set(),
      toggleTeamCollapse: (teamId) =>
        set((s) => {
          const next = new Set(s.collapsedTeams);
          if (next.has(teamId)) next.delete(teamId);
          else next.add(teamId);
          return { collapsedTeams: next };
        }),

      channelUnread: {},
      setChannelUnread: (channelId, count) =>
        set((s) => ({ channelUnread: { ...s.channelUnread, [channelId]: count } })),
      incrementChannelUnread: (channelId) =>
        set((s) => ({
          channelUnread: {
            ...s.channelUnread,
            [channelId]: (s.channelUnread[channelId] ?? 0) + 1,
          },
        })),
      clearChannelUnread: (channelId) =>
        set((s) => {
          const next = { ...s.channelUnread };
          delete next[channelId];
          return { channelUnread: next };
        }),
    }),
    { name: "workspace-store" }
  )
);
