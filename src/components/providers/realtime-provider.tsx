/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

/**
 * RealtimeProvider
 *
 * Mounts once inside the dashboard layout.
 * Subscribes to the current user's private channel and handles all
 * user-scoped real-time events: notifications, conversation updates,
 * presence changes, unread counts.
 *
 * Per-conversation and per-channel subscriptions are handled by the
 * individual chat/channel view components via usePusherChannel().
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell, MessageSquare } from "lucide-react";
import { pusherClient } from "@/lib/pusher/client";
import { PusherChannels, PusherEvents } from "@/lib/pusher/events";
import { useChatStore, useNotificationStore, usePresenceStore } from "@/stores";
import type {
  ConversationNewPayload,
  ConversationUpdatedPayload,
  NotificationNewPayload,
  NotificationReadPayload,
  NotificationAllReadPayload,
  PresenceUpdatedPayload,
  UnreadUpdatedPayload,
} from "@/lib/pusher/events";

interface RealtimeProviderProps {
  userId: string;
  workspaceId?: string;
  children: React.ReactNode;
}

export function RealtimeProvider({
  userId,
  workspaceId,
  children,
}: RealtimeProviderProps) {
  const subscribedRef = useRef(false);

  const {
    addConversation,
    updateConversation,
    incrementUnread,
    setUnread,
    activeConversationId,
  } = useChatStore();

  const { addNotification, markAsRead, markAllAsRead } = useNotificationStore();
  const { setPresence } = usePresenceStore();

  // ── Subscribe to private-user-{userId} ──────────────────────────────────
  useEffect(() => {
    if (!pusherClient || subscribedRef.current) return;
    subscribedRef.current = true;

    const userChannel = pusherClient.subscribe(PusherChannels.user(userId));

    // New conversation created (DM or group)
    userChannel.bind(
      PusherEvents.CONVERSATION_NEW,
      (data: ConversationNewPayload) => {
        addConversation(data.conversation);
      }
    );

    // Conversation got a new message — update last message preview
    userChannel.bind(
      PusherEvents.CONVERSATION_UPDATED,
      (data: ConversationUpdatedPayload) => {
        updateConversation(data.conversationId, {
          lastMessage: data.lastMessage,
          updatedAt: new Date(data.updatedAt),
        });

        // Increment unread if this isn't the active conversation
        if (data.conversationId !== activeConversationId) {
          incrementUnread(data.conversationId);
        }
      }
    );

    // Unread count explicitly set (e.g. after marking as read)
    userChannel.bind(
      PusherEvents.UNREAD_UPDATED,
      (data: UnreadUpdatedPayload) => {
        setUnread(data.contextId, data.count);
      }
    );

    // New notification
    userChannel.bind(
      PusherEvents.NOTIFICATION_NEW,
      (data: NotificationNewPayload) => {
        addNotification(data.notification);

        // Show a toast for important notification types
        const { type, title, body } = data.notification;
        if (type === "MENTION" || type === "REPLY") {
          toast(title, {
            description: body ?? undefined,
            icon: <MessageSquare className="w-4 h-4 text-primary" />,
            duration: 5000,
          });
        } else if (type === "MEETING_INVITE" || type === "MEETING_STARTING") {
          toast(title, {
            description: body ?? undefined,
            icon: <Bell className="w-4 h-4 text-amber-500" />,
            duration: 8000,
          });
        }
      }
    );

    // Notification marked as read (from another tab/device)
    userChannel.bind(
      PusherEvents.NOTIFICATION_READ,
      (data: NotificationReadPayload) => {
        markAsRead(data.notificationId);
      }
    );

    // All notifications marked as read
    userChannel.bind(
      PusherEvents.NOTIFICATION_ALL_READ,
      (_data: NotificationAllReadPayload) => {
        markAllAsRead();
      }
    );

    return () => {
      userChannel.unbind_all();
      pusherClient?.unsubscribe(PusherChannels.user(userId));
      subscribedRef.current = false;
    };
  }, [
    userId,
    addConversation,
    updateConversation,
    incrementUnread,
    setUnread,
    activeConversationId,
    addNotification,
    markAsRead,
    markAllAsRead,
  ]);

  // ── Subscribe to presence-workspace-{workspaceId} ────────────────────────
  useEffect(() => {
    if (!pusherClient || !workspaceId) return;

    const wsChannel = pusherClient.subscribe(
      PusherChannels.workspace(workspaceId)
    );

    wsChannel.bind(
      PusherEvents.PRESENCE_UPDATED,
      (data: PresenceUpdatedPayload) => {
        setPresence(data.userId, data.presence);
      }
    );

    return () => {
      wsChannel.unbind_all();
      pusherClient?.unsubscribe(PusherChannels.workspace(workspaceId));
    };
  }, [workspaceId, setPresence]);

  return <>{children}</>;
}
