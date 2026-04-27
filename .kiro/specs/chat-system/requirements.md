# Requirements Document

## Introduction

The Chat System is the core real-time messaging feature of Delix, a Microsoft Teams-style collaboration platform. It provides a three-panel layout: a Conversation List (left), a Conversation View (center), and contextual side panels (Thread Panel and Search Drawer, right). The system replaces all mock data in the existing UI shells with live data from the PostgreSQL database, wires up Pusher for real-time delivery, and adds the full set of interactive messaging capabilities expected of a production-grade chat product.

The feature builds on existing infrastructure: Prisma models (`Message`, `Conversation`, `ConversationMember`, `MessageReaction`, `MessageAttachment`), typed API routes under `/api/conversations` and `/api/messages`, a Zustand `useChatStore`, and a typed Pusher event system in `src/lib/pusher/events.ts`.

## Glossary

- **Chat_System**: The complete chat feature composed of the Conversation List, Conversation View, Thread Panel, and Search Drawer.
- **Conversation_List**: The left-panel component (`chat-list.tsx`) that displays all conversations for the authenticated user.
- **Conversation_View**: The center-panel component (`conversation-view.tsx`) that renders the message history and input for the active conversation.
- **Thread_Panel**: The right-panel component that slides in to display and compose replies to a specific message.
- **Search_Drawer**: The right-panel component that searches messages within the active conversation.
- **Message**: A single chat entry stored in the `message` table, belonging to either a `Conversation` or a `Channel`.
- **Thread**: A set of `Message` records sharing the same `parentId`, representing replies to a parent message.
- **Reaction**: A `MessageReaction` record linking a user, a message, and an emoji.
- **Typing_Indicator**: A transient Pusher client-event (`client-typing:start` / `client-typing:stop`) that signals a user is composing a message.
- **Unread_Count**: The number of messages in a conversation created after the authenticated user's `ConversationMember.lastReadAt` timestamp.
- **Cursor**: An opaque message ID used for keyset pagination when loading older messages.
- **Active_Conversation**: The conversation whose ID matches `useChatStore.activeConversationId`.
- **Soft_Delete**: Setting `Message.isDeleted = true` and clearing `Message.content`, preserving the record in the database.
- **Link_Preview**: Metadata (title, description, image, domain) fetched server-side for URLs detected in message content.
- **Mention**: An `@username` token embedded in message content that references another workspace member.
- **Authenticated_User**: The currently signed-in user as resolved by Better Auth.
- **Pusher_Channel**: A Pusher channel scoped to a conversation (`private-conversation-{id}`) or user (`private-user-{id}`).

---

## Requirements

### Requirement 1: Conversation List — Data Loading

**User Story:** As an authenticated user, I want to see all my real conversations in the left panel, so that I can navigate to any conversation without relying on mock data.

#### Acceptance Criteria

1. WHEN the Conversation_List mounts, THE Chat_System SHALL fetch all conversations for the Authenticated_User from `GET /api/conversations` and populate `useChatStore.conversations`.
2. WHEN the fetch is in progress, THE Conversation_List SHALL display a skeleton loading state in place of conversation rows.
3. IF the fetch fails, THEN THE Conversation_List SHALL display an inline error message with a retry button.
4. THE Conversation_List SHALL render each conversation with: the other participant's name (DM) or group name, avatar or initials with a fallback color, last message preview text (truncated to one line), relative timestamp of the last message, and unread count badge when `unread > 0`.
5. THE Conversation_List SHALL sort conversations by `Conversation.updatedAt` descending so the most recently active conversation appears first.
6. THE Conversation_List SHALL render conversations in three collapsible sections: "Pinned" (conversations where `ConversationMember.isPinned = true`), "Direct Messages" (type `DIRECT`), and "Group Chats" (type `GROUP`).
7. WHEN a section header is clicked, THE Conversation_List SHALL animate the section open or closed using Framer Motion.

---

### Requirement 2: Conversation List — Real-Time Updates

