# Implementation Plan: Teams & Channels

## Overview

Implement the Teams & Channels feature layer-by-layer: schema additions → missing API endpoints → Zustand store → real-time hook → UI components → integration wiring. Each task builds directly on the previous, ending with a fully wired Teams page that replaces the Communities placeholder.

## Tasks

- [x] 1. Schema additions and migration
  - Add `isPinned Boolean @default(false)` to the `Message` model in `prisma/schema.prisma`
  - Add `isArchived Boolean @default(false)` to the `Channel` model in `prisma/schema.prisma`
  - Add `topic String?` to the `Channel` model in `prisma/schema.prisma`
  - Add `lastReadAt DateTime?` to the `ChannelMember` model in `prisma/schema.prisma`
  - Run `npx prisma migrate dev --name add_teams_channels_fields` to generate and apply the migration
  - Extend `updateChannel` in `src/lib/db/teams.ts` to accept `topic` and `isArchived` in its partial update type
  - _Requirements: 7.3, 7.4, 15.2, 15.4, 20.1_

- [x] 2. Missing API endpoints — team members
  - [x] 2.1 Create `POST /api/workspaces/[workspaceId]/teams/[teamId]/members` route
    - File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/members/route.ts`
    - Validate body `{ userId: string, role?: "MEMBER" | "OWNER" }` with zod
    - Require workspace membership; call `addTeamMember(teamId, userId, role)`
    - Return 201 `{ member }` on success
    - _Requirements: 12.7, 13.5_
  - [x] 2.2 Create `DELETE /api/workspaces/[workspaceId]/teams/[teamId]/members/[userId]` route
    - File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/members/[userId]/route.ts`
    - Require Team Owner role OR self-removal
    - Guard: if removing the last owner, return 409 `{ error: "Cannot remove the last team owner" }`
    - Call `removeTeamMember(teamId, userId)` on success
    - _Requirements: 13.6, 13.8, 16.7_

- [x] 3. Missing API endpoints — channel management
  - [x] 3.1 Create `PATCH` and `DELETE` handlers for `/api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]`
    - File: `src/app/api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]/route.ts`
    - PATCH: validate `{ name?, description?, topic?, isArchived? }`, require Team Owner, call `updateChannel(channelId, data)`
    - DELETE: require Team Owner, guard against deleting the last channel (return 409), call `deleteChannel(channelId)`
    - _Requirements: 15.3, 15.4, 16.7_
  - [x] 3.2 Add Team Owner permission check to existing `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels`
    - In `src/app/api/workspaces/[workspaceId]/teams/[teamId]/channels/route.ts`, after workspace membership check, verify the user has `role = "OWNER"` in the team; return 403 if not
    - _Requirements: 16.6_
  - [x] 3.3 Add ANNOUNCEMENT permission check to existing `POST /api/channels/[channelId]/messages`
    - In `src/app/api/channels/[channelId]/messages/route.ts`, after `assertChannelAccess`, check if `channel.type === "ANNOUNCEMENT"` and the user's team role is not `"OWNER"`; return 403 if so
    - _Requirements: 16.8, 5.9_

- [x] 4. Missing API endpoints — channel read receipts and files
  - [x] 4.1 Create `PATCH /api/channels/[channelId]/members/read` route
    - File: `src/app/api/channels/[channelId]/members/read/route.ts`
    - Verify channel team membership via `assertChannelAccess` pattern
    - Upsert `ChannelMember` record setting `lastReadAt = new Date()`
    - Return 200 `{ success: true }`
    - _Requirements: 20.1_
  - [x] 4.2 Create `GET /api/channels/[channelId]/files` route
    - File: `src/app/api/channels/[channelId]/files/route.ts`
    - Verify channel team membership
    - Query `prisma.file.findMany({ where: { channelId }, include: { uploadedBy: { select: { id, name, image } } }, orderBy: { createdAt: "desc" }, take: limit + 1 })`
    - Return `{ files, hasMore, nextCursor }` following the same pagination contract as messages
    - _Requirements: 8.1, 8.2_

