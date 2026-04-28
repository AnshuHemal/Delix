/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  useState,
  useDeferredValue,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  ChevronDown,
  Hash,
  Lock,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamsStore, usePresenceStore } from "@/stores";
import type { TeamWithDetails, ChannelWithDetails, PresenceStatus } from "@/types/db";

import { CreateTeamModal } from "./create-team-modal";
import { CreateChannelModal } from "./create-channel-modal";
import { TeamSettingsModal } from "./team-settings-modal";

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  AVAILABLE: "bg-green-500",
  BUSY: "bg-yellow-400",
  BE_RIGHT_BACK: "bg-yellow-400",
  AWAY: "bg-orange-400",
  DO_NOT_DISTURB: "bg-red-500",
  OFFLINE: "bg-muted-foreground",
};

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-yellow-200 text-yellow-800",
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-red-200 text-red-800",
  "bg-indigo-200 text-indigo-800",
  "bg-cyan-200 text-cyan-800",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deterministicColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamsPanelProps {
  currentUserId: string;
  workspaceId: string;
}

// ─── Presence Dot ─────────────────────────────────────────────────────────────

function PresenceDot({ userId }: { userId: string }) {
  const status = usePresenceStore((s) => s.getStatus(userId));
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background",
        PRESENCE_DOT[status]
      )}
    />
  );
}

// ─── Member Avatars ───────────────────────────────────────────────────────────