**User Story:** As an authenticated user, I want the conversation list to update instantly when new messages arrive, so that I always see the latest activity without refreshing.

#### Acceptance Criteria

1. WHEN the Authenticated_User is authenticated, THE Chat_System SHALL subscribe to the Pusher channel `private-user-{userId}` to receive conversation-level events.
2. WHEN a `conversation:new` event is received, THE Conversation_List SHALL prepend the new conversation to `useChatStore.conversations` without a full refetch.
3. WHEN a `message:new` event is received for a conversation that is not the Active_Conversation, THE Conversation_List SHALL increment the unread badge for that conversation by 1 via `useChatStore.incrementUnread`.
4. WHEN a `message:new` event is received, THE Conversation_List SHALL update the last message preview and timestamp for the affected conversation and re-sort the list.
5. WHILE the Authenticated_User has the Active_Conversation open, THE Chat_System SHALL NOT increment the unread count for that conversation.

---

### Requirement 3: Conversation List — Search and Filter

**User Story:** As an authenticated user, I want to filter my conversation list by name or recent message content, so that I can quickly find a specific conversation.

#### Acceptance Criteria

1. THE Conversation_List SHALL render a search input at the top of the panel.
2. WHEN the user types in the search input, THE Conversation_List SHALL filter the displayed conversations to those whose name or last message preview contains the query string (case-insensitive), within 150ms of the last keystroke.
3. WHEN the search input is empty, THE Conversation_List SHALL display all conversations in their default sorted order.
4. WHEN no conversations match the query, THE Conversation_List SHALL display an empty state message.

---

### Requirement 4: Conversation View — Message History

**User Story:** As an authenticated user, I want to read the full message history of a conversation, so that I have context for ongoing discussions.

#### Acceptance Criteria

1. WHEN an Authenticated_User selects a conversation, THE Conversation_View SHALL fetch the 50 most recent messages from `GET /api/conversations/{conversationId}/messages` and store them in `useChatStore.messages[conversationId]`.
2. WHEN messages are loading for the first time, THE Conversation_View SHALL display a skeleton loading state.
3. THE Conversation_View SHALL group messages by calendar date, rendering a date separator label ("Today", "Yesterday", or a formatted date string) between groups.
4. THE Conversation_View SHALL group consecutive messages from the same author sent within 5 minutes of each other, showing the author avatar and name only on the first message of each group.
5. WHEN a deleted message is encountered (`Message.isDeleted = true`), THE Conversation_View SHALL render the placeholder text "This message was deleted" in place of the message content.
6. WHEN an edited message is encountered (`Message.isEdited = true`), THE Conversation_View SHALL render an "(edited)" label after the message content.
7. WHEN a message is loaded, THE Conversation_View SHALL scroll to the bottom of the message list.
8. WHEN the Authenticated_User selects a new conversation, THE Conversation_View SHALL call `markConversationAsRead` and set `useChatStore.unread[conversationId]` to 0.

---

### Requirement 5: Conversation View — Infinite Scroll Pagination

**User Story:** As an authenticated user, I want to load older messages by scrolling up, so that I can access the full history of a long conversation.

#### Acceptance Criteria

1. WHEN the user scrolls to the top of the message list and `useChatStore.hasMore[conversationId]` is `true`, THE Conversation_View SHALL fetch the next page of messages using the stored Cursor and prepend them to the message list via `useChatStore.prependMessages`.
2. WHILE older messages are loading, THE Conversation_View SHALL display a loading spinner at the top of the message list.
3. WHEN older messages are prepended, THE Conversation_View SHALL preserve the user's scroll position so the viewport does not jump.
4. WHEN `useChatStore.hasMore[conversationId]` is `false`, THE Conversation_View SHALL display a "Beginning of conversation" label at the top of the list.

---

### Requirement 6: Conversation View — Real-Time Messaging

**User Story:** As an authenticated user, I want new messages to appear instantly in the conversation I am viewing, so that the chat feels live.