- [x] 5. Checkpoint — Ensure all API routes are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Teams Zustand store
  - [x] 6.1 Create `src/stores/teams-store.ts`
    - Mirror the structure of `src/stores/chat-store.ts` exactly
    - State: `teams`, `activeTeamId`, `activeChannelId`, `messages`, `cursors`, `hasMore`, `typing`, `unread`
    - Actions: `setTeams`, `addTeam`, `updateTeam`, `removeTeam`, `setActiveTeam`, `setActiveChannel`, `setMessages`, `prependMessages`, `addMessage`, `updateMessage`, `removeMessage`, `setCursor`, `setHasMore`, `setTyping`, `clearTyping`, `setUnread`, `incrementUnread`, `clearUnread`
    - Use `create<TeamsState>()(devtools(..., { name: "teams-store" }))`
    - Export as `useTeamsStore`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  - [x] 6.2 Write property test for Teams Store — unread count monotonicity
    - **Property 1: Unread count monotonicity**
    - **Validates: Requirements 20.1, 20.2, 20.3**
    - Generate arbitrary sequences of `incrementUnread` and `clearUnread` calls; verify count never goes negative and `clearUnread` always resets to zero
  - [x] 6.3 Write property test for Teams Store — optimistic message idempotency
    - **Property 3: Optimistic message idempotency**
    - **Validates: Requirements 5.3, 5.4**
    - Simulate `addMessage(optimisticId)` → `removeMessage(optimisticId)` → `addMessage(realId)` with arbitrary message payloads; verify the final list contains exactly one message with the real ID and no optimistic remnants
  - [x] 6.4 Export `useTeamsStore` from `src/stores/index.ts`
    - Add `export * from "./teams-store"` to `src/stores/index.ts`
    - _Requirements: 11.8_

- [x] 7. Real-time hook
  - [x] 7.1 Create `src/hooks/use-channel-realtime.ts`
    - Mirror `src/hooks/use-conversation-realtime.ts`
    - Subscribe to `PusherChannels.channel(channelId)` using `usePusherChannel`
    - Handle `message:new` (top-level → `useTeamsStore.addMessage`; thread reply → `useChatStore.addThreadMessage`)
    - Handle `message:updated` → `useTeamsStore.updateMessage`
    - Handle `message:deleted` → `useTeamsStore.updateMessage({ isDeleted: true, content: "" })`
    - Handle `reaction:added` / `reaction:removed` → rebuild reactions array, `useTeamsStore.updateMessage`
    - Handle `client-typing:start` / `client-typing:stop` → `useTeamsStore.setTyping` / `clearTyping` (skip own userId)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.3, 10.4, 10.5, 10.6_
  - [x] 7.2 Write property test for real-time event completeness
    - **Property 5: Real-time event completeness**
    - **Validates: Requirements 9.1, 9.2, 9.8**
    - Generate arbitrary sequences of `message:new` events with unique IDs; verify the store's message list for the channel contains exactly one entry per unique message ID with no duplicates