function MemberAvatars({ team }: { team: TeamWithDetails }) {
  const members = team.members;
  const visible = members.slice(0, 3);
  const overflow = members.length - 3;

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {visible.map((member) => {
        const name = member.user.name ?? "Unknown";
        const colorClass = deterministicColor(member.userId);
        return (
          <div key={member.userId} className="relative">
            {member.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.user.image}
                alt={name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold",
                  colorClass
                )}
              >
                {getInitials(name)}
              </div>
            )}
            <PresenceDot userId={member.userId} />
          </div>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium ml-0.5">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonTeamRow() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 h-3 bg-muted rounded w-1/2" />
      </div>
      {/* Two skeleton channel rows */}
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-2 px-8 py-1.5">
          <div className="w-3 h-3 bg-muted rounded shrink-0" />
          <div className="h-2.5 bg-muted rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ─── Channel Row ──────────────────────────────────────────────────────────────

interface ChannelRowProps {
  channel: ChannelWithDetails;
  teamId: string;
  isActive: boolean;
  isOwner: boolean;
  onSelect: (teamId: string, channelId: string) => void;
  onAddChannel?: () => void;
}

function ChannelRow({
  channel,
  teamId,
  isActive,
  isOwner,
  onSelect,
}: ChannelRowProps) {
  const unreadCount = useTeamsStore((s) => s.unread[channel.id] ?? 0);
  const hasUnread = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <button
      role="option"
      aria-selected={isActive}
      onClick={() => onSelect(teamId, channel.id)}
      className={cn(
        "group w-full flex items-center gap-2 px-8 py-1.5 text-left transition-colors duration-100",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      aria-label={`Channel ${channel.name}`}
    >
      {/* Channel type icon */}
      <span className="shrink-0 text-muted-foreground">
        {channel.type === "PRIVATE" ? (
          <Lock size={12} />
        ) : (
          <Hash size={12} />
        )}
      </span>

      {/* Channel name */}
      <span
        className={cn(
          "flex-1 text-xs truncate",
          isActive ? "font-semibold text-accent-foreground" : "",
          hasUnread && !isActive ? "font-semibold text-foreground" : ""
        )}
      >
        {channel.name}
      </span>

      {/* Unread badge */}
      {hasUnread && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none shrink-0">
          {badgeLabel}
        </span>
      )}

      {/* Settings gear — owner only, on hover */}
      {isOwner && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            // TODO: open ChannelSettingsModal
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity cursor-pointer"
          aria-label={`Channel settings for ${channel.name}`}
        >
          <Settings size={11} className="text-muted-foreground" />
        </div>
      )}
    </button>
  );
}

// ─── Team Row ─────────────────────────────────────────────────────────────────

interface TeamRowProps {
  team: TeamWithDetails;
  currentUserId: string;
  activeChannelId: string | null;
  filteredChannels: ChannelWithDetails[] | null; // null = no filter active
  onSelectChannel: (teamId: string, channelId: string) => void;
  onOpenSettings: (teamId: string) => void;
  onAddChannel: (teamId: string) => void;
  forceExpanded?: boolean;
}

function TeamRow({
  team,
  currentUserId,
  activeChannelId,
  filteredChannels,
  onSelectChannel,
  onOpenSettings,
  onAddChannel,
  forceExpanded,
}: TeamRowProps) {
  const [expanded, setExpanded] = useState(true);

  const isOwner = team.members.some(
    (m) => m.userId === currentUserId && m.role === "OWNER"
  );

  // Channels to display (filtered or all)
  const channelsToShow = filteredChannels ?? team.channels;

  // Unread indicator: any channel in this team has unread
  const unread = useTeamsStore((s) => s.unread);
  const teamHasUnread = team.channels.some((ch) => (unread[ch.id] ?? 0) > 0);

  // Auto-expand when active channel is in this team
  const prevActiveRef = useRef(activeChannelId);
  useEffect(() => {
    if (activeChannelId !== prevActiveRef.current) {
      prevActiveRef.current = activeChannelId;
      const isInThisTeam = team.channels.some((ch) => ch.id === activeChannelId);
      if (isInThisTeam) {
        setExpanded(true);
      }
    }
  }, [activeChannelId, team.channels]);

  // When a filter is active, force expand
  const isExpanded = forceExpanded ? true : expanded;

  // Team avatar: avatar string (emoji/letter) or letter initial fallback
  const avatarContent = team.avatar ?? getInitials(team.name);
  const avatarColor = deterministicColor(team.id);

  return (
    <div>
      {/* Team header row */}
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
        {/* Expand/collapse chevron */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${team.name}`}
        >
          <motion.span
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="block"
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>

        {/* Team avatar */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0"
          aria-label={`Team ${team.name}`}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
              team.avatar ? "bg-muted" : avatarColor
            )}
          >
            {avatarContent}
          </div>

          {/* Team name */}
          <span
            className={cn(
              "flex-1 text-sm font-medium text-foreground truncate text-left",
              teamHasUnread && !isExpanded ? "font-bold" : ""
            )}
          >
            {team.name}
          </span>
        </button>

        {/* Unread dot (collapsed state) */}
        {teamHasUnread && !isExpanded && (
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        )}

        {/* Member avatars with presence */}
        <MemberAvatars team={team} />

        {/* Owner-only actions */}
        {isOwner && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(team.id);
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label={`Settings for ${team.name}`}
            >
              <Settings size={13} className="text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChannel(team.id);
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label={`Add channel to ${team.name}`}
            >
              <Plus size={13} className="text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Channel list (animated expand/collapse) */}
      <AnimatePresence initial={false}>
        {isExpanded && channelsToShow.length > 0 && (
          <motion.div
            key="channels"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            {channelsToShow.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                teamId={team.id}
                isActive={activeChannelId === channel.id}
                isOwner={isOwner}
                onSelect={onSelectChannel}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamsPanel({ currentUserId, workspaceId }: TeamsPanelProps) {
  const teams = useTeamsStore((s) => s.teams);
  const setTeams = useTeamsStore((s) => s.setTeams);
  const activeChannelId = useTeamsStore((s) => s.activeChannelId);
  const setActiveTeam = useTeamsStore((s) => s.setActiveTeam);
  const setActiveChannel = useTeamsStore((s) => s.setActiveChannel);
  const clearUnread = useTeamsStore((s) => s.clearUnread);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state — placeholders until modals are created
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);
  const [addChannelTeamId, setAddChannelTeamId] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(searchQuery);

  // ── Fetch teams ────────────────────────────────────────────────────────────
  const [retryCount, setRetryCount] = useState(0);

  const fetchTeams = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    // Don't fetch until we have a real workspace ID
    if (!workspaceId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/teams`);
        if (!res.ok) throw new Error(`Failed to load teams (${res.status})`);
        const data = await res.json();
        if (!cancelled) setTeams(data.teams ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load teams");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [retryCount, workspaceId, setTeams]);

  // ── Channel selection ──────────────────────────────────────────────────────
  const handleSelectChannel = useCallback(
    (teamId: string, channelId: string) => {
      // Clear unread for previously active channel
      if (activeChannelId && activeChannelId !== channelId) {
        clearUnread(activeChannelId);
      }
      setActiveTeam(teamId);
      setActiveChannel(channelId);
    },
    [activeChannelId, clearUnread, setActiveTeam, setActiveChannel]
  );

  // ── Filtering ──────────────────────────────────────────────────────────────
  const q = deferredQuery.trim().toLowerCase();
  const isFiltering = q.length > 0;

  // Build filtered teams: show team if name matches OR any channel name matches
  const filteredTeams = isFiltering
    ? teams
        .map((team) => {
          const teamNameMatches = team.name.toLowerCase().includes(q);
          const matchingChannels = team.channels.filter((ch) =>
            ch.name.toLowerCase().includes(q)
          );
          if (teamNameMatches || matchingChannels.length > 0) {
            return {
              team,
              // When filtering: show all channels if team name matches, else only matching channels
              channels: teamNameMatches ? team.channels : matchingChannels,
            };
          }
          return null;
        })
        .filter(Boolean) as { team: TeamWithDetails; channels: ChannelWithDetails[] }[]
    : teams.map((team) => ({ team, channels: null as ChannelWithDetails[] | null }));

  const hasResults = filteredTeams.length > 0;

  return (
    <div className="flex flex-col h-full w-96 bg-sidebar border-r border-border">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="font-semibold text-foreground text-base">Teams</span>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Create new team"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* ── Search input ── */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams and channels…"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Search teams and channels"
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div
        role="listbox"
        aria-label="Teams and channels"
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          // Skeleton loading state
          <>
            <SkeletonTeamRow />
            <SkeletonTeamRow />
          </>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={fetchTeams}
              className="text-xs font-medium text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : !hasResults ? (
          // Empty state
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            {isFiltering ? (
              <p className="text-sm text-muted-foreground">
                No teams or channels match &ldquo;{deferredQuery}&rdquo;
              </p>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Users size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No teams yet</p>
                <p className="text-xs text-muted-foreground">
                  Create your first team to get started
                </p>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus size={13} />
                  Create a team
                </button>
              </>
            )}
          </div>
        ) : (
          // Teams list
          filteredTeams.map(({ team, channels }) => (
            <TeamRow
              key={team.id}
              team={team}
              currentUserId={currentUserId}
              activeChannelId={activeChannelId}
              filteredChannels={channels}
              onSelectChannel={handleSelectChannel}
              onOpenSettings={setSettingsTeamId}
              onAddChannel={setAddChannelTeamId}
              forceExpanded={isFiltering}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      <CreateTeamModal
        open={showCreateTeam}
        workspaceId={workspaceId}
        onClose={() => setShowCreateTeam(false)}
      />
      {settingsTeamId && (() => {
        const settingsTeam = teams.find((t) => t.id === settingsTeamId);
        const isOwner = settingsTeam?.members.some(
          (m) => m.userId === currentUserId && m.role === "OWNER"
        ) ?? false;
        return (
          <TeamSettingsModal
            open={!!settingsTeamId}
            teamId={settingsTeamId}
            workspaceId={workspaceId}
            isTeamOwner={isOwner}
            currentUserId={currentUserId}
            onClose={() => setSettingsTeamId(null)}
          />
        );
      })()}
      {addChannelTeamId && (() => {
        const addChannelTeam = teams.find((t) => t.id === addChannelTeamId);
        const isOwner = addChannelTeam?.members.some(
          (m) => m.userId === currentUserId && m.role === "OWNER"
        ) ?? false;
        return (
          <CreateChannelModal
            open={!!addChannelTeamId}
            workspaceId={workspaceId}
            teamId={addChannelTeamId}
            isTeamOwner={isOwner}
            onClose={() => setAddChannelTeamId(null)}
          />
        );
      })()}
    </div>
  );
}
