# Design Document: Teams & Channels

## Overview

The Teams & Channels feature adds a Microsoft Teams-style collaboration layer to Delix. It reuses the established patterns from the chat system — Pusher real-time events, Zustand store, `ConversationView` component structure, shadcn/ui + Tailwind + Framer Motion design system — and wires them to the already-scaffolded Prisma models and API routes.

The implementation is organized in six layers, each building on the previous:

1. **Schema additions** — four new fields on existing models, one new migration
2. **Missing API endpoints** — five new route files completing the REST surface
3. **Teams Store** — Zustand store mirroring `chat-store.ts`
4. **Real-time hook** — `useChannelRealtime` mirroring `useConversationRealtime`
5. **UI components** — panel, views, and modals
6. **Integration** — wiring the page, sidebar rename, and communities page replacement

---

## Architecture

### Component Tree

```
/dashboard/communities (page)
└── TeamsView                          ← top-level layout (replaces CommunitiesView)
    ├── TeamsPanel (w-96, left)        ← team/channel list
    │   ├── SearchInput
    │   ├── TeamRow (expandable)
    │   │   ├── MemberAvatars + PresenceDots
    │   │   └── ChannelRow (per channel)
    │   ├── CreateTeamModal
    │   ├── TeamSettingsModal
    │   ├── CreateChannelModal
    │   └── ChannelSettingsModal
    ├── ChannelView (flex-1, center)   ← message area
    │   ├── TopBar (name, tabs, actions)
    │   ├── PinnedMessages (collapsible)
    │   ├── MessageList (infinite scroll)
    │   ├── TypingIndicator
    │   └── MessageInput (textarea + toolbar)
    └── ThreadPanel (w-[380px], right, slide-in)  ← reused from chat system
```

### Data Flow

```
Page load
  → TeamsView mounts
  → TeamsPanel fetches GET /api/workspaces/[workspaceId]/teams
  → setTeams() → TeamsStore

User selects channel
  → setActiveChannel(channelId) → TeamsStore
  → ChannelView fetches GET /api/channels/[channelId]/messages?limit=50
  → setMessages(channelId, messages) → TeamsStore
  → PATCH /api/channels/[channelId]/members/read
  → clearUnread(channelId) → TeamsStore
  → useChannelRealtime subscribes to private-channel-{channelId}

User sends message
  → optimistic addMessage() → TeamsStore
  → POST /api/channels/[channelId]/messages
  → server: createMessage + publishNewMessage(channelId, "channel", msg)
  → Pusher broadcasts message:new to private-channel-{channelId}
  → useChannelRealtime receives → addMessage() → TeamsStore
  → ChannelView replaces optimistic with real message
```

---

## Layer 1: Schema Additions

Four fields are added to existing models. No new models are required.

### 1.1 `Message.isPinned`

```prisma
model Message {
  // ... existing fields ...
  isPinned Boolean @default(false)
}
```

Used by the Pinned Messages section (Requirement 7). Allows Team Owners to pin/unpin messages in a channel.

### 1.2 `Channel.isArchived`

```prisma
model Channel {
  // ... existing fields ...
  isArchived Boolean @default(false)
}
```

Used for soft-delete/archive (Requirement 15.4). Archived channels are excluded from the Teams Panel query.

### 1.3 `Channel.topic`

```prisma
model Channel {
  // ... existing fields ...
  topic String?
}
```

Displayed in the Channel View header and editable in Channel Settings (Requirement 15.2).

### 1.4 `ChannelMember.lastReadAt`

```prisma
model ChannelMember {
  // ... existing fields ...
  lastReadAt DateTime?
}
```

Used to compute unread counts per channel per user (Requirement 20). Mirrors `ConversationMember.lastReadAt`.

### Migration

A single Prisma migration adds all four fields:

```sql
ALTER TABLE "message" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "channel" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "channel" ADD COLUMN "topic" TEXT;
ALTER TABLE "channel_member" ADD COLUMN "last_read_at" TIMESTAMP(3);
```

