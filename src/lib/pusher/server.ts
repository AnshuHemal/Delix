/**
 * Pusher server-side instance
 * Used exclusively in API routes and server actions — never imported on the client.
 */

import Pusher from "pusher";

function createPusherServer() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "ap2";

  if (!appId || !key || !secret) {
    // In development without Pusher configured, return a no-op stub
    if (process.env.NODE_ENV === "development") {
      return {
        trigger: async () => {},
        triggerBatch: async () => {},
      } as unknown as Pusher;
    }
    throw new Error(
      "Pusher server credentials are missing. Set PUSHER_APP_ID, PUSHER_KEY, and PUSHER_SECRET in .env.local"
    );
  }

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

// Singleton — reuse across hot reloads in dev
const globalForPusher = globalThis as unknown as { pusherServer: Pusher | undefined };
export const pusherServer = globalForPusher.pusherServer ?? createPusherServer();
if (process.env.NODE_ENV !== "production") globalForPusher.pusherServer = pusherServer;
