# Implementation Plan: Chat System

## Overview

Replace all mock data in the existing chat UI shells with live data, wire up Pusher real-time events, and implement the full set of interactive messaging capabilities. Work proceeds layer-by-layer: API routes → Zustand store enhancements → UI components, so each step builds on a stable foundation.

The codebase already has: Prisma models and DB helpers (`src/lib/db/messages.ts`), scaffolded API routes, a typed Pusher event system, and UI shells with mock data. Tasks focus exclusively on filling in the gaps.

---

## Tasks

- [x] 1. Extend shared types and add missing API endpoints
  - [x] 1.1 Extend `ConversationWithDetails` and `GET /api/conversations` response to include `unreadCount` per conversation
    - In `src/lib/db/messages.ts`, update `getConversationsForUser` to compute `unreadCount` for each conversation using `getUnreadCount` (already implemented)
    - Map the `messages` array to `lastMessage` in the returned shape so it matches `ConversationWithDetails`
    - _Requirements: 1.1, 1.4, 17.1_

  - [x] 1.2 Add `isPinned` field to `ConversationMember` and expose it in the API
    - Add `isPinned Boolean @default(false)` to the `ConversationMember` model in `prisma/schema.prisma`
    - Run `prisma migrate dev` to apply the migration
    - Update `getConversationsForUser` to include `isPinned` in the member select
    - Update `ConversationMemberWithUser` type in `src/types/db.ts` to include `isPinned`
    - _Requirements: 1.6_

  - [x] 1.3 Add `GET /api/conversations/[conversationId]/messages` search and thread support
    - In `src/app/api/conversations/[conversationId]/messages/route.ts`, read `search` and `parentId` query params
    - When `search` is present, add a `content: { contains: search, mode: "insensitive" }` filter to the Prisma query
    - When `parentId` is present, call `getThreadReplies(parentId)` from `src/lib/db/messages.ts` instead of the paginated query
    - When `hasAttachment=true` is present, filter to messages that have at least one `MessageAttachment`
    - _Requirements: 12.3, 16.2, 16.6_

  - [x] 1.4 Add `POST /api/conversations/[conversationId]/messages` attachment support
    - Extend the `sendSchema` in the messages route to accept an optional `attachments` array: `{ fileName, fileUrl, fileSize, mimeType }[]`
    - After creating the message, create `MessageAttachment` records in a single `prisma.messageAttachment.createMany` call
    - _Requirements: 15.2_

  - [x] 1.5 Add `PATCH /api/conversations/[conversationId]/members/read` endpoint for marking as read
    - Create `src/app/api/conversations/[conversationId]/members/read/route.ts` with a `PATCH` handler
    - Call `markConversationAsRead(conversationId, session.user.id)` and return `{ success: true }`
    - _Requirements: 4.8, 17.2_

  - [x] 1.6 Add `GET /api/workspaces/members` endpoint for @mention autocomplete and new conversation modal
    - Create `src/app/api/workspaces/members/route.ts` with a `GET` handler
    - Accept a `search` query param; return workspace members whose `name` matches (case-insensitive), limited to 20 results
    - Include `id`, `name`, `image` fields only
    - _Requirements: 13.10, 19.2_

- [x] 2. Checkpoint — Verify API layer
  - Ensure all new routes return correct shapes and the Prisma migration applied cleanly. Ask the user if questions arise.

