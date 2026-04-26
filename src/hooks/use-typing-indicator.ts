/**
 * useTypingIndicator
 *
 * Sends client-typing events via Pusher client-events (peer-to-peer, no server needed).
 * Automatically stops typing after 3 seconds of inactivity.
 *
 * Usage:
 *   const { sendTyping } = useTypingIndicator(channelName, userId, userName);
 *   // Call sendTyping() on every keystroke in the message input
 */

"use client";

import { useCallback, useRef } from "react";
import { pusherClient } from "@/lib/pusher/client";
import { PusherEvents } from "@/lib/pusher/events";

const TYPING_TIMEOUT_MS = 3000;

export function useTypingIndicator(
  channelName: string | null | undefined,
  userId: string,
  userName: string,
  userImage: string | null = null
) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (!channelName || !pusherClient || !isTypingRef.current) return;

    const channel = pusherClient.channel(channelName);
    if (!channel) return;

    channel.trigger(PusherEvents.TYPING_STOP, {
      contextId: channelName,
      userId,
      userName,
      userImage,
    });

    isTypingRef.current = false;
  }, [channelName, userId, userName, userImage]);

  const sendTyping = useCallback(() => {
    if (!channelName || !pusherClient) return;

    const channel = pusherClient.channel(channelName);
    if (!channel) return;

    // Only send start event if not already typing
    if (!isTypingRef.current) {
      channel.trigger(PusherEvents.TYPING_START, {
        contextId: channelName,
        userId,
        userName,
        userImage,
      });
      isTypingRef.current = true;
    }

    // Reset the auto-stop timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  }, [channelName, userId, userName, userImage, stopTyping]);

  return { sendTyping, stopTyping };
}