#### Acceptance Criteria

1. WHEN the Authenticated_User opens a conversation, THE Chat_System SHALL subscribe to the Pusher channel `private-conversation-{conversationId}`.
2. WHEN a `message:new` event is received on the active Pusher_Channel, THE Conversation_View SHALL append the new message to the bottom of the message list via `useChatStore.addMessage`.
3. WHEN a new message is appended and the user was already scrolled within 100px of the bottom, THE Conversation_View SHALL auto-scroll to the new message.
4. WHEN a new message is appended and the user is scrolled more than 100px above the bottom, THE Conversation_View SHALL display a "New message ↓" scroll-to-bottom button.
5. WHEN the scroll-to-bottom button is clicked, THE Conversation_View SHALL animate a smooth scroll to the bottom and hide the button.
6. WHEN a `message:updated` event is received, THE Conversation_View SHALL update the matching message in `useChatStore.messages` via `useChatStore.updateMessage`.
7. WHEN a `message:deleted` event is received, THE Conversation_View SHALL mark the matching message as deleted in `useChatStore.messages` via `useChatStore.updateMessage`.

---

### Requirement 7: Message Formatting

**User Story:** As an authenticated user, I want messages to render rich formatting, so that I can communicate with emphasis, code, and structure.

#### Acceptance Criteria

1. THE Conversation_View SHALL render `**text**` as bold and `*text*` or `_text_` as italic within message content.
2. THE Conversation_View SHALL render `` `code` `` as inline code with a monospace font and a distinct background.
3. THE Conversation_View SHALL render triple-backtick fenced blocks as multi-line code blocks with a monospace font, distinct background, and a copy-to-clipboard button.
4. THE Conversation_View SHALL render `@username` tokens as highlighted mention chips using `text-primary` color when the mentioned username matches the Authenticated_User, and `bg-muted text-foreground` for other mentions.
5. THE Conversation_View SHALL detect URLs in message content and render them as clickable anchor tags that open in a new tab.
6. WHEN a message contains only emoji characters (up to 3 emoji, no other text), THE Conversation_View SHALL render those emoji at a larger size (3rem) without a bubble background.

---

### Requirement 8: Link Previews

**User Story:** As an authenticated user, I want to see a preview card for links shared in messages, so that I can understand linked content without leaving the chat.

#### Acceptance Criteria

1. WHEN a message is sent containing a URL, THE Chat_System SHALL fetch Open Graph metadata for that URL server-side via a `POST /api/messages/{messageId}/link-preview` endpoint and store the result on the message record.
2. WHEN a message with stored link preview metadata is rendered, THE Conversation_View SHALL display a preview card below the message text containing: the page title, description (truncated to 2 lines), domain name, and thumbnail image (if available).
3. IF Open Graph metadata cannot be fetched (network error, non-HTML response, or timeout after 3 seconds), THEN THE Chat_System SHALL silently omit the preview card for that URL.
4. THE Conversation_View SHALL render at most one link preview per message (the first URL detected).

---

### Requirement 9: Message Actions — Edit

**User Story:** As an authenticated user, I want to edit my own messages, so that I can correct mistakes after sending.

#### Acceptance Criteria

1. WHEN the Authenticated_User hovers over their own message, THE Conversation_View SHALL display an action toolbar containing at minimum an Edit button.
2. WHEN the Edit button is clicked, THE Conversation_View SHALL replace the message bubble with an inline editable input pre-filled with the current message content.
3. WHEN the user submits the edit (Enter key or Save button), THE Conversation_View SHALL call `PATCH /api/messages/{messageId}` with the new content and optimistically update the message in `useChatStore.messages`.
4. WHEN the user cancels the edit (Escape key or Cancel button), THE Conversation_View SHALL restore the original message bubble without making an API call.
5. IF the edit API call fails, THEN THE Conversation_View SHALL revert the optimistic update and display an inline error toast.
6. THE Conversation_View SHALL NOT display the Edit button for messages authored by other users.

