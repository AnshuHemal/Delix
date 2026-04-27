/**
 * Pusher client-side instance
 * Safe to import in client components — uses NEXT_PUBLIC_ env vars only.
 *
 * pusher-js must only be instantiated in the browser. The Node bundle does
 * not export a usable constructor, so we guard with typeof window before
 * ever calling new Pusher(...).
 */

import type PusherType from "pusher-js";

function createPusherClient(): PusherType | null {
  // Never run on the server — pusher-js Node bundle is not a real client.
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2";

  if (!key) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    throw new Error("NEXT_PUBLIC_PUSHER_KEY is not set. Add it to .env.local");
  }

  // Dynamic require so the Node bundle is never evaluated during SSR.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PusherJS = require("pusher-js") as typeof PusherType;
  return new PusherJS(key, {
    cluster,
    forceTLS: true,
    authEndpoint: "/api/pusher/auth",
    authTransport: "ajax",
  });
}

const globalForPusher = globalThis as unknown as {
  pusherClient: PusherType | null | undefined;
};

export const pusherClient: PusherType | null =
  globalForPusher.pusherClient !== undefined
    ? globalForPusher.pusherClient
    : createPusherClient();

if (process.env.NODE_ENV !== "production") {
  globalForPusher.pusherClient = pusherClient;
}
