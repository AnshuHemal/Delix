/**
 * Delix — Database Types
 *
 * Re-exports Prisma-generated types and defines rich composite
 * types used throughout the application (with relations included).
 */

export type {
  // Enums
  WorkspaceRole,
  TeamRole,
  ChannelType,
  ConversationType,
  MeetingType,
  MeetingStatus,
  MeetingParticipantRole,
  AttendeeStatus,
  PresenceStatus,
  NotificationType,
  FileSource,

  // Base models
  Workspace,
  WorkspaceMember,
  Team,
  TeamMember,
  Channel,
  ChannelMember,
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  MessageReaction,
  Meeting,
  MeetingParticipant,
  CalendarEvent,
  CalendarEventAttendee,
  File,
  Notification,
  UserPresence,
  User,
} from "@/generated/prisma/client";

import type {
  Workspace,
  WorkspaceMember,
  Team,
  TeamMember,
  Channel,
  ChannelMember,
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  MessageReaction,
  Meeting,
  MeetingParticipant,
  CalendarEvent,
  CalendarEventAttendee,
  File,
  Notification,
  UserPresence,
  User,
} from "@/generated/prisma/client";

// ─── User with presence ────────────────────────────────────────────────────

export type UserWithPresence = User & {
  presence: UserPresence | null;
};

// ─── Workspace ────────────────────────────────────────────────────────────

export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & { user: UserWithPresence })[];
  _count: { members: number; teams: number };
};

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: UserWithPresence;
};

// ─── Teams & Channels ─────────────────────────────────────────────────────

export type TeamWithDetails = Team & {
  members: (TeamMember & { user: UserWithPresence })[];
  channels: ChannelWithDetails[];
  _count: { members: number; channels: number };
};

export type TeamMemberWithUser = TeamMember & {
  user: UserWithPresence;
};

export type ChannelWithDetails = Channel & {
  _count: { messages: number; members: number };
  lastMessage?: MessageWithAuthor | null;
  unreadCount?: number;
};

export type ChannelMemberWithUser = ChannelMember & {
  user: UserWithPresence;
};

// ─── Messaging ────────────────────────────────────────────────────────────

export type MessageWithAuthor = Message & {
  author: UserWithPresence;
  attachments: MessageAttachment[];
  reactions: (MessageReaction & { user: Pick<User, "id" | "name" | "image"> })[];
  replies?: MessageWithAuthor[];
  _count?: { replies: number };
};

export type ConversationWithDetails = Conversation & {
  members: (ConversationMember & { user: UserWithPresence })[];
  lastMessage?: MessageWithAuthor | null;
  unreadCount?: number;
};

export type ConversationMemberWithUser = ConversationMember & {
  user: UserWithPresence;
};

// ─── Meetings ─────────────────────────────────────────────────────────────

export type MeetingWithDetails = Meeting & {
  organizer: UserWithPresence;
  participants: (MeetingParticipant & { user: UserWithPresence })[];
  calendarEvent?: CalendarEvent | null;
  _count: { participants: number };
};

// ─── Calendar ─────────────────────────────────────────────────────────────

export type CalendarEventWithDetails = CalendarEvent & {
  organizer: UserWithPresence;
  attendees: (CalendarEventAttendee & { user: UserWithPresence })[];
  meeting?: Meeting | null;
};

// ─── Files ────────────────────────────────────────────────────────────────

export type FileWithUploader = File & {
  uploadedBy: Pick<User, "id" | "name" | "image">;
};

// ─── Notifications ────────────────────────────────────────────────────────

export type NotificationWithUser = Notification & {
  user: Pick<User, "id" | "name" | "image">;
};

// ─── Recurrence rule (stored as JSON string in CalendarEvent.recurrence) ──

export interface RecurrenceRule {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  until?: string; // ISO date string
  byDay?: string[]; // ["MO", "TU", "WE", "TH", "FR"]
}
