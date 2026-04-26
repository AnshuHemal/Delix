/**
 * Delix — Real-time event publisher
 *
 * All API routes call these helpers after DB writes.
 * Never import this on the client.
 */

import { pusherServer } from "./server";
import { PusherChannels, PusherEvents } from "./events";
import type {
  MessageWithAuthor,
  ConversationWithDetails,
  UserPresence,
  Notification,
} from "@/types";

// ─── Messages ─────────────────────────────────────────────────────────────

/** Broadcast a new message to a channel or conversation */
export async function publishNewMessage(
  contextId: string,
  contextType: "channel" | "conversation",
  message: MessageWithAuthor
) {
  const pusherChannel =
    contextType === "channel"
      ? PusherChannels.channel(contextId)
      : PusherChannels.conversation(contextId);

  await pusherServer.trigger(pusherChannel, PusherEvents.MESSAGE_NEW, {
    contextId,
    message,
  });
}

/** Broadcast a message edit */
export async function publishMessageUpdated(
  contextId: string,
  contextType: "channel" | "conversation",
  messageId: string,
  content: string,
  updatedAt: Date
) {
  const pusherChannel =
    contextType === "channel"
      ? PusherChannels.channel(contextId)
      : PusherChannels.conversation(contextId);

  await pusherServer.trigger(pusherChannel, PusherEvents.MESSAGE_UPDATED, {
    contextId,
    messageId,
    content,
    isEdited: true,
    updatedAt: updatedAt.toISOString(),
  });
}

/** Broadcast a message deletion */
export async function publishMessageDeleted(
  contextId: string,
  contextType: "channel" | "conversation",
  messageId: string
) {
  const pusherChannel =
    contextType === "channel"
      ? PusherChannels.channel(contextId)
      : PusherChannels.conversation(contextId);

  await pusherServer.trigger(pusherChannel, PusherEvents.MESSAGE_DELETED, {
    contextId,
    messageId,
  });
}

// ─── Reactions ────────────────────────────────────────────────────────────

export async function publishReactionAdded(
  contextId: string,
  contextType: "channel" | "conversation",
  payload: {
    messageId: string;
    emoji: string;
    userId: string;
    userName: string;
    userImage: string | null;
  }
) {
  const pusherChannel =
    contextType === "channel"
      ? PusherChannels.channel(contextId)
      : PusherChannels.conversation(contextId);

  await pusherServer.trigger(pusherChannel, PusherEvents.REACTION_ADDED, {
    contextId,
    ...payload,
  });
}

export async function publishReactionRemoved(
  contextId: string,
  contextType: "channel" | "conversation",
  payload: { messageId: string; emoji: string; userId: string }
) {
  const pusherChannel =
    contextType === "channel"
      ? PusherChannels.channel(contextId)
      : PusherChannels.conversation(contextId);

  await pusherServer.trigger(pusherChannel, PusherEvents.REACTION_REMOVED, {
    contextId,
    ...payload,
  });
}

// ─── Conversations ────────────────────────────────────────────────────────

/** Notify all members of a new conversation */
export async function publishNewConversation(
  memberUserIds: string[],
  conversation: ConversationWithDetails
) {
  const events = memberUserIds.map((userId) => ({
    channel: PusherChannels.user(userId),
    name: PusherEvents.CONVERSATION_NEW,
    data: { conversation },
  }));

  // Pusher batch trigger — up to 10 events per call
  for (let i = 0; i < events.length; i += 10) {
    await pusherServer.triggerBatch(events.slice(i, i + 10));
  }
}

/** Notify conversation members of a new last message */
export async function publishConversationUpdated(
  conversationId: string,
  memberUserIds: string[],
  lastMessage: MessageWithAuthor,
  updatedAt: Date
) {
  const payload = {
    conversationId,
    lastMessage,
    updatedAt: updatedAt.toISOString(),
  };

  const events = memberUserIds.map((userId) => ({
    channel: PusherChannels.user(userId),
    name: PusherEvents.CONVERSATION_UPDATED,
    data: payload,
  }));

  for (let i = 0; i < events.length; i += 10) {
    await pusherServer.triggerBatch(events.slice(i, i + 10));
  }
}

// ─── Presence ─────────────────────────────────────────────────────────────

/** Broadcast a user's presence change to their workspace */
export async function publishPresenceUpdated(
  workspaceId: string,
  userId: string,
  presence: UserPresence
) {
  await pusherServer.trigger(
    PusherChannels.workspace(workspaceId),
    PusherEvents.PRESENCE_UPDATED,
    { userId, presence }
  );
}

// ─── Notifications ────────────────────────────────────────────────────────

/** Push a notification to a specific user */
export async function publishNotification(
  userId: string,
  notification: Notification
) {
  await pusherServer.trigger(
    PusherChannels.user(userId),
    PusherEvents.NOTIFICATION_NEW,
    { notification }
  );
}

// ─── Meetings ─────────────────────────────────────────────────────────────

export async function publishMeetingParticipantJoined(
  meetingId: string,
  payload: {
    userId: string;
    userName: string;
    userImage: string | null;
    role: "HOST" | "PARTICIPANT";
    joinedAt: Date;
  }
) {
  await pusherServer.trigger(
    `private-meeting-${meetingId}`,
    PusherEvents.MEETING_PARTICIPANT_JOINED,
    { meetingId, ...payload, joinedAt: payload.joinedAt.toISOString() }
  );
}

export async function publishMeetingParticipantLeft(
  meetingId: string,
  payload: {
    userId: string;
    userName: string;
    userImage: string | null;
    role: "HOST" | "PARTICIPANT";
    leftAt: Date;
  }
) {
  await pusherServer.trigger(
    `private-meeting-${meetingId}`,
    PusherEvents.MEETING_PARTICIPANT_LEFT,
    { meetingId, ...payload, leftAt: payload.leftAt.toISOString() }
  );
}

export async function publishMeetingStatusChanged(
  meetingId: string,
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED"
) {
  await pusherServer.trigger(
    `private-meeting-${meetingId}`,
    PusherEvents.MEETING_STATUS_CHANGED,
    { meetingId, status }
  );
}

// ─── Unread counts ────────────────────────────────────────────────────────

/** Tell a specific user their unread count changed for a context */
export async function publishUnreadUpdated(
  userId: string,
  contextId: string,
  count: number
) {
  await pusherServer.trigger(
    PusherChannels.user(userId),
    PusherEvents.UNREAD_UPDATED,
    { contextId, count }
  );
}