The `updateChannel` DB helper in `src/lib/db/teams.ts` must be extended to accept `topic` and `isArchived` in its partial update type.

---

## Layer 2: API Endpoints

### 2.1 Existing routes (already scaffolded — verify implementation)

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/workspaces/[workspaceId]/teams` | ✅ implemented |
| POST | `/api/workspaces/[workspaceId]/teams` | ✅ implemented |
| GET | `/api/workspaces/[workspaceId]/teams/[teamId]` | ✅ implemented |
| PATCH | `/api/workspaces/[workspaceId]/teams/[teamId]` | ✅ implemented |
| DELETE | `/api/workspaces/[workspaceId]/teams/[teamId]` | ✅ implemented |
| GET | `/api/workspaces/[workspaceId]/teams/[teamId]/channels` | ✅ implemented |
| POST | `/api/workspaces/[workspaceId]/teams/[teamId]/channels` | ✅ implemented |
| GET | `/api/channels/[channelId]/messages` | ✅ implemented |
| POST | `/api/channels/[channelId]/messages` | ✅ implemented (needs ANNOUNCEMENT check) |

### 2.2 New routes to create

#### `POST /api/workspaces/[workspaceId]/teams/[teamId]/members`

File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/members/route.ts`

```
Body: { userId: string, role?: "MEMBER" | "OWNER" }
Auth: workspace member required
Permission: any workspace member can add (team owner required for role=OWNER)
Response 201: { member: TeamMemberWithUser }
Response 400: validation error
Response 403: forbidden
Response 404: team not found
```

Calls `addTeamMember(teamId, userId, role)` from `src/lib/db/teams.ts`.

#### `DELETE /api/workspaces/[workspaceId]/teams/[teamId]/members/[userId]`

File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/members/[userId]/route.ts`

```
Auth: workspace member required
Permission: Team Owner OR removing self
Guard: cannot remove the last owner (return 409 Conflict)
Response 200: { success: true }
Response 403: forbidden
Response 409: "Cannot remove the last team owner"
```

Calls `removeTeamMember(teamId, userId)`.

#### `PATCH /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]`

File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]/route.ts`

```
Body: { name?, description?, topic?, isArchived? }
Auth: workspace member required
Permission: Team Owner required
Response 200: { channel: ChannelWithDetails }
Response 403: forbidden
```

Calls `updateChannel(channelId, data)` — the helper must be extended to accept `topic` and `isArchived`.

#### `DELETE /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]`

Same file as PATCH above (combined route handler).

```
Auth: workspace member required
Permission: Team Owner required
Guard: cannot delete the last channel in a team
Response 200: { success: true }
Response 403: forbidden
Response 409: "Cannot delete the last channel"
```

Calls `deleteChannel(channelId)` (hard delete) or sets `isArchived = true` (soft archive). The Channel Settings modal uses PATCH with `{ isArchived: true }` for the "Archive" action; hard DELETE is reserved for permanent removal.

#### `PATCH /api/channels/[channelId]/members/read`

File: `src/app/api/channels/[channelId]/members/read/route.ts`

```
Auth: workspace member required (via channel team membership)
Response 200: { success: true }
```

Updates `ChannelMember.lastReadAt = new Date()` for the current user. Mirrors `markConversationAsRead`.

```typescript
await prisma.channelMember.upsert({
  where: { channelId_userId: { channelId, userId } },
  create: { channelId, userId, lastReadAt: new Date() },
  update: { lastReadAt: new Date() },
});
```

#### `GET /api/channels/[channelId]/files`

File: `src/app/api/channels/[channelId]/files/route.ts`

```
Query: limit (default 50), cursor
Auth: channel team member required
Response 200: { files: FileWithUploader[], hasMore: boolean, nextCursor?: string }
```

Queries `prisma.file.findMany({ where: { channelId }, include: { uploadedBy: ... } })`.

### 2.3 Existing route modifications

#### `POST /api/channels/[channelId]/messages` — add ANNOUNCEMENT permission check

The existing scaffolded route must add:

```typescript
// After assertChannelAccess:
if (channel.type === "ANNOUNCEMENT") {
  const teamMember = channel.team.members[0]; // already filtered to current user
  if (teamMember?.role !== "OWNER") {
    return NextResponse.json({ error: "Only team owners can post in announcement channels" }, { status: 403 });
  }
}
```

#### `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels` — add Team Owner check

The existing route must verify the requesting user is a Team Owner before creating a channel (Requirement 16.6).

---

## Layer 3: Teams Store

File: `src/stores/teams-store.ts`

Mirrors `src/stores/chat-store.ts` exactly, substituting teams/channels for conversations.

### State Shape

```typescript
interface TeamsState {
  // Teams list
  teams: TeamWithDetails[];
  setTeams: (teams: TeamWithDetails[]) => void;
  addTeam: (team: TeamWithDetails) => void;
  updateTeam: (id: string, data: Partial<TeamWithDetails>) => void;
  removeTeam: (id: string) => void;

  // Active selection
  activeTeamId: string | null;
  setActiveTeam: (id: string | null) => void;
  activeChannelId: string | null;
  setActiveChannel: (id: string | null) => void;

  // Messages per channel (keyed by channelId)
  messages: Record<string, MessageWithAuthor[]>;
  setMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  prependMessages: (channelId: string, messages: MessageWithAuthor[]) => void;
  addMessage: (channelId: string, message: MessageWithAuthor) => void;
  updateMessage: (channelId: string, messageId: string, data: Partial<MessageWithAuthor>) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  // Pagination
  cursors: Record<string, string | undefined>;
  setCursor: (channelId: string, cursor: string | undefined) => void;
  hasMore: Record<string, boolean>;
  setHasMore: (channelId: string, value: boolean) => void;

  // Typing indicators (keyed by channelId)
  typing: Record<string, TypingUser[]>;
  setTyping: (channelId: string, user: TypingUser) => void;
  clearTyping: (channelId: string, userId: string) => void;

  // Unread counts (keyed by channelId)
  unread: Record<string, number>;
  setUnread: (channelId: string, count: number) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
}
```

Created with `create<TeamsState>()(devtools(..., { name: "teams-store" }))`.

Exported as `useTeamsStore` from `src/stores/teams-store.ts` and re-exported from `src/stores/index.ts`.

---

## Layer 4: Real-Time Hook

File: `src/hooks/use-channel-realtime.ts`

Mirrors `src/hooks/use-conversation-realtime.ts`, subscribing to `private-channel-{channelId}` and dispatching to `useTeamsStore`.

### Event Handling

| Pusher Event | Action |
|---|---|
| `message:new` (parentId null) | `addMessage(channelId, message)` |
| `message:new` (parentId set, matches active thread) | `addThreadMessage(message)` via `useChatStore` |
| `message:updated` | `updateMessage(channelId, messageId, { content, isEdited, updatedAt })` |
| `message:deleted` | `updateMessage(channelId, messageId, { isDeleted: true, content: "" })` |
| `reaction:added` | rebuild reactions array, `updateMessage(...)` |
| `reaction:removed` | filter reactions array, `updateMessage(...)` |
| `client-typing:start` | `setTyping(channelId, { userId, name, timestamp })` (skip own userId) |
| `client-typing:stop` | `clearTyping(channelId, userId)` (skip own userId) |

The hook uses `usePusherChannel` (same hook used by `useConversationRealtime`) with the channel name `PusherChannels.channel(channelId)`.

Unsubscription is handled automatically by `usePusherChannel` when `channelId` changes or the component unmounts (Requirement 9.7).

---

## Layer 5: UI Components

### 5.1 `TeamsView` — `src/components/dashboard/teams/teams-view.tsx`

Top-level layout. Mirrors `ChatView`.