---

### Requirement 10: Message Actions — Delete

**User Story:** As an authenticated user, I want to delete my own messages, so that I can remove content I no longer want visible.

#### Acceptance Criteria

1. WHEN the Authenticated_User hovers over their own message, THE Conversation_View SHALL display a Delete button in the action toolbar.
2. WHEN the Delete button is clicked, THE Conversation_View SHALL display a confirmation dialog before proceeding.
3. WHEN the user confirms deletion, THE Conversation_View SHALL call `DELETE /api/messages/{messageId}` and optimistically replace the message content with "This message was deleted" in `useChatStore.messages`.
4. IF the delete API call fails, THEN THE Conversation_View SHALL revert the optimistic update and display an inline error toast.
5. THE Conversation_View SHALL NOT display the Delete button for messages authored by other users.

---

### Requirement 11: Message Actions — Reactions

**User Story:** As an authenticated user, I want to add and remove emoji reactions to messages, so that I can respond quickly without sending a full message.

#### Acceptance Criteria

1. WHEN the Authenticated_User hovers over any message, THE Conversation_View SHALL display a reaction picker button (smiley face icon) in the action toolbar.
2. WHEN the reaction picker button is clicked, THE Conversation_View SHALL display an emoji picker overlay.
3. WHEN an emoji is selected from the picker, THE Conversation_View SHALL call `POST /api/messages/{messageId}/reactions` with the emoji and optimistically add the reaction to the message in `useChatStore.messages`.
4. WHEN a reaction already exists on a message and the Authenticated_User clicks it, THE Conversation_View SHALL call `POST /api/messages/{messageId}/reactions` (toggle) and optimistically remove the reaction.
5. THE Conversation_View SHALL render reaction counts grouped by emoji below the message bubble.
6. WHEN the Authenticated_User hovers over a reaction group, THE Conversation_View SHALL display a tooltip listing the names of users who reacted with that emoji.
7. WHEN a `reaction:added` or `reaction:removed` event is received on the active Pusher_Channel, THE Conversation_View SHALL update the reaction counts in `useChatStore.messages` without a full refetch.

---

### Requirement 12: Message Actions — Reply (Thread)

**User Story:** As an authenticated user, I want to reply to a specific message in a thread, so that I can have focused sub-conversations without cluttering the main chat.

#### Acceptance Criteria

1. WHEN the Authenticated_User hovers over any message, THE Conversation_View SHALL display a Reply button in the action toolbar.
2. WHEN the Reply button is clicked, THE Thread_Panel SHALL slide in from the right side of the layout, pushing the Conversation_View narrower.
3. THE Thread_Panel SHALL display the original (parent) message at the top, followed by all existing thread replies fetched from `GET /api/conversations/{conversationId}/messages?parentId={messageId}`.
4. THE Thread_Panel SHALL include its own message input for composing thread replies.
5. WHEN a thread reply is submitted, THE Chat_System SHALL call `POST /api/conversations/{conversationId}/messages` with `parentId` set to the parent message ID.
6. WHEN a new thread reply arrives via `message:new` on the active Pusher_Channel with a `parentId` matching the open thread, THE Thread_Panel SHALL append the reply to the thread list.
7. THE Conversation_View SHALL display a "N replies" link below messages that have at least one thread reply, where N is `Message._count.replies`.
8. WHEN the Thread_Panel is open and the Search_Drawer is also requested, THE Chat_System SHALL close the Thread_Panel before opening the Search_Drawer, so only one right panel is visible at a time.

---

### Requirement 13: Message Input

**User Story:** As an authenticated user, I want a rich message input, so that I can compose formatted messages efficiently.

#### Acceptance Criteria