- [x] 3. Enhance `useChatStore` and add a `usePusherChannel` hook
  - [x] 3.1 Add `activeThreadMessageId` state to `useChatStore`
    - Add `activeThreadMessageId: string | null` and `setActiveThreadMessage: (id: string | null) => void` to `src/stores/chat-store.ts`
    - _Requirements: 12.2_

  - [x] 3.2 Add `highlightedMessageId` state to `useChatStore` for search jump-to
    - Add `highlightedMessageId: string | null` and `setHighlightedMessage: (id: string | null) => void`
    - _Requirements: 16.4_

  - [x] 3.3 Create `src/hooks/use-pusher-channel.ts`
    - Export `usePusherChannel(channelName: string)` that subscribes on mount and unsubscribes on unmount using `pusherClient`
    - Return the bound Pusher `Channel` object so callers can `.bind()` events
    - _Requirements: 6.1, 2.1_

  - [x] 3.4 Create `src/hooks/use-conversation-realtime.ts`
    - Accept `conversationId` and `currentUserId`
    - Use `usePusherChannel` to subscribe to `private-conversation-{conversationId}`
    - Bind `message:new` → `addMessage`, `message:updated` → `updateMessage`, `message:deleted` → `updateMessage({ isDeleted: true, content: "" })`
    - Bind `reaction:added` and `reaction:removed` → update the matching message's `reactions` array in the store
    - Bind `client-typing:start` → `setTyping`, `client-typing:stop` → `clearTyping`
    - _Requirements: 6.2, 6.6, 6.7, 11.7, 14.3_

- [x] 4. Implement the Conversation List (`chat-list.tsx`)
  - [x] 4.1 Replace mock data with live data from `GET /api/conversations`
    - On mount, fetch conversations and call `useChatStore.setConversations`
    - Show a skeleton loading state (3–5 placeholder rows) while fetching
    - Show an inline error message with a retry button on failure
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Derive display name, avatar, and last message preview from `ConversationWithDetails`
    - For `DIRECT` conversations, display the other member's `user.name` and `user.image`; fall back to initials with a deterministic color derived from the user ID
    - For `GROUP` conversations, display a comma-joined list of member names (truncated to 3 + count)
    - Format `lastMessage.createdAt` with `date-fns` (`formatDistanceToNow` for < 24 h, `format("MMM d")` otherwise)
    - _Requirements: 1.4, 1.5_

  - [x] 4.3 Render three collapsible sections: Pinned, Direct Messages, Group Chats
    - Filter `useChatStore.conversations` into three buckets using `isPinned`, `type === "DIRECT"`, and `type === "GROUP"`
    - Reuse the existing `Section` component; animate open/close with Framer Motion (already wired)
    - _Requirements: 1.6, 1.7_

  - [x] 4.4 Render unread badge and bold styling on conversation rows
    - Read `useChatStore.unread[conversation.id]`; show badge when `> 0`, display "99+" when `> 99`
    - Apply `font-bold` to name and preview when unread
    - _Requirements: 1.4, 17.4, 17.5_

  - [x] 4.5 Add search/filter input at the top of the panel
    - Add a controlled text input above the sections
    - Filter `useChatStore.conversations` client-side within 150 ms of the last keystroke (use `useDeferredValue` or a debounce)
    - Show an empty state message when no conversations match
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.6 Wire compose button to open New Conversation modal
    - The existing `SquarePen` button in the header should set a local `showNewConversation` state
    - Render the `NewConversationModal` component (created in task 9) conditionally
    - _Requirements: 19.1_

  - [x] 4.7 Add presence dots to conversation row avatars
    - Read presence from `usePresenceStore` by the other member's `userId`
    - Render a colored dot: green for `AVAILABLE`, yellow for `BUSY`/`BE_RIGHT_BACK`, orange for `AWAY`, red for `DO_NOT_DISTURB`, grey for `OFFLINE`
    - _Requirements: 18.1, 18.4_

  - [x] 4.8 Add ARIA roles for accessibility
    - Add `role="listbox"` to the scrollable conversation container
    - Add `role="option"` and `aria-selected={selected}` to each `ChatRow` button
    - _Requirements: 20.1_