```tsx
<div className="flex h-full overflow-hidden">
  {/* Left panel */}
  <div className="w-96 shrink-0 border-r border-border h-full overflow-hidden">
    <TeamsPanel currentUserId={currentUserId} />
  </div>

  {/* Center: channel view */}
  <motion.div animate={{ flex: 1 }} className="min-w-0 h-full overflow-hidden">
    <ChannelView />
  </motion.div>

  {/* Right: thread panel (AnimatePresence, same as ChatView) */}
  <AnimatePresence>
    {activeThreadMessageId && activeChannelId && (
      <motion.div
        key="thread-panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 380, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="shrink-0 h-full overflow-hidden"
      >
        <ThreadPanel
          parentMessageId={activeThreadMessageId}
          conversationId={activeChannelId}
        />
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

`activeThreadMessageId` is read from `useChatStore` (thread panel is shared infrastructure).

### 5.2 `TeamsPanel` — `src/components/dashboard/teams/teams-panel.tsx`

Left panel. Width `w-96`. Mirrors `ChatList`.

**Header:**
- Title "Teams" with chevron
- "+" button → opens `CreateTeamModal` (Team Owner only check is done per-team in the row)
- Search input (client-side filter, `useDeferredValue`)

**Team Row (expandable):**
- Emoji avatar (letter initial with deterministic color if no emoji set)
- Team name
- Up to 3 member avatar thumbnails with `PresenceDot` overlays (from `usePresenceStore`)
- "+N" overflow label when members > 3
- Unread indicator dot when any channel in team has unread
- Settings gear icon (visible only to Team Owners)
- "+" add channel button (visible only to Team Owners)
- Framer Motion `height: 0 → auto` expand/collapse with `ease: [0.22, 1, 0.36, 1]`

**Channel Row:**
- `#` prefix for STANDARD/ANNOUNCEMENT, lock icon for PRIVATE
- Channel name
- Unread badge (capped at "99+")
- Active state: `bg-accent` background, primary-colored text
- Settings gear icon (visible only to Team Owners, on hover)

**Loading state:** Skeleton rows (2 team skeletons, each with 2 channel skeletons).

**Empty state:** "No teams yet" with a "Create your first team" button.

**Filtering:** `deferredQuery` filters both team names and channel names. A team row is shown if the team name matches OR any of its channels match; only matching channels are shown when filtering.

### 5.3 `ChannelView` — `src/components/dashboard/teams/channel-view.tsx`

Center panel. Mirrors `ConversationView` closely.

**Top Bar:**
- `#` icon + channel name (bold)
- Channel description or topic (muted, truncated)
- Member count badge
- Search button (opens search drawer — reuse `SearchDrawer` from chat)
- Video call button
- Settings gear → opens `ChannelSettingsModal`
- Tabs: "Posts" | "Files"

**Posts Tab:**
- Pinned messages section (see 5.7)
- Infinite-scroll message list (same sentinel + IntersectionObserver pattern as `ConversationView`)
- Date separators, message grouping (same 5-minute window logic)
- "Beginning of #channel-name" label when `hasMore === false`
- Scroll-to-bottom FAB with unread badge
- Typing indicator bar (same format as chat)
- Message input (see below)

**Message Input:**
- Disabled with read-only notice when channel is ANNOUNCEMENT and user is not Team Owner
- Otherwise identical to `ConversationView` input: textarea, emoji picker, file attachment, @mention autocomplete, send button
- Typing events emitted on `private-channel-{channelId}` using `PusherChannels.channel(channelId)`

**Files Tab:**
- Renders `ChannelFilesTab` component

**Transitions:**
- `AnimatePresence mode="wait"` keyed on `channelId`
- Enter: `opacity: 0, x: 12 → opacity: 1, x: 0`
- Exit: `opacity: 1, x: 0 → opacity: 0, x: -12`
- Duration 0.2s, ease `[0.22, 1, 0.36, 1]`

**Empty state (no channel selected):**
- Centered icon + "Select a channel" prompt

### 5.4 `CreateTeamModal` — `src/components/dashboard/teams/create-team-modal.tsx`

Dialog using `shadcn/ui Dialog`.

**Fields:**
- Team name (required, max 80 chars, inline validation)
- Description (optional, max 280 chars, textarea)
- Privacy toggle (public/private, `Switch` component)
- Member search (combobox, queries `GET /api/workspaces/members?search=`, multi-select chips)