1. THE Conversation_View SHALL render a message input area that supports multi-line text entry.
2. WHEN the user presses Enter without Shift, THE Chat_System SHALL send the message by calling `POST /api/conversations/{conversationId}/messages` and clear the input.
3. WHEN the user presses Shift+Enter, THE Chat_System SHALL insert a newline in the input without sending.
4. WHEN the send button is clicked and the input is non-empty, THE Chat_System SHALL send the message.
5. THE Conversation_View SHALL disable the send button and prevent submission when the input is empty or contains only whitespace.
6. WHEN a message is sent successfully, THE Chat_System SHALL optimistically append the message to `useChatStore.messages` before the API response returns.
7. IF the send API call fails, THEN THE Chat_System SHALL remove the optimistic message and restore the input content with an error toast.
8. THE Conversation_View SHALL render an emoji picker button that opens the `@emoji-mart/react` Picker component; selecting an emoji SHALL insert it at the current cursor position.
9. THE Conversation_View SHALL render a file attachment button; clicking it SHALL open the OS file picker.
10. WHEN the user types `@` followed by at least one character, THE Conversation_View SHALL display an autocomplete dropdown listing workspace members whose names match the typed prefix, and selecting a member SHALL insert a `@username` mention token.

---

### Requirement 14: Typing Indicators

**User Story:** As an authenticated user, I want to see when others are typing, so that I know a response is coming.

#### Acceptance Criteria

1. WHEN the Authenticated_User types in the message input and has not sent or stopped typing for 2 seconds, THE Chat_System SHALL emit a `client-typing:start` Pusher client-event on the active `private-conversation-{id}` channel, debounced to fire at most once every 2 seconds.
2. WHEN the Authenticated_User stops typing for 2 seconds or sends a message, THE Chat_System SHALL emit a `client-typing:stop` Pusher client-event.
3. WHEN a `client-typing:start` event is received from another user, THE Conversation_View SHALL display "[Name] is typing…" below the message input.
4. WHEN multiple users are typing simultaneously, THE Conversation_View SHALL display "[Name1] and [Name2] are typing…" (up to 2 names), or "[N] people are typing…" for 3 or more.
5. WHEN a `client-typing:stop` event is received or 5 seconds elapse without a new `client-typing:start` from that user, THE Conversation_View SHALL remove that user from the typing indicator.
6. THE Conversation_View SHALL NOT display a typing indicator for the Authenticated_User's own typing events.

---

### Requirement 15: File Attachments

**User Story:** As an authenticated user, I want to attach files to messages, so that I can share documents and images in conversations.

#### Acceptance Criteria

1. WHEN the user selects a file via the attachment button, THE Conversation_View SHALL display a preview of the selected file (thumbnail for images, filename and size for other types) above the input bar before sending.
2. WHEN the user sends a message with an attachment, THE Chat_System SHALL upload the file to the configured storage provider and include the resulting `fileUrl`, `fileName`, `fileSize`, and `mimeType` in the message creation request.
3. WHEN a message with attachments is rendered, THE Conversation_View SHALL display image attachments inline as thumbnails (max 320px wide) and non-image attachments as a file card showing filename, file size, and a download link.
4. IF a file upload fails, THEN THE Chat_System SHALL display an error toast and retain the attachment preview in the input so the user can retry.
5. THE Chat_System SHALL accept files up to 25 MB; IF a file exceeds this limit, THEN THE Chat_System SHALL display an error message before attempting any upload.

---

### Requirement 16: Search Drawer

**User Story:** As an authenticated user, I want to search messages within the active conversation, so that I can find specific content quickly.

#### Acceptance Criteria

1. WHEN the Search button in the Conversation_View top bar is clicked, THE Search_Drawer SHALL slide in from the right, replacing any open Thread_Panel.
2. WHEN the user types a query of at least 2 characters into the Search_Drawer input, THE Chat_System SHALL call `GET /api/conversations/{conversationId}/messages?search={query}` and display matching messages.
3. THE Search_Drawer SHALL highlight the matching substring within each result using a `bg-primary/20 text-primary` mark element.
4. WHEN a search result is clicked, THE Conversation_View SHALL scroll to and briefly highlight the corresponding message.
5. WHEN the search input is cleared or the drawer is closed, THE Conversation_View SHALL return to its normal scroll position.
6. WHEN the "Has attachment" filter chip is active, THE Search_Drawer SHALL restrict results to messages that have at least one `MessageAttachment`.
7. WHEN no results are found for a non-empty query, THE Search_Drawer SHALL display a "No results found" empty state.

