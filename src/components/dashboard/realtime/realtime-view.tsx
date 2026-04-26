"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Radio,
  MessageSquare,
  Bell,
  Activity,
  Users,
  Video,
  CheckCircle2,
  Circle,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Hash,
  User,
  Globe,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pusherClient } from "@/lib/pusher/client";
import { PusherEvents } from "@/lib/pusher/events";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// ─── Connection state ─────────────────────────────────────────────────────

type ConnectionState = "connecting" | "connected" | "unavailable" | "disconnected" | "unconfigured";

function useConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    if (!pusherClient) {
      setState("unconfigured");
      return;
    }

    const update = (s: string) => {
      if (s === "connected") setState("connected");
      else if (s === "connecting" || s === "initialized") setState("connecting");
      else if (s === "unavailable") setState("unavailable");
      else setState("disconnected");
    };

    pusherClient.connection.bind("state_change", ({ current }: { current: string }) => {
      update(current);
    });

    update(pusherClient.connection.state);

    return () => {
      pusherClient?.connection.unbind("state_change");
    };
  }, []);

  return state;
}

// ─── Live event log ───────────────────────────────────────────────────────

interface LiveEvent {
  id: string;
  event: string;
  channel: string;
  time: Date;
  color: string;
}

const eventColors: Record<string, string> = {
  [PusherEvents.MESSAGE_NEW]: "text-emerald-500",
  [PusherEvents.MESSAGE_UPDATED]: "text-blue-500",
  [PusherEvents.MESSAGE_DELETED]: "text-red-500",
  [PusherEvents.REACTION_ADDED]: "text-amber-500",
  [PusherEvents.REACTION_REMOVED]: "text-amber-400",
  [PusherEvents.TYPING_START]: "text-violet-500",
  [PusherEvents.TYPING_STOP]: "text-violet-400",
  [PusherEvents.PRESENCE_UPDATED]: "text-teal-500",
  [PusherEvents.NOTIFICATION_NEW]: "text-orange-500",
  [PusherEvents.MEETING_PARTICIPANT_JOINED]: "text-rose-500",
  [PusherEvents.MEETING_STATUS_CHANGED]: "text-rose-400",
};

// ─── Static data ──────────────────────────────────────────────────────────

const channelTypes = [
  {
    icon: Lock,
    name: "private-conversation-{id}",
    desc: "DM and group conversations",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    events: ["message:new", "message:updated", "message:deleted", "reaction:added", "client-typing:start"],
  },
  {
    icon: Hash,
    name: "private-channel-{id}",
    desc: "Team channels",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    events: ["message:new", "message:updated", "message:deleted", "reaction:added", "client-typing:start"],
  },
  {
    icon: User,
    name: "private-user-{id}",
    desc: "Per-user notifications & unread counts",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    events: ["notification:new", "conversation:new", "conversation:updated", "unread:updated"],
  },
  {
    icon: Globe,
    name: "presence-workspace-{id}",
    desc: "Workspace-wide presence (online members)",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    events: ["presence:updated"],
  },
  {
    icon: Video,
    name: "private-meeting-{id}",
    desc: "Meeting participant events",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    events: ["meeting:participant-joined", "meeting:participant-left", "meeting:status-changed"],
  },
];

