/**
 * Delix — Real-time Event Definitions
 *
 * Every Pusher event name and its payload type is defined here.
 * Import from this file on both server (to publish) and client (to subscribe).
 *
 * Channel naming conventions:
 *   private-conversation-{id}   → DM / group conversation
 *   private-channel-{id}        → Team channel
 *   private-user-{id}           → Per-user notifications & presence
 *   presence-workspace-{id}     → Workspace-wide presence (online members)
 */

import type {
  MessageWithAuthor,
  ConversationWithDetails,
  UserPresence,
  Notification,
} from "@/types";

// ─── Channel name helpers ─────────────────────────────────────────────────

export const PusherChannels = {
  conversation: (id: string) => `private-conversation-${id}`,
  channel: (id: string) => `private-channel-${id}`,
  user: (id: string) => `private-user-${id}`,
  workspace: (id: string) => `presence-workspace-${id}`,
} as const;

// ─── Event name constants ─────────────────────────────────────────────────

export const PusherEvents = {
  // Messages
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",

  // Reactions
  REACTION_ADDED: "reaction:added",
  REACTION_REMOVED: "reaction:removed",

  // Typing
  TYPING_START: "client-typing:start",   // client-* = sent peer-to-peer, no server trigger needed
  TYPING_STOP: "client-typing:stop",

  // Conversations
  CONVERSATION_NEW: "conversation:new",
  CONVERSATION_UPDATED: "conversation:updated",

  // Presence
  PRESENCE_UPDATED: "presence:updated",

  // Notifications
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_ALL_READ: "notification:all-read",

  // Meetings
  MEETING_PARTICIPANT_JOINED: "meeting:participant-joined",
  MEETING_PARTICIPANT_LEFT: "meeting:participant-left",
  MEETING_STATUS_CHANGED: "meeting:status-changed",

  // Unread
  UNREAD_UPDATED: "unread:updated",
} as const;

export type PusherEventName = (typeof PusherEvents)[keyof typeof PusherEvents];

// ─── Event payload types ──────────────────────────────────────────────────

export interface MessageNewPayload {
  contextId: string; // channelId or conversationId
  message: MessageWithAuthor;
}

export interface MessageUpdatedPayload {
  contextId: string;
  messageId: string;
  content: string;
  isEdited: boolean;
  updatedAt: string;
}

export interface MessageDeletedPayload {
  contextId: string;
  messageId: string;
}

export interface ReactionAddedPayload {
  contextId: string;
  messageId: string;
  emoji: string;
  userId: string;
  userName: string;
  userImage: string | null;
}

export interface ReactionRemovedPayload {
  contextId: string;
  messageId: string;
  emoji: string;
  userId: string;
}

export interface TypingPayload {
  contextId: string;
  userId: string;
  userName: string;
  userImage: string | null;
}

export interface ConversationNewPayload {
  conversation: ConversationWithDetails;
}

export interface ConversationUpdatedPayload {
  conversationId: string;
  lastMessage?: MessageWithAuthor;
  updatedAt: string;
}

export interface PresenceUpdatedPayload {
  userId: string;
  presence: UserPresence;
}

export interface NotificationNewPayload {
  notification: Notification;
}

export interface NotificationReadPayload {
  notificationId: string;
}

export interface NotificationAllReadPayload {
  userId: string;
}

export interface MeetingParticipantPayload {
  meetingId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  role: "HOST" | "PARTICIPANT";
  joinedAt?: string;
  leftAt?: string;
}

export interface MeetingStatusPayload {
  meetingId: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
}

export interface UnreadUpdatedPayload {
  contextId: string; // conversationId or channelId
  count: number;
}

// ─── Typed event map (used by the hook for type-safe subscriptions) ────────

export interface PusherEventMap {
  [PusherEvents.MESSAGE_NEW]: MessageNewPayload;
  [PusherEvents.MESSAGE_UPDATED]: MessageUpdatedPayload;
  [PusherEvents.MESSAGE_DELETED]: MessageDeletedPayload;
  [PusherEvents.REACTION_ADDED]: ReactionAddedPayload;
  [PusherEvents.REACTION_REMOVED]: ReactionRemovedPayload;
  [PusherEvents.TYPING_START]: TypingPayload;
  [PusherEvents.TYPING_STOP]: TypingPayload;
  [PusherEvents.CONVERSATION_NEW]: ConversationNewPayload;
  [PusherEvents.CONVERSATION_UPDATED]: ConversationUpdatedPayload;
  [PusherEvents.PRESENCE_UPDATED]: PresenceUpdatedPayload;
  [PusherEvents.NOTIFICATION_NEW]: NotificationNewPayload;
  [PusherEvents.NOTIFICATION_READ]: NotificationReadPayload;
  [PusherEvents.NOTIFICATION_ALL_READ]: NotificationAllReadPayload;
  [PusherEvents.MEETING_PARTICIPANT_JOINED]: MeetingParticipantPayload;
  [PusherEvents.MEETING_PARTICIPANT_LEFT]: MeetingParticipantPayload;
  [PusherEvents.MEETING_STATUS_CHANGED]: MeetingStatusPayload;
  [PusherEvents.UNREAD_UPDATED]: UnreadUpdatedPayload;
}