- [x] 8. Checkpoint — Ensure store and hook are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. TeamsPanel component
  - [x] 9.1 Create `src/components/dashboard/teams/teams-panel.tsx`
    - Width `w-96`, mirrors `ChatList` structure
    - Header: "Teams" title, "+" button (opens `CreateTeamModal`), search input with `useDeferredValue`
    - Fetch teams on mount: `GET /api/workspaces/[workspaceId]/teams` → `useTeamsStore.setTeams`
    - Render `TeamRow` for each team (expandable with Framer Motion `height: 0 → auto`, ease `[0.22, 1, 0.36, 1]`)
    - Each `TeamRow`: emoji/letter avatar, team name, up to 3 member avatars with `PresenceDot` from `usePresenceStore`, "+N" overflow, unread dot, settings gear (Team Owner only), "+" add channel button (Team Owner only)
    - Each `ChannelRow`: `#` or lock icon, channel name, unread badge (capped "99+"), active state `bg-accent`
    - Loading: skeleton rows; Empty: "No teams yet" prompt
    - Client-side filter: show team if name matches OR any channel name matches; show only matching channels when filtering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.2, 3.3, 16.1, 16.2, 16.4, 17.1, 17.2, 17.3, 18.1, 18.3_
  - [x] 9.2 Implement channel selection logic in `TeamsPanel`
    - On channel row click: `useTeamsStore.setActiveTeam(teamId)` + `useTeamsStore.setActiveChannel(channelId)`
    - Auto-expand parent team row when active channel changes (Requirement 3.3)
    - Clear unread for previously active channel on selection change (Requirement 3.4)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [-] 10. ChannelView component
  - [x] 10.1 Create `src/components/dashboard/teams/channel-view.tsx`
    - Mirror `ConversationView` structure: top bar, scrollable message area, input area
    - Top bar: `#` icon + channel name, description/topic (muted), member count, search button, video button, settings gear → `ChannelSettingsModal`, tabs "Posts" | "Files"
    - Empty state (no channel selected): centered icon + "Select a channel"
    - `AnimatePresence mode="wait"` keyed on `channelId`; enter `opacity:0,x:12→1,0`; exit `opacity:1,x:0→0,-12`; duration 0.2s, ease `[0.22, 1, 0.36, 1]`
    - _Requirements: 4.1, 4.2, 18.2, 18.4, 18.6, 18.7, 18.8_
  - [x] 10.2 Implement message loading and infinite scroll in `ChannelView`
    - On channel selection: fetch `GET /api/channels/[channelId]/messages?limit=50` → `setMessages` + `setCursor` + `setHasMore`
    - Call `PATCH /api/channels/[channelId]/members/read` + `clearUnread(channelId)` after load
    - IntersectionObserver sentinel at top of list; when intersecting and `hasMore`, fetch next page with cursor, `prependMessages`, restore scroll position
    - Show "Beginning of #channel-name" label when `hasMore === false`
    - Skeleton loading state; empty state "Be the first to post"
    - _Requirements: 4.3, 4.4, 4.8, 4.9, 19.1, 19.2, 19.3, 19.4, 19.5, 20.1_
  - [x] 10.3 Implement message rendering in `ChannelView`
    - Reuse `MessageContent`, `MessageActions`, `InlineEdit`, `ReactionDisplay`, `ThreadLink`, `MessageAttachments`, `LinkPreviewCard` from `src/components/dashboard/chat/`
    - Group consecutive messages from same author within 5-minute window (show avatar + name only on first)
    - Date separators between different calendar days
    - Auto-scroll to bottom when new message arrives and user is within 100px of bottom
    - Scroll-to-bottom FAB with unread badge when user is not near bottom
    - _Requirements: 4.5, 4.6, 4.7, 4.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [x] 10.4 Implement message input in `ChannelView`
    - Textarea with auto-resize, emoji picker (dynamic import), file attachment (25 MB limit), @mention autocomplete (`GET /api/workspaces/members?search=`), send button
    - Enter sends, Shift+Enter inserts newline
    - Optimistic message: build `MessageWithAuthor` with `optimistic-{n}` ID, `addMessage()`, replace with server response or roll back on failure
    - Typing events: emit `client-typing:start` on `private-channel-{channelId}` throttled to once per 2s; emit `client-typing:stop` after 2s of no input
    - Disable input + show read-only notice when channel is ANNOUNCEMENT and user is not Team Owner
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 10.1, 10.2_
  - [x] 10.5 Wire `useChannelRealtime` into `ChannelView`
    - Call `useChannelRealtime(channelId, currentUserId)` when a channel is active
    - Display typing indicator bar below message list using `useTeamsStore` typing state
    - Auto-expire typing indicators after 5 seconds (same `typingExpireTimers` pattern as `ConversationView`)
    - _Requirements: 9.1, 9.7, 10.3, 10.4, 10.5, 10.6_

