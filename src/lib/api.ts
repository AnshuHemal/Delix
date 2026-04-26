/**
 * Delix — Typed API client
 *
 * Thin wrapper around fetch that:
 * - Prefixes all paths with /api
 * - Throws on non-2xx responses with a structured error
 * - Provides typed helpers for each resource
 */

// ─── Core fetch wrapper ───────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const message =
      (body as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  return res.json() as Promise<T>;
}

// ─── Workspaces ───────────────────────────────────────────────────────────

export const workspacesApi = {
  list: () =>
    apiFetch<{ workspaces: unknown[] }>("/workspaces"),

  get: (workspaceId: string) =>
    apiFetch<{ workspace: unknown }>(`/workspaces/${workspaceId}`),

  create: (data: { name: string; slug: string; description?: string }) =>
    apiFetch<{ workspace: unknown }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (workspaceId: string, data: Partial<{ name: string; description: string; logo: string }>) =>
    apiFetch<{ workspace: unknown }>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Teams ────────────────────────────────────────────────────────────────

export const teamsApi = {
  list: (workspaceId: string) =>
    apiFetch<{ teams: unknown[] }>(`/workspaces/${workspaceId}/teams`),

  get: (workspaceId: string, teamId: string) =>
    apiFetch<{ team: unknown }>(`/workspaces/${workspaceId}/teams/${teamId}`),

  create: (
    workspaceId: string,
    data: { name: string; description?: string; isPrivate?: boolean }
  ) =>
    apiFetch<{ team: unknown }>(`/workspaces/${workspaceId}/teams`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    workspaceId: string,
    teamId: string,
    data: Partial<{ name: string; description: string; isPrivate: boolean }>
  ) =>
    apiFetch<{ team: unknown }>(`/workspaces/${workspaceId}/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (workspaceId: string, teamId: string) =>
    apiFetch<{ success: boolean }>(`/workspaces/${workspaceId}/teams/${teamId}`, {
      method: "DELETE",
    }),
};

// ─── Channels ─────────────────────────────────────────────────────────────

export const channelsApi = {
  list: (workspaceId: string, teamId: string) =>
    apiFetch<{ channels: unknown[] }>(
      `/workspaces/${workspaceId}/teams/${teamId}/channels`
    ),

  create: (
    workspaceId: string,
    teamId: string,
    data: { name: string; description?: string; type?: "STANDARD" | "ANNOUNCEMENT" | "PRIVATE" }
  ) =>
    apiFetch<{ channel: unknown }>(
      `/workspaces/${workspaceId}/teams/${teamId}/channels`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  getMessages: (channelId: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return apiFetch<{ messages: unknown[]; hasMore: boolean; nextCursor?: string }>(
      `/channels/${channelId}/messages?${params}`
    );
  },

  sendMessage: (channelId: string, content: string, parentId?: string) =>
    apiFetch<{ message: unknown }>(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    }),
};

// ─── Conversations ────────────────────────────────────────────────────────

export const conversationsApi = {
  list: () =>
    apiFetch<{ conversations: unknown[] }>("/conversations"),

  createDirect: (userId: string) =>
    apiFetch<{ conversation: unknown }>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", userId }),
    }),

  createGroup: (userIds: string[], name?: string) =>
    apiFetch<{ conversation: unknown }>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "GROUP", userIds, name }),
    }),

  getMessages: (conversationId: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return apiFetch<{ messages: unknown[]; hasMore: boolean; nextCursor?: string }>(
      `/conversations/${conversationId}/messages?${params}`
    );
  },

  sendMessage: (conversationId: string, content: string, parentId?: string) =>
    apiFetch<{ message: unknown }>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    }),
};

// ─── Messages ─────────────────────────────────────────────────────────────

export const messagesApi = {
  edit: (messageId: string, content: string) =>
    apiFetch<{ message: unknown }>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  delete: (messageId: string) =>
    apiFetch<{ success: boolean }>(`/messages/${messageId}`, {
      method: "DELETE",
    }),

  toggleReaction: (messageId: string, emoji: string) =>
    apiFetch<{ action: "added" | "removed" }>(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }),
};

// ─── Meetings ─────────────────────────────────────────────────────────────

export const meetingsApi = {
  list: () =>
    apiFetch<{ meetings: unknown[] }>("/meetings"),

  get: (meetingId: string) =>
    apiFetch<{ meeting: unknown }>(`/meetings/${meetingId}`),

  create: (data: {
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    type?: "SCHEDULED" | "INSTANT";
  }) =>
    apiFetch<{ meeting: unknown }>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  join: (meetingId: string) =>
    apiFetch<{ success: boolean }>(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "join" }),
    }),

  leave: (meetingId: string) =>
    apiFetch<{ success: boolean }>(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "leave" }),
    }),

  updateStatus: (meetingId: string, status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED") =>
    apiFetch<{ meeting: unknown }>(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ─── Calendar ─────────────────────────────────────────────────────────────

export const calendarApi = {
  getEvents: (from: Date, to: Date) => {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    return apiFetch<{ events: unknown[] }>(`/calendar?${params}`);
  },

  getEvent: (eventId: string) =>
    apiFetch<{ event: unknown }>(`/calendar/${eventId}`),

  create: (data: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    isAllDay?: boolean;
    recurrence?: string;
    color?: string;
    meetingId?: string;
    attendeeIds?: string[];
  }) =>
    apiFetch<{ event: unknown }>("/calendar", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    eventId: string,
    data: Partial<{
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      isAllDay: boolean;
      color: string;
    }>
  ) =>
    apiFetch<{ event: unknown }>(`/calendar/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  rsvp: (eventId: string, status: "ACCEPTED" | "DECLINED" | "TENTATIVE") =>
    apiFetch<{ attendee: unknown }>(`/calendar/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({ attendeeStatus: status }),
    }),

  delete: (eventId: string) =>
    apiFetch<{ success: boolean }>(`/calendar/${eventId}`, {
      method: "DELETE",
    }),
};

// ─── Notifications ────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (options?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set("unreadOnly", "true");
    if (options?.limit) params.set("limit", String(options.limit));
    return apiFetch<{ notifications: unknown[] }>(`/notifications?${params}`);
  },

  getUnreadCount: () =>
    apiFetch<{ count: number }>("/notifications?countOnly=true"),

  markAsRead: (notificationId: string) =>
    apiFetch<{ notification: unknown }>(`/notifications/${notificationId}`, {
      method: "PATCH",
    }),

  markAllAsRead: () =>
    apiFetch<{ success: boolean }>("/notifications", { method: "PATCH" }),

  delete: (notificationId: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${notificationId}`, {
      method: "DELETE",
    }),
};

// ─── Presence ─────────────────────────────────────────────────────────────

export const presenceApi = {
  getForUsers: (userIds: string[]) => {
    const params = new URLSearchParams();
    userIds.forEach((id) => params.append("userId", id));
    return apiFetch<{ presences: unknown[] }>(`/presence?${params}`);
  },

  update: (
    status: "AVAILABLE" | "BUSY" | "AWAY" | "DO_NOT_DISTURB" | "BE_RIGHT_BACK" | "OFFLINE",
    customMessage?: string
  ) =>
    apiFetch<{ presence: unknown }>("/presence", {
      method: "PATCH",
      body: JSON.stringify({ status, customMessage }),
    }),
};

export { ApiError };