---

### Requirement 17: Unread State Management

**User Story:** As an authenticated user, I want unread message counts to be accurate and cleared when I read a conversation, so that I know exactly where new activity is.

#### Acceptance Criteria

1. WHEN the Conversation_List loads, THE Chat_System SHALL fetch the unread count for each conversation and populate `useChatStore.unread`.
2. WHEN the Authenticated_User opens a conversation, THE Chat_System SHALL call `markConversationAsRead` (updating `ConversationMember.lastReadAt`) and set `useChatStore.unread[conversationId]` to 0.
3. WHEN a `message:new` event is received for a conversation that is not the Active_Conversation, THE Chat_System SHALL increment `useChatStore.unread[conversationId]` by 1.
4. WHEN `useChatStore.unread[conversationId]` is greater than 0, THE Conversation_List SHALL render a badge showing the count on the conversation row.
5. WHEN `useChatStore.unread[conversationId]` exceeds 99, THE Conversation_List SHALL display "99+" in the badge.

---

### Requirement 18: Presence Indicators

**User Story:** As an authenticated user, I want to see whether other users are online, so that I know if they are likely to respond soon.

#### Acceptance Criteria

1. THE Conversation_List SHALL render a green presence dot on the avatar of users whose `UserPresence.status` is `AVAILABLE`.
2. THE Conversation_View top bar SHALL render a presence dot next to the conversation partner's name for direct message conversations.
3. WHEN a `presence:updated` event is received on the `private-user-{userId}` channel, THE Chat_System SHALL update the presence status in the relevant conversation rows and the active Conversation_View top bar.
4. THE Chat_System SHALL represent `BUSY`, `AWAY`, `DO_NOT_DISTURB`, and `BE_RIGHT_BACK` statuses with distinct visual indicators (color or icon) consistent with the Delix design system.

---

### Requirement 19: New Conversation Creation

**User Story:** As an authenticated user, I want to start a new direct message or group conversation, so that I can initiate communication with colleagues.

#### Acceptance Criteria

1. WHEN the compose button (pencil icon) in the Conversation_List header is clicked, THE Chat_System SHALL open a modal for creating a new conversation.
2. THE modal SHALL allow the user to search for workspace members by name and select one member (for a DM) or multiple members (for a group conversation).
3. WHEN a single member is selected and the user confirms, THE Chat_System SHALL call `POST /api/conversations` with `type: "DIRECT"` and navigate to the resulting conversation.
4. WHEN multiple members are selected and the user confirms, THE Chat_System SHALL call `POST /api/conversations` with `type: "GROUP"` and navigate to the resulting conversation.
5. IF a direct conversation between the two users already exists, THEN THE Chat_System SHALL navigate to the existing conversation rather than creating a duplicate.

---

### Requirement 20: Accessibility

**User Story:** As a user with assistive technology, I want the chat interface to be navigable and understandable, so that I can participate in conversations regardless of how I interact with the application.

#### Acceptance Criteria

1. THE Conversation_List SHALL assign `role="listbox"` to the conversation list container and `role="option"` with `aria-selected` to each conversation row.
2. THE Conversation_View message list SHALL assign `role="log"` and `aria-live="polite"` to the scrollable message container so screen readers announce new messages.
3. THE Chat_System SHALL ensure all interactive icon buttons have an accessible `aria-label` describing their action.
4. THE Conversation_View message input SHALL have an `aria-label` of "Message [conversation name]".
5. WHEN a message action toolbar appears on hover, THE Chat_System SHALL also make it accessible via keyboard focus on the message element (Tab to focus, then arrow keys to navigate toolbar buttons).