- [x] 5. Implement the Conversation View — message history and real-time
  - [x] 5.1 Load messages on conversation selection
    - When `activeConversationId` changes, fetch from `GET /api/conversations/{id}/messages` and call `setMessages` / `setCursor` / `setHasMore`
    - Show a skeleton loading state on first load; clear it when messages arrive
    - Call `PATCH /api/conversations/{id}/members/read` and `clearUnread(id)` after loading
    - _Requirements: 4.1, 4.2, 4.8, 17.2_

  - [x] 5.2 Render messages with date separators and author grouping
    - Group `useChatStore.messages[conversationId]` by calendar date; insert a `DateSeparator` element between groups ("Today", "Yesterday", or `format(date, "MMMM d, yyyy")`)
    - Within each date group, collapse consecutive messages from the same author sent within 5 minutes: show avatar + name only on the first message of each group
    - Render `isDeleted` messages as italic "This message was deleted" placeholder
    - Render `isEdited` messages with a trailing "(edited)" label in `text-muted-foreground`
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 5.3 Implement infinite scroll pagination
    - Attach an `IntersectionObserver` to a sentinel element at the top of the message list
    - When the sentinel enters the viewport and `hasMore[conversationId]` is true, fetch the next page using the stored cursor and call `prependMessages`
    - Show a spinner at the top while loading; preserve scroll position by saving `scrollHeight` before prepend and restoring after
    - Show "Beginning of conversation" label when `hasMore` is false
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.4 Wire real-time events using `use-conversation-realtime` hook
    - Call `useConversationRealtime(conversationId, currentUserId)` inside `ConversationView`
    - Auto-scroll to bottom when a new message arrives and the user is within 100 px of the bottom
    - Show a "New message ↓" button when a message arrives and the user is scrolled more than 100 px above the bottom; clicking it smooth-scrolls to bottom
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.5 Add presence indicator in the top bar for DM conversations
    - For `DIRECT` conversations, read the other member's presence from `usePresenceStore` and render a colored dot next to their name using the same color scheme as task 4.7
    - _Requirements: 18.2, 18.3_

  - [x] 5.6 Add ARIA roles to the message list and input
    - Add `role="log"` and `aria-live="polite"` to the scrollable message container
    - Add `aria-label={`Message ${conversationName}`}` to the message input
    - _Requirements: 20.2, 20.4_

- [x] 6. Implement message formatting renderer
  - [x] 6.1 Create `src/components/dashboard/chat/message-content.tsx`
    - Accept `content: string` and `currentUserId: string` props
    - Parse and render `**bold**`, `*italic*`, `_italic_` using regex replacements to `<strong>` / `<em>`
    - Render `` `inline code` `` as `<code>` with `font-mono bg-muted px-1 rounded`
    - Render triple-backtick fenced blocks as `<pre><code>` with a copy-to-clipboard button (use `navigator.clipboard.writeText`)
    - Detect URLs and render as `<a target="_blank" rel="noopener noreferrer">`
    - Render `@username` tokens: highlight with `text-primary font-medium` when the username matches the current user's name, otherwise `bg-muted text-foreground rounded px-0.5`
    - When content is 1–3 emoji characters with no other text, render at `text-5xl` without a bubble background
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 6.2 Replace raw text rendering in `ConversationView` with `<MessageContent>`
    - Swap the plain text render in each message bubble for `<MessageContent content={msg.content} currentUserId={session.user.id} />`
    - _Requirements: 7.1–7.6_