**Submit flow:**
1. `POST /api/workspaces/[workspaceId]/teams` → get `team`
2. For each added member: `POST /api/workspaces/[workspaceId]/teams/[team.id]/members`
3. `addTeam(team)` → TeamsStore
4. `setActiveTeam(team.id)` + `setActiveChannel(team.channels[0].id)`
5. Close modal

**Error handling:** Toast on API failure, modal stays open with form data intact.

**Animation:** Framer Motion scale `0.95 → 1` + opacity `0 → 1` on open, reverse on close.

### 5.5 `TeamSettingsModal` — `src/components/dashboard/teams/team-settings-modal.tsx`

Dialog with two modes: Owner (editable) and Member (read-only).

**Owner mode tabs:**
- **General:** name, description, emoji avatar picker, privacy toggle → `PATCH /api/workspaces/[workspaceId]/teams/[teamId]`
- **Members:** list with presence dots, role badges; "Add Members" combobox → `POST .../members`; "Remove" button → `DELETE .../members/[userId]`; "Delete Team" button → confirmation dialog → `DELETE /api/workspaces/[workspaceId]/teams/[teamId]`

**Member mode:** Read-only display of team info and member list.

**Guard:** Removing the last owner shows an inline error (Requirement 13.8).

### 5.6 `CreateChannelModal` — `src/components/dashboard/teams/create-channel-modal.tsx`

Dialog.

**Fields:**
- Channel name (required, max 80 chars, regex `/^[a-z0-9-]+$/`, inline validation)
- Description (optional, max 280 chars)
- Type selector: Standard / Announcement / Private
  - Announcement option disabled with tooltip if user is not Team Owner

**Submit flow:**
1. `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels`
2. Update team's channels in TeamsStore via `updateTeam(teamId, { channels: [..., newChannel] })`
3. `setActiveChannel(newChannel.id)`
4. Close modal

### 5.7 `ChannelSettingsModal` — `src/components/dashboard/teams/channel-settings-modal.tsx`

Dialog.

**Owner mode:**
- Channel name (max 80 chars)
- Description (max 280 chars)
- Topic (max 120 chars)
- "Archive Channel" button → confirmation → `PATCH .../channels/[channelId]` with `{ isArchived: true }` → `removeTeam` / update team channels in store → navigate away

**Member mode:** Read-only.

### 5.8 `PinnedMessages` — `src/components/dashboard/teams/pinned-messages.tsx`

Collapsible section rendered at the top of the Posts tab when `pinnedMessages.length > 0`.

```tsx
<AnimatePresence>
  {expanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {pinnedMessages.map(msg => <PinnedMessagePreview key={msg.id} msg={msg} />)}
    </motion.div>
  )}
</AnimatePresence>
```

Pinned messages are fetched as part of the channel messages query (filtered by `isPinned: true`) or as a separate query. The message action menu (on hover) shows "Pin" / "Unpin" for Team Owners, calling `PATCH /api/messages/[messageId]` with `{ isPinned: true/false }`.

### 5.9 `ChannelFilesTab` — `src/components/dashboard/teams/channel-files-tab.tsx`

Renders when the "Files" tab is active.

- Fetches `GET /api/channels/[channelId]/files` on mount
- Grid layout: file icon, name, size (formatted), uploader name + avatar, upload date
- Click → `window.open(file.url, "_blank")`
- Empty state: "No files shared yet"
- Loading state: skeleton grid

---

## Layer 6: Integration

### 6.1 Sidebar rename

In `src/components/dashboard/shell.tsx`, change the `topNavItems` entry:

```typescript
// Before:
{ icon: PeopleCommunityRegular, iconFilled: PeopleCommunityFilled, label: "Communities", href: "/dashboard/communities" }

// After:
{ icon: PeopleCommunityRegular, iconFilled: PeopleCommunityFilled, label: "Teams", href: "/dashboard/communities" }
```

Route path unchanged (Requirement 1.2).

