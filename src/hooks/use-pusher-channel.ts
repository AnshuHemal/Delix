/**
 * usePusherChannel — subscribe to a Pusher channel and listen for events
 *
 * Usage:
 *   usePusherChannel("private-conversation-abc", {
 *     "message:new": (data) => { ... },
 *     "client-typing:start": (data) => { ... },
 *   });
 */

"use client";

import { useEffect, useRef } from "react";
import type { Channel } from "pusher-js";
import { pusherClient } from "@/lib/pusher/client";
import type { PusherEventMap } from "@/lib/pusher/events";

type EventHandlers = Partial<{
  [K in keyof PusherEventMap]: (data: PusherEventMap[K]) => void;
}>;

export function usePusherChannel(
  channelName: string | null | undefined,
  handlers: EventHandlers
) {
  const channelRef = useRef<Channel | null>(null);
  // Keep handlers stable — use a ref so we don't re-subscribe on every render
  const handlersRef = useRef<EventHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!channelName || !pusherClient) return;

    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel;

    // Bind all provided event handlers
    const boundEvents = Object.keys(handlersRef.current) as (keyof PusherEventMap)[];
    for (const event of boundEvents) {
      channel.bind(event, (data: PusherEventMap[typeof event]) => {
        handlersRef.current[event]?.(data as never);
      });
    }

    return () => {
      for (const event of boundEvents) {
        channel.unbind(event);
      }
      pusherClient?.unsubscribe(channelName);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return channelRef.current;
}