- [ ] 11. PinnedMessages and ChannelFilesTab components
  - [x] 11.1 Create `src/components/dashboard/teams/pinned-messages.tsx`
    - Accept `messages: MessageWithAuthor[]` prop
    - Collapsible header "📌 Pinned (N)" with chevron; toggle with Framer Motion `height: 0 → auto`
    - Each pinned message: author avatar, name, content preview (truncated), timestamp
    - Only render when `messages.length > 0`
    - _Requirements: 7.1, 7.2_
  - [x] 11.2 Add pin/unpin to message action menu in `ChannelView`
    - In the message hover action toolbar, show "Pin" option for Team Owners on unpinned messages
    - Show "Unpin" option for Team Owners on pinned messages
    - Call `PATCH /api/messages/[messageId]` with `{ isPinned: true/false }` (extend the existing messages PATCH route to accept `isPinned`)
    - Update message in store via `updateMessage(channelId, messageId, { isPinned })`
    - _Requirements: 7.3, 7.4_
  - [x] 11.3 Create `src/components/dashboard/teams/channel-files-tab.tsx`
    - Fetch `GET /api/channels/[channelId]/files` on mount
    - Grid layout: file icon (by mimeType), name, formatted size, uploader name + avatar, upload date
    - Click → `window.open(file.url, "_blank")`
    - Loading skeleton; empty state "No files shared yet"
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Modals — Create Team and Create Channel
  - [x] 12.1 Create `src/components/dashboard/teams/create-team-modal.tsx`
    - `shadcn/ui Dialog` with Framer Motion scale+opacity animation
    - Fields: team name (required, max 80, inline validation), description (optional, max 280), privacy `Switch`, member search combobox (queries `GET /api/workspaces/members?search=`, multi-select chips)
    - Submit: `POST /api/workspaces/[workspaceId]/teams` → for each member `POST .../members` → `addTeam()` → `setActiveTeam` + `setActiveChannel(generalChannel.id)` → close
    - Error: toast on failure, modal stays open
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  - [x] 12.2 Create `src/components/dashboard/teams/create-channel-modal.tsx`
    - Fields: channel name (required, max 80, regex `/^[a-z0-9-]+$/`, inline validation), description (optional, max 280), type selector (Standard / Announcement / Private; Announcement disabled with tooltip for non-owners)
    - Submit: `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels` → update team channels in store → `setActiveChannel(newChannel.id)` → close
    - Error: toast on failure, modal stays open
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 13. Modals — Team Settings and Channel Settings
  - [x] 13.1 Create `src/components/dashboard/teams/team-settings-modal.tsx`
    - Two modes: Owner (editable tabs) and Member (read-only)
    - Owner tabs: General (name, description, emoji avatar, privacy → `PATCH .../teams/[teamId]`) and Members (list with presence dots + roles; "Add Members" combobox → `POST .../members`; "Remove" → `DELETE .../members/[userId]`; "Delete Team" → confirmation → `DELETE .../teams/[teamId]` → `removeTeam()` → navigate away)
    - Guard: show inline error if removing last owner
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_
  - [x] 13.2 Create `src/components/dashboard/teams/channel-settings-modal.tsx`
    - Two modes: Owner (editable) and Member (read-only)
    - Owner fields: name (max 80), description (max 280), topic (max 120)
    - Save → `PATCH /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]` → update channel in store
    - "Archive Channel" → confirmation → `PATCH .../channels/[channelId]` with `{ isArchived: true }` → update store → navigate away from channel
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 14. Checkpoint — Ensure all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. TeamsView and integration wiring
  - [x] 15.1 Create `src/components/dashboard/teams/teams-view.tsx`
    - Top-level layout: `TeamsPanel` (w-96, left) + `ChannelView` (flex-1, center) + `ThreadPanel` (w-[380px], right, `AnimatePresence`)
    - Read `activeThreadMessageId` from `useChatStore` (thread panel is shared)
    - Read `activeChannelId` from `useTeamsStore`
    - Pass `activeChannelId` as `conversationId` to `ThreadPanel`
    - Transition: `motion.div animate={{ flex: 1 }}` on center panel, same as `ChatView`
    - _Requirements: 18.2, 18.4_
  - [x] 15.2 Replace `CommunitiesView` with `TeamsView` in the communities page
    - In `src/app/(dashboard)/dashboard/communities/page.tsx`, import and render `<TeamsView />` instead of `<CommunitiesView />`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 15.3 Rename "Communities" to "Teams" in the sidebar
    - In `src/components/dashboard/shell.tsx`, change the `label` field of the `PeopleCommunityRegular` nav item from `"Communities"` to `"Teams"`
    - Keep `href: "/dashboard/communities"` unchanged
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The `ThreadPanel` component is reused as-is from the chat system — no modifications needed
- `MessageActions`, `MessageContent`, `ReactionDisplay`, `InlineEdit`, `ThreadLink`, `MessageAttachments` are all reused from `src/components/dashboard/chat/`
- The `usePresenceStore` is shared between chat and teams — no duplication needed
- Workspace ID is resolved from `GET /api/workspaces` (first workspace) in `TeamsView`
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