- [x] 7. Implement message action toolbar (edit, delete, reactions, reply)
  - [x] 7.1 Create `src/components/dashboard/chat/message-actions.tsx`
    - Render a floating toolbar that appears on message hover (use `group-hover:opacity-100` pattern already in the shell)
    - Include: Reaction picker button (Smile icon), Reply button, Edit button (own messages only), Delete button (own messages only)
    - Add `aria-label` to every icon button
    - Make the toolbar keyboard-accessible: Tab to focus the message row, arrow keys to navigate toolbar buttons
    - _Requirements: 9.1, 10.1, 11.1, 12.1, 20.3, 20.5_

  - [x] 7.2 Implement inline edit
    - When Edit is clicked, replace the message bubble with a `<textarea>` pre-filled with `message.content`
    - Enter (without Shift) submits; Escape cancels
    - On submit, optimistically call `updateMessage` in the store, then `PATCH /api/messages/{messageId}`
    - On API failure, revert the optimistic update and show a `toast.error`
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 7.3 Implement delete with confirmation dialog
    - When Delete is clicked, open a shadcn/ui `AlertDialog` asking for confirmation
    - On confirm, optimistically call `updateMessage(id, { isDeleted: true, content: "" })`, then `DELETE /api/messages/{messageId}`
    - On API failure, revert and show a `toast.error`
    - _Requirements: 10.2, 10.3, 10.4, 10.5_

  - [x] 7.4 Implement emoji reaction picker and reaction display
    - When the Smile button is clicked, open the `@emoji-mart/react` Picker in a popover
    - On emoji select, call `POST /api/messages/{messageId}/reactions` and optimistically update the message's `reactions` array in the store
    - Render grouped reaction counts below the message bubble; clicking an existing reaction you own toggles it off
    - Show a tooltip on reaction group hover listing the names of reactors (use shadcn/ui `Tooltip`)
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 7.5 Render "N replies" thread link below messages with replies
    - Read `message._count.replies`; when `> 0`, render a clickable "N repl{y|ies}" link below the bubble
    - Clicking it sets `useChatStore.setActiveThreadMessage(message.id)`
    - _Requirements: 12.7_

