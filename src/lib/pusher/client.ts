/**
 * Pusher client-side instance
 * Safe to import in client components — uses NEXT_PUBLIC_ env vars only.
 */

import PusherClient from "pusher-js";

function createPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2";

  if (!key) {
    // Return a stub in dev when Pusher isn't configured yet
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    throw new Error(
      "NEXT_PUBLIC_PUSHER_KEY is not set. Add it to .env.local"
    );
  }

  return new PusherClient(key, {
    cluster,
    forceTLS: true,
    // Auth endpoint for private/presence channels
    authEndpoint: "/api/pusher/auth",
    authTransport: "ajax",
  });
}

const globalForPusher = globalThis as unknown as {
  pusherClient: PusherClient | null | undefined;
};

export const pusherClient =
  globalForPusher.pusherClient !== undefined
    ? globalForPusher.pusherClient
    : createPusherClient();

if (process.env.NODE_ENV !== "production") {
  globalForPusher.pusherClient = pusherClient;
}