const eventDomains = [
  {
    icon: MessageSquare,
    label: "Messaging",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    events: [
      { name: "message:new", desc: "New message in channel or DM" },
      { name: "message:updated", desc: "Message edited by author" },
      { name: "message:deleted", desc: "Message soft-deleted" },
    ],
  },
  {
    icon: Activity,
    label: "Reactions & Typing",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    events: [
      { name: "reaction:added", desc: "Emoji reaction added" },
      { name: "reaction:removed", desc: "Emoji reaction removed" },
      { name: "client-typing:start", desc: "User started typing (P2P)" },
      { name: "client-typing:stop", desc: "User stopped typing (P2P)" },
    ],
  },
  {
    icon: Users,
    label: "Presence",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    events: [
      { name: "presence:updated", desc: "User status changed (available/busy/away/offline)" },
    ],
  },
  {
    icon: Bell,
    label: "Notifications",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    events: [
      { name: "notification:new", desc: "New notification pushed to user" },
      { name: "notification:read", desc: "Notification marked as read" },
      { name: "notification:all-read", desc: "All notifications cleared" },
    ],
  },
  {
    icon: Video,
    label: "Meetings",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    events: [
      { name: "meeting:participant-joined", desc: "User joined a meeting" },
      { name: "meeting:participant-left", desc: "User left a meeting" },
      { name: "meeting:status-changed", desc: "Meeting started, ended, or cancelled" },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const config = {
    connected: {
      icon: Wifi,
      label: "Connected",
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    connecting: {
      icon: RefreshCw,
      label: "Connecting…",
      dot: "bg-amber-400 animate-pulse",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    unavailable: {
      icon: WifiOff,
      label: "Unavailable",
      dot: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
    disconnected: {
      icon: WifiOff,
      label: "Disconnected",
      dot: "bg-zinc-400",
      text: "text-zinc-500",
      bg: "bg-zinc-500/10 border-zinc-500/20",
    },
    unconfigured: {
      icon: Circle,
      label: "Not configured",
      dot: "bg-zinc-400",
      text: "text-zinc-500",
      bg: "bg-zinc-500/10 border-zinc-500/20",
    },
  }[state];

  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium", config.bg, config.text)}>
      <span className={cn("w-2 h-2 rounded-full shrink-0", config.dot)} />
      <Icon size={12} className={cn(state === "connecting" && "animate-spin")} />
      {config.label}
    </div>
  );
}

function LiveEventRow({ event, index }: { event: LiveEvent; index: number }) {
  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.25, ease: EASE, delay: index * 0.02 }}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
    >
      <span className={cn("text-[10px] font-mono font-semibold shrink-0", eventColors[event.event] ?? "text-primary")}>
        {event.event}
      </span>
      <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">
        {event.channel}
      </span>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {event.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </motion.div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────

export function RealtimeView() {
  const connectionState = useConnectionState();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);

  // Simulate a demo event for the log (in production, real events flow through)
  const addDemoEvent = useCallback(() => {
    const demos = [
      { event: PusherEvents.MESSAGE_NEW, channel: "private-conversation-abc123" },
      { event: PusherEvents.TYPING_START, channel: "private-channel-xyz789" },
      { event: PusherEvents.PRESENCE_UPDATED, channel: "presence-workspace-w1" },
      { event: PusherEvents.REACTION_ADDED, channel: "private-conversation-abc123" },
      { event: PusherEvents.NOTIFICATION_NEW, channel: "private-user-u1" },
    ];
    const demo = demos[Math.floor(Math.random() * demos.length)];
    const newEvent: LiveEvent = {
      id: `${Date.now()}-${Math.random()}`,
      event: demo.event,
      channel: demo.channel,
      time: new Date(),
      color: eventColors[demo.event] ?? "text-primary",
    };
    setLiveEvents((prev) => [newEvent, ...prev].slice(0, 20));
    setEventCount((c) => c + 1);
  }, []);

  // Demo: simulate events every few seconds when not connected to real Pusher
  useEffect(() => {
    if (connectionState === "unconfigured") {
      const id = setInterval(addDemoEvent, 2500);
      return () => clearInterval(id);
    }
  }, [connectionState, addDemoEvent]);

  const isConfigured = connectionState !== "unconfigured";

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-8 py-8 space-y-8"
      >

        {/* ── Hero ── */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-2xl overflow-hidden bg-linear-to-br from-primary via-primary/90 to-indigo-700 p-8 text-primary-foreground shadow-xl shadow-primary/20"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <Radio size={16} />
                <span className="text-sm font-medium">Pusher · WebSockets · Real-time</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Real-time Engine</h1>
              <p className="mt-1 text-primary-foreground/70 text-sm max-w-lg">
                Phase 2 complete — live messaging, typing indicators, presence, notifications,
                and meeting events powered by Pusher Channels.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <ConnectionBadge state={connectionState} />
              <div className="flex gap-4">
                {[
                  { label: "Channels", value: "5" },
                  { label: "Events", value: String(Object.keys(PusherEvents).length) },
                  { label: "Live", value: String(eventCount) },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-primary-foreground/70">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Setup banner (shown when Pusher not configured) ── */}
        {!isConfigured && (
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-4 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Pusher credentials not configured
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                The real-time engine is running in demo mode. To enable live events:
              </p>
              <ol className="mt-2 space-y-1 text-xs text-amber-600/80 dark:text-amber-500/80 list-decimal list-inside">
                <li>Create a free app at <span className="font-mono font-semibold">dashboard.pusher.com</span></li>
                <li>Copy your App ID, Key, Secret, and Cluster</li>
                <li>Add them to <span className="font-mono font-semibold">.env.local</span> (see the keys already added)</li>
                <li>Restart the dev server — events will flow live</li>
              </ol>
            </div>
          </motion.div>
        )}

        {/* ── Connected banner ── */}
        {connectionState === "connected" && (
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              WebSocket connected — real-time events are flowing live
            </p>
          </motion.div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left: channel types + event domains */}
          <div className="xl:col-span-2 space-y-6">

            {/* Channel types */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Channel Architecture</h2>
                  <p className="text-xs text-muted-foreground">5 Pusher channel types, all private or presence</p>
                </div>
              </div>

              <div className="space-y-3">
                {channelTypes.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <div
                      key={ch.name}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border",
                        ch.border,
                        "bg-card hover:shadow-sm transition-shadow"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", ch.bg)}>
                        <Icon size={15} className={ch.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-mono font-semibold", ch.color)}>{ch.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ch.events.map((e) => (
                            <span
                              key={e}
                              className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Event domains */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Event Reference</h2>
                  <p className="text-xs text-muted-foreground">All {Object.keys(PusherEvents).length} real-time events across 5 domains</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventDomains.map((domain) => {
                  const Icon = domain.icon;
                  return (
                    <div key={domain.label} className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", domain.bg)}>
                          <Icon size={14} className={domain.color} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{domain.label}</span>
                      </div>
                      <div className="space-y-2">
                        {domain.events.map((ev) => (
                          <div key={ev.name} className="flex items-start gap-2">
                            <ChevronRight size={11} className="text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className={cn("text-[10px] font-mono font-semibold", domain.color)}>{ev.name}</p>
                              <p className="text-[10px] text-muted-foreground">{ev.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right: live event log + architecture */}
          <div className="space-y-6">

            {/* Live event log */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">Live Event Log</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{eventCount} total</span>
              </div>

              <div className="min-h-[280px] max-h-[400px] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {liveEvents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Radio size={18} className="text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Waiting for events…
                        <br />
                        {isConfigured ? "Send a message to see live events" : "Demo events will appear shortly"}
                      </p>
                    </motion.div>
                  ) : (
                    liveEvents.map((event, i) => (
                      <LiveEventRow key={event.id} event={event} index={i} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Architecture summary */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity size={14} className="text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Architecture</span>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { step: "1", label: "API route handles request", desc: "Validates auth, writes to PostgreSQL" },
                  { step: "2", label: "Publisher fires event", desc: "pusherServer.trigger() after DB write" },
                  { step: "3", label: "Pusher delivers to clients", desc: "WebSocket push to all subscribers" },
                  { step: "4", label: "Zustand store updates", desc: "UI re-renders with new state" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Next steps */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ArrowRight size={14} className="text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">What&apos;s Next</span>
              </div>

              <div className="space-y-2">
                {[
                  { phase: "3", title: "Chat System", desc: "Wire conversations to DB + real-time", status: "next" },
                  { phase: "4", title: "Teams & Channels", desc: "Channel messaging with @mentions", status: "upcoming" },
                  { phase: "5", title: "Video Meetings", desc: "WebRTC via Daily.co or Livekit", status: "upcoming" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border",
                      item.status === "next" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                      item.status === "next" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {item.phase}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