- [x] 8. Implement the message input bar
  - [x] 8.1 Replace the `<input>` with a `<textarea>` supporting multi-line entry
    - Auto-resize the textarea as content grows (use `onInput` to set `height = scrollHeight`)
    - Enter sends; Shift+Enter inserts newline
    - Disable the send button when input is empty or whitespace-only
    - On send, optimistically append the message to the store, call `POST /api/conversations/{id}/messages`, and clear the input
    - On API failure, remove the optimistic message, restore input content, and show `toast.error`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 8.2 Wire the emoji picker button to insert at cursor position
    - The Smile button already toggles the picker; on emoji select, insert `emoji.native` at `textarea.selectionStart` and restore focus
    - _Requirements: 13.8_

  - [x] 8.3 Implement file attachment selection and preview
    - Wire the Paperclip button to a hidden `<input type="file">` (accept all types, max 25 MB client-side check)
    - Show a preview strip above the input: image thumbnail for images, filename + formatted size for other types
    - Allow removing the pending attachment before sending
    - On send, upload the file to the configured storage provider (use `fetch` with `FormData` to `POST /api/upload` — create this route if it doesn't exist, storing to the `File` model)
    - Include the resulting attachment data in the message creation request
    - On upload failure, show `toast.error` and retain the preview for retry
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 8.4 Implement @mention autocomplete dropdown
    - When the user types `@` followed by ≥ 1 character, fetch `GET /api/workspaces/members?search={prefix}`
    - Render a dropdown list of matching members above the input
    - Selecting a member inserts `@username` at the cursor and closes the dropdown
    - _Requirements: 13.10_

  - [x] 8.5 Implement typing indicators
    - On textarea `input` event, emit `client-typing:start` on the active Pusher channel, debounced to fire at most once every 2 seconds
    - After 2 seconds of no input or on message send, emit `client-typing:stop`
    - Read `useChatStore.typing[conversationId]`, filter out the current user, and render "[Name] is typing…" / "[N1] and [N2] are typing…" / "[N] people are typing…" below the input
    - Auto-expire typing indicators after 5 seconds using a `setTimeout` that calls `clearTyping`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 9. Implement the Thread Panel
  - [x] 9.1 Create `src/components/dashboard/chat/thread-panel.tsx`
    - Accept `parentMessageId: string | null` and `conversationId: string` props
    - When `parentMessageId` is non-null, fetch thread replies from `GET /api/conversations/{id}/messages?parentId={parentMessageId}`
    - Render the parent message at the top (read from `useChatStore.messages[conversationId]`), then the replies list
    - Include a message input at the bottom that posts with `parentId` set
    - Show a close button that calls `setActiveThreadMessage(null)`
    - _Requirements: 12.3, 12.4, 12.5_

  - [x] 9.2 Wire thread panel into `chat-view.tsx`
    - Read `useChatStore.activeThreadMessageId`; when non-null, render `<ThreadPanel>` as a flex sibling (same pattern as the existing `SearchDrawer` slide-in)
    - When the Thread Panel is open and the user opens Search, close the thread panel first (`setActiveThreadMessage(null)`)
    - _Requirements: 12.2, 12.8_

  - [x] 9.3 Append real-time thread replies
    - In `use-conversation-realtime.ts`, when a `message:new` event arrives with a `parentId` matching `activeThreadMessageId`, also append it to a separate `threadMessages` slice in the store (add `threadMessages: MessageWithAuthor[]`, `setThreadMessages`, `addThreadMessage` to `useChatStore`)
    - _Requirements: 12.6_

- [x] 10. Implement the Search Drawer
  - [x] 10.1 Wire `SearchDrawer` to the real search API
    - Replace the client-side filter in `search-drawer.tsx` with a debounced call to `GET /api/conversations/{id}/messages?search={query}` (fire when query ≥ 2 characters)
    - Populate results from the API response; show "No results found" empty state when the array is empty
    - _Requirements: 16.2, 16.7_

  - [x] 10.2 Wire the "Has attachment" filter chip
    - When active, append `&hasAttachment=true` to the search request
    - _Requirements: 16.6_

  - [x] 10.3 Implement jump-to-message on result click
    - When a result is clicked, call `useChatStore.setHighlightedMessage(messageId)`
    - In `ConversationView`, watch `highlightedMessageId`; scroll the matching message element into view with `scrollIntoView({ behavior: "smooth", block: "center" })` and apply a brief highlight animation (e.g. `bg-primary/10` for 2 seconds via a CSS transition)
    - Clear `highlightedMessageId` after the animation
    - _Requirements: 16.4, 16.5_

- [x] 11. Implement New Conversation modal
  - [x] 11.1 Create `src/components/dashboard/chat/new-conversation-modal.tsx`
    - Use shadcn/ui `Dialog`; include a member search input that calls `GET /api/workspaces/members?search={query}`
    - Render a list of matching members with checkboxes; allow selecting one (DM) or multiple (group)
    - Show selected members as removable chips
    - On confirm with one member, call `POST /api/conversations` with `type: "DIRECT"` and navigate to the returned conversation
    - On confirm with multiple members, call `POST /api/conversations` with `type: "GROUP"` and navigate
    - If the API returns an existing conversation (idempotent DM), navigate to it without creating a duplicate
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [~] 12. Implement link previews
  - [x] 12.1 Create `src/app/api/messages/[messageId]/link-preview/route.ts`
    - `POST` handler: extract the first URL from the message content, fetch Open Graph metadata server-side (use `fetch` with a 3-second `AbortSignal.timeout`), parse `og:title`, `og:description`, `og:image`, and the domain
    - Store the result as a JSON string in a new `linkPreview String?` field on the `Message` model (add to schema and migrate)
    - Return `{ linkPreview }` or `{}` on failure (silently)
    - _Requirements: 8.1, 8.3_

  - [x] 12.2 Render link preview cards in `ConversationView`
    - After the message bubble, if `message.linkPreview` is set, render a card with title, description (2-line clamp), domain, and thumbnail image
    - _Requirements: 8.2, 8.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure the app builds without TypeScript errors (`next build`), all Prisma migrations are applied, and the full chat flow works end-to-end. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The API routes, DB helpers, Pusher publish functions, and Zustand store actions are already scaffolded — tasks fill in the UI and wire the layers together
- File uploads (task 8.3) require a storage provider to be configured; the task creates the `/api/upload` route but the storage backend (e.g. S3, Cloudflare R2) must be set up separately
- The `ConversationMember.isPinned` migration in task 1.2 must be applied before task 4.3 can be tested
