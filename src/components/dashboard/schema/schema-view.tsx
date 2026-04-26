"use client";

import { motion } from "framer-motion";
import {
  Database,
  Users,
  MessageSquare,
  Video,
  Calendar,
  Bell,
  Activity,
  Shield,
  Hash,
  Building2,
  FileText,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// ─── Schema domain definitions ────────────────────────────────────────────

interface SchemaModel {
  name: string;
  fields: { name: string; type: string; note?: string }[];
}

interface SchemaDomain {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  models: SchemaModel[];
  status: "complete" | "partial" | "planned";
}

const domains: SchemaDomain[] = [
  {
    id: "auth",
    label: "Authentication",
    icon: Shield,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    status: "complete",
    models: [
      {
        name: "User",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "name", type: "String" },
          { name: "email", type: "String", note: "@unique" },
          { name: "emailVerified", type: "Boolean" },
          { name: "image", type: "String?" },
          { name: "createdAt", type: "DateTime" },
        ],
      },
      {
        name: "Session",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "token", type: "String", note: "@unique" },
          { name: "expiresAt", type: "DateTime" },
          { name: "userId", type: "String", note: "FK → User" },
        ],
      },
      {
        name: "Account",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "providerId", type: "String" },
          { name: "accountId", type: "String" },
          { name: "userId", type: "String", note: "FK → User" },
        ],
      },
      {
        name: "Verification",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "identifier", type: "String" },
          { name: "value", type: "String" },
          { name: "expiresAt", type: "DateTime" },
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    status: "complete",
    models: [
      {
        name: "Workspace",
        fields: [
          { name: "id", type: "String", note: "@id cuid()" },
          { name: "name", type: "String" },
          { name: "slug", type: "String", note: "@unique" },
          { name: "description", type: "String?" },
          { name: "logo", type: "String?" },
          { name: "ownerId", type: "String", note: "FK → User" },
        ],
      },
      {
        name: "WorkspaceMember",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "workspaceId", type: "String", note: "FK → Workspace" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "role", type: "WorkspaceRole", note: "OWNER|ADMIN|MEMBER" },
          { name: "joinedAt", type: "DateTime" },
        ],
      },
    ],
  },
  {
    id: "teams",
    label: "Teams & Channels",
    icon: Users,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    status: "complete",
    models: [
      {
        name: "Team",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "workspaceId", type: "String", note: "FK → Workspace" },
          { name: "name", type: "String" },
          { name: "description", type: "String?" },
          { name: "isPrivate", type: "Boolean" },
          { name: "createdById", type: "String", note: "FK → User" },
        ],
      },
      {
        name: "TeamMember",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "teamId", type: "String", note: "FK → Team" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "role", type: "TeamRole", note: "OWNER|MEMBER" },
        ],
      },
      {
        name: "Channel",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "teamId", type: "String", note: "FK → Team" },
          { name: "name", type: "String" },
          { name: "type", type: "ChannelType", note: "STANDARD|ANNOUNCEMENT|PRIVATE" },
          { name: "createdById", type: "String", note: "FK → User" },
        ],
      },
      {
        name: "ChannelMember",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "channelId", type: "String", note: "FK → Channel" },
          { name: "userId", type: "String", note: "FK → User" },
        ],
      },
    ],
  },
  {
    id: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    status: "complete",
    models: [
      {
        name: "Conversation",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "type", type: "ConversationType", note: "DIRECT|GROUP" },
          { name: "createdAt", type: "DateTime" },
        ],
      },
      {
        name: "ConversationMember",
        fields: [
          { name: "conversationId", type: "String", note: "FK → Conversation" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "lastReadAt", type: "DateTime?", note: "for unread counts" },
        ],
      },
      {
        name: "Message",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "content", type: "String" },
          { name: "authorId", type: "String", note: "FK → User" },
          { name: "channelId", type: "String?", note: "FK → Channel" },
          { name: "conversationId", type: "String?", note: "FK → Conversation" },
          { name: "parentId", type: "String?", note: "FK → Message (threads)" },
          { name: "isEdited", type: "Boolean" },
          { name: "isDeleted", type: "Boolean" },
        ],
      },
      {
        name: "MessageAttachment",
        fields: [
          { name: "messageId", type: "String", note: "FK → Message" },
          { name: "fileName", type: "String" },
          { name: "fileUrl", type: "String" },
          { name: "fileSize", type: "Int", note: "bytes" },
          { name: "mimeType", type: "String" },
        ],
      },
      {
        name: "MessageReaction",
        fields: [
          { name: "messageId", type: "String", note: "FK → Message" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "emoji", type: "String" },
        ],
      },
    ],
  },
  {
    id: "meetings",
    label: "Meetings",
    icon: Video,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    status: "complete",
    models: [
      {
        name: "Meeting",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "title", type: "String" },
          { name: "organizerId", type: "String", note: "FK → User" },
          { name: "startTime", type: "DateTime" },
          { name: "endTime", type: "DateTime?" },
          { name: "meetingCode", type: "String", note: "@unique" },
          { name: "type", type: "MeetingType", note: "SCHEDULED|INSTANT" },
          { name: "status", type: "MeetingStatus", note: "SCHEDULED|ACTIVE|ENDED|CANCELLED" },
        ],
      },
      {
        name: "MeetingParticipant",
        fields: [
          { name: "meetingId", type: "String", note: "FK → Meeting" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "role", type: "MeetingParticipantRole", note: "HOST|PARTICIPANT" },
          { name: "joinedAt", type: "DateTime?" },
          { name: "leftAt", type: "DateTime?" },
        ],
      },
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    status: "complete",
    models: [
      {
        name: "CalendarEvent",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "title", type: "String" },
          { name: "organizerId", type: "String", note: "FK → User" },
          { name: "startTime", type: "DateTime" },
          { name: "endTime", type: "DateTime" },
          { name: "isAllDay", type: "Boolean" },
          { name: "recurrence", type: "String?", note: "JSON rule" },
          { name: "color", type: "String?" },
          { name: "meetingId", type: "String?", note: "FK → Meeting" },
        ],
      },
      {
        name: "CalendarEventAttendee",
        fields: [
          { name: "eventId", type: "String", note: "FK → CalendarEvent" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "status", type: "AttendeeStatus", note: "PENDING|ACCEPTED|DECLINED|TENTATIVE" },
        ],
      },
    ],
  },
  {
    id: "files",
    label: "Files",
    icon: FileText,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    status: "complete",
    models: [
      {
        name: "File",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "name", type: "String" },
          { name: "url", type: "String" },
          { name: "size", type: "Int", note: "bytes" },
          { name: "mimeType", type: "String" },
          { name: "source", type: "FileSource", note: "MESSAGE|CHANNEL|CONVERSATION" },
          { name: "uploadedById", type: "String", note: "FK → User" },
          { name: "channelId", type: "String?" },
          { name: "conversationId", type: "String?" },
        ],
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    status: "complete",
    models: [
      {
        name: "Notification",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "userId", type: "String", note: "FK → User" },
          { name: "type", type: "NotificationType" },
          { name: "title", type: "String" },
          { name: "body", type: "String?" },
          { name: "isRead", type: "Boolean" },
          { name: "relatedId", type: "String?", note: "polymorphic" },
          { name: "relatedType", type: "String?" },
        ],
      },
    ],
  },
  {
    id: "presence",
    label: "User Presence",
    icon: Activity,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    status: "complete",
    models: [
      {
        name: "UserPresence",
        fields: [
          { name: "id", type: "String", note: "@id" },
          { name: "userId", type: "String", note: "@unique FK → User" },
          { name: "status", type: "PresenceStatus", note: "AVAILABLE|BUSY|AWAY|OFFLINE|..." },
          { name: "customMessage", type: "String?" },
          { name: "lastSeen", type: "DateTime" },
        ],
      },
    ],
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────

const totalModels = domains.reduce((acc, d) => acc + d.models.length, 0);
const totalFields = domains.reduce(
  (acc, d) => acc + d.models.reduce((a, m) => a + m.fields.length, 0),
  0
);

// ─── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SchemaDomain["status"] }) {
  if (status === "complete")
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={11} />
        Migrated
      </span>
    );
  if (status === "partial")
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        <Circle size={11} />
        Partial
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
      <Circle size={11} />
      Planned
    </span>
  );
}