### 6.2 Communities page replacement

`src/app/(dashboard)/dashboard/communities/page.tsx` currently renders `<CommunitiesView />`. Replace with `<TeamsView />`.

The `CommunitiesView` component is kept in place (not deleted) to avoid breaking any potential future use; the page simply imports `TeamsView` instead.

### 6.3 Workspace ID resolution

`TeamsView` needs the current workspace ID. The workspace is resolved from the session user's workspace membership. A `GET /api/workspaces` call (already exists) returns the user's workspaces; the first one is used as the active workspace. This matches the pattern used elsewhere in the app.

### 6.4 Stores index export

`src/stores/index.ts` must export `useTeamsStore` alongside `useChatStore` and `usePresenceStore`.

---

## Key Design Decisions

### Reuse over rebuild

`ThreadPanel`, `MessageActions`, `MessageContent`, `MessageAttachments`, `ReactionDisplay`, `InlineEdit`, `ThreadLink`, `SearchDrawer` are all reused directly from the chat system. `ChannelView` passes `channelId` as the `conversationId` prop to `ThreadPanel` — the thread panel is context-agnostic and works for both conversations and channels since messages share the same `parentId` threading model.

### Optimistic updates

Message sending follows the same optimistic pattern as `ConversationView`: build a local `MessageWithAuthor` with a temporary `optimistic-{n}` ID, `addMessage()` immediately, then replace with the server response or roll back on failure.

### Permission checks — client vs server

Client-side: hide "+" add channel button and settings gear for non-owners (UX). Server-side: all mutation routes enforce ownership via `getTeamMemberRole()` (security). Both layers are required.

### Unread count computation

On channel selection: `PATCH /api/channels/[channelId]/members/read` sets `lastReadAt`. Unread count for a channel = messages where `createdAt > lastReadAt AND authorId != currentUserId`. This is computed server-side and returned as `unreadCount` in the teams list response, then maintained client-side via `incrementUnread` on `message:new` Pusher events for non-active channels.

### ANNOUNCEMENT channel enforcement

- Client: input disabled + read-only notice when `channel.type === "ANNOUNCEMENT"` and user is not Team Owner
- Server: `POST /api/channels/[channelId]/messages` returns 403 if ANNOUNCEMENT and requester is not Team Owner

### Private channel visibility

`GET /api/workspaces/[workspaceId]/teams` already filters channels:
```typescript
OR: [
  { type: { not: "PRIVATE" } },
  { members: { some: { userId: session.user.id } } },
]
```
The client renders whatever the API returns — no additional client-side filtering needed.

---

## Correctness Properties

### Property 1: Unread count monotonicity

For any channel C and user U, if U has not read channel C since time T, then `unreadCount(C, U) ≥ 0` and equals the number of messages in C with `createdAt > T` authored by users other than U.

**Validates:** Requirements 20.1, 20.2, 20.3

### Property 2: Message ordering preservation

For any channel C, the sequence of messages returned by `GET /api/channels/[channelId]/messages` with successive cursor values, when concatenated in order, equals the full chronological sequence of top-level messages in C (no duplicates, no gaps, correct order).

**Validates:** Requirements 4.3, 19.1, 19.2, 19.3

### Property 3: Optimistic message idempotency

For any send operation, the final message list contains exactly one copy of the sent message (the server-confirmed version), regardless of whether the optimistic message was added before the server response arrived.

**Validates:** Requirements 5.3, 5.4

### Property 4: Permission enforcement consistency

For any action A restricted to Team Owners, if the server returns 403 for A, then the client UI does not display the control that triggers A for that user. Conversely, if the client displays the control, the server must accept the request (no false positives in either direction).

**Validates:** Requirements 16.1, 16.2, 16.6, 16.7, 16.8

### Property 5: Real-time event completeness

For any message M sent to channel C while user U is subscribed to `private-channel-{C.id}`, U's message list for C will contain M after the Pusher `message:new` event is processed, with no duplicate entries.

**Validates:** Requirements 9.1, 9.2, 9.8