function ModelCard({ model }: { model: SchemaModel }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 overflow-hidden">
      {/* Model header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <Hash size={12} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground font-mono">{model.name}</span>
      </div>
      {/* Fields */}
      <div className="divide-y divide-border/50">
        {model.fields.map((field) => (
          <div key={field.name} className="flex items-center justify-between px-3 py-1.5 gap-3">
            <span className="text-[11px] font-mono text-foreground/80">{field.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-primary/80">{field.type}</span>
              {field.note && (
                <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                  {field.note}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DomainCard({ domain }: { domain: SchemaDomain }) {
  const Icon = domain.icon;

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "rounded-2xl border p-5 bg-card shadow-sm hover:shadow-md transition-shadow",
        domain.border
      )}
    >
      {/* Domain header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", domain.bg)}>
            <Icon size={16} className={domain.color} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{domain.label}</h3>
            <p className="text-[10px] text-muted-foreground">
              {domain.models.length} model{domain.models.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={domain.status} />
      </div>

      {/* Models */}
      <div className="space-y-2">
        {domain.models.map((model) => (
          <ModelCard key={model.name} model={model} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────

export function SchemaView() {
  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-8 py-8 space-y-8"
      >

        {/* ── Hero header ── */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-2xl overflow-hidden bg-linear-to-br from-primary via-primary/90 to-indigo-700 p-8 text-primary-foreground shadow-xl shadow-primary/20"
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <Database size={16} />
                <span className="text-sm font-medium">PostgreSQL · Prisma 7 · Neon</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Database Schema</h1>
              <p className="mt-1 text-primary-foreground/70 text-sm max-w-lg">
                Production-ready schema powering all Delix features — teams, messaging,
                meetings, calendar, files, notifications, and presence.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 shrink-0">
              {[
                { label: "Domains", value: domains.length },
                { label: "Models", value: totalModels },
                { label: "Fields", value: totalFields },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-primary-foreground/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Migration status banner ── */}
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
        >
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Migration applied successfully
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
              All tables created in PostgreSQL · Prisma client regenerated · Ready for data
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
            <span>20260426_initial_schema</span>
            <ArrowRight size={12} />
          </div>
        </motion.div>

        {/* ── Domain grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>

        {/* ── Enum reference ── */}
        <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enum Reference</h2>
              <p className="text-xs text-muted-foreground">All PostgreSQL enum types defined in the schema</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: "WorkspaceRole", values: ["OWNER", "ADMIN", "MEMBER"] },
              { name: "TeamRole", values: ["OWNER", "MEMBER"] },
              { name: "ChannelType", values: ["STANDARD", "ANNOUNCEMENT", "PRIVATE"] },
              { name: "ConversationType", values: ["DIRECT", "GROUP"] },
              { name: "MeetingType", values: ["SCHEDULED", "INSTANT"] },
              { name: "MeetingStatus", values: ["SCHEDULED", "ACTIVE", "ENDED", "CANCELLED"] },
              { name: "MeetingParticipantRole", values: ["HOST", "PARTICIPANT"] },
              { name: "AttendeeStatus", values: ["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"] },
              { name: "PresenceStatus", values: ["AVAILABLE", "BUSY", "AWAY", "DO_NOT_DISTURB", "BE_RIGHT_BACK", "OFFLINE"] },
              { name: "NotificationType", values: ["MESSAGE", "MENTION", "REPLY", "REACTION", "MEETING_INVITE", "MEETING_STARTING", "TEAM_INVITE", "CHANNEL_ADDED", "SYSTEM"] },
              { name: "FileSource", values: ["MESSAGE", "CHANNEL", "CONVERSATION"] },
            ].map((e) => (
              <div key={e.name} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold font-mono text-foreground mb-2">{e.name}</p>
                <div className="flex flex-wrap gap-1">
                  {e.values.map((v) => (
                    <span
                      key={v}
                      className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Next steps ── */}
        <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowRight size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">What&apos;s Next</h2>
              <p className="text-xs text-muted-foreground">Phase 2 — Real-time engine and chat system</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { phase: "Phase 2", title: "Real-time Engine", desc: "Pusher or Livekit for WebSocket events — typing indicators, live messages, presence updates", status: "next" },
              { phase: "Phase 3", title: "Chat System", desc: "Wire conversations and channel messages to the database with pagination and unread counts", status: "upcoming" },
              { phase: "Phase 4", title: "Teams & Channels", desc: "Create/join teams, channel list in sidebar, @mentions, channel messaging", status: "upcoming" },
              { phase: "Phase 5", title: "Meetings & Video", desc: "Daily.co or Livekit WebRTC integration, meet now, scheduled meetings", status: "upcoming" },
            ].map((item) => (
              <div
                key={item.title}
                className={cn(
                  "flex gap-3 p-4 rounded-xl border",
                  item.status === "next"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/20"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                  item.status === "next"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {item.phase.replace("Phase ", "")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
