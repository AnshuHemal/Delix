# Requirements Document

## Introduction

The Teams & Channels feature adds a Microsoft Teams-style team collaboration layer to the Delix platform. Users can create teams, organize channels within those teams, and communicate in real time through channel messages. The feature replaces the existing placeholder "Communities" page with a fully functional Teams UI, reusing the established patterns from the chat system (Pusher real-time, Zustand store, ConversationView component patterns, shadcn/ui + Tailwind + Framer Motion design system).

The database schema, API routes, and DB helper functions are already scaffolded. This feature focuses on the UI layer, Zustand store, real-time subscriptions, and completing the API route implementations.

## Glossary

- **Teams_Panel**: The left-side panel listing all teams and their channels, replacing the communities placeholder view.
- **Channel_View**: The center panel displaying messages for the selected channel, modeled after `ConversationView`.
- **Teams_Store**: The Zustand store (`useTeamsStore`) managing teams, channels, messages, unread counts, and typing indicators.
- **Team**: A named group within a workspace containing members and channels, backed by the `Team` Prisma model.
- **Channel**: A named message thread within a team, typed as STANDARD, ANNOUNCEMENT, or PRIVATE, backed by the `Channel` Prisma model.
- **Team_Owner**: A `TeamMember` with `role = OWNER`. Has full management permissions for the team.
- **Team_Member**: A `TeamMember` with `role = MEMBER`. Can post in STANDARD channels and read ANNOUNCEMENT channels.
- **Channel_Member**: A `ChannelMember` record granting access to a PRIVATE channel.
- **Announcement_Channel**: A `Channel` with `type = ANNOUNCEMENT`. Only Team_Owners may post; all team members may read.
- **Private_Channel**: A `Channel` with `type = PRIVATE`. Only visible to users with a `ChannelMember` record.
- **Standard_Channel**: A `Channel` with `type = STANDARD`. All team members may read and post.
- **Pinned_Message**: A message marked as pinned within a channel, displayed in a collapsible section at the top of the Posts tab.
- **Thread_Panel**: The right-side slide-in panel showing replies to a parent message, reused from the chat system.
- **Typing_Indicator**: A real-time signal broadcast via Pusher client events showing which users are currently composing a message.
- **Unread_Count**: The number of messages in a channel received after the user's last read timestamp.
- **Presence_Dot**: A colored status indicator overlaid on a user avatar reflecting their `PresenceStatus`.
- **Emoji_Avatar**: A team avatar represented as a single emoji character or auto-generated letter initial with a background color.
- **Shell**: The `DashboardShell` component in `src/components/dashboard/shell.tsx` containing the sidebar navigation.

---

## Requirements

### Requirement 1: Sidebar Navigation Rename

**User Story:** As a user, I want the sidebar navigation item to say "Teams" instead of "Communities", so that the label accurately reflects the feature.

#### Acceptance Criteria

1. THE Shell SHALL display the label "Teams" for the navigation item currently labeled "Communities".
2. THE Shell SHALL navigate to `/dashboard/communities` when the Teams nav item is activated (route path unchanged to avoid breaking existing links).
3. WHEN the user is on any route starting with `/dashboard/communities`, THE Shell SHALL render the Teams nav item in its active state using the filled Fluent icon and primary color.

---

### Requirement 2: Teams List Panel

**User Story:** As a user, I want to see all teams I belong to in a left panel with their channels, so that I can quickly navigate to any channel.

#### Acceptance Criteria

1. WHEN the Teams page loads, THE Teams_Panel SHALL fetch all teams for the current workspace from `GET /api/workspaces/[workspaceId]/teams` and display them.
2. THE Teams_Panel SHALL display only teams where the current user is a member or the team `isPrivate` is false.
3. WHEN a team is displayed, THE Teams_Panel SHALL show the team's Emoji_Avatar (or letter initial), name, and a Presence_Dot for each of the first three member avatars.
4. THE Teams_Panel SHALL render each team as an expandable/collapsible row; WHEN a team row is clicked, THE Teams_Panel SHALL toggle the visibility of that team's channel list using a Framer Motion expand/collapse animation.
5. WHEN a team is expanded, THE Teams_Panel SHALL list all channels the current user has access to within that team, ordered by creation date ascending.
6. WHEN a channel has unread messages, THE Teams_Panel SHALL display an unread count badge on that channel row.
7. WHEN any channel within a team has unread messages, THE Teams_Panel SHALL display an unread indicator dot on the collapsed team row.
8. THE Teams_Panel SHALL include a "+" button in the panel header; WHEN clicked, THE Teams_Panel SHALL open the Create Team modal (Requirement 7).
9. THE Teams_Panel SHALL include a search input; WHEN the user types in the search input, THE Teams_Panel SHALL filter the displayed teams and channels to those whose names contain the search string (case-insensitive, client-side).
10. WHEN the teams list is loading, THE Teams_Panel SHALL display skeleton placeholder rows for teams and channels.
11. WHEN no teams exist for the workspace, THE Teams_Panel SHALL display an empty state with a prompt to create the first team.

---

### Requirement 3: Channel Selection and Active State

**User Story:** As a user, I want to select a channel and have it highlighted in the panel, so that I always know which channel I am viewing.

#### Acceptance Criteria

1. WHEN the user clicks a channel row in the Teams_Panel, THE Teams_Store SHALL set that channel as the active channel and THE Channel_View SHALL render the selected channel's messages.
2. THE Teams_Panel SHALL visually distinguish the active channel row from inactive rows using a background highlight and primary-colored text.
3. WHEN a channel is selected, THE Teams_Panel SHALL automatically expand the parent team row if it is collapsed.
4. WHEN the active channel changes, THE Teams_Store SHALL clear the unread count for the previously active channel.

---

### Requirement 4: Channel View — Posts Tab

**User Story:** As a user, I want to read and send messages in a channel, so that I can collaborate with my team.

#### Acceptance Criteria

1. WHEN a channel is selected, THE Channel_View SHALL display a header containing the channel name, description (if set), member count, a search button, and a video call button.
2. THE Channel_View SHALL display two tabs: "Posts" and "Files"; THE Channel_View SHALL show the Posts tab by default.
3. WHEN the Posts tab is active, THE Channel_View SHALL render the message history for the selected channel, fetched from `GET /api/channels/[channelId]/messages`.
4. THE Channel_View SHALL support infinite scroll pagination: WHEN the user scrolls to the top of the message list and more messages exist, THE Channel_View SHALL fetch the next page and prepend messages while preserving the scroll position.
5. THE Channel_View SHALL group consecutive messages from the same author within a 5-minute window, showing the avatar and name only on the first message of each group.
6. THE Channel_View SHALL insert date separator labels between messages from different calendar days.
7. WHEN a new message arrives via Pusher, THE Channel_View SHALL append it to the message list; IF the user is within 100px of the bottom, THE Channel_View SHALL auto-scroll to the new message.
8. WHEN the message list is loading, THE Channel_View SHALL display skeleton message placeholders.
9. WHEN no messages exist in the channel, THE Channel_View SHALL display an empty state prompting the user to send the first message.
10. WHEN the user is not near the bottom of the message list and new messages arrive, THE Channel_View SHALL display a "scroll to bottom" button with an unread count badge.

---

### Requirement 5: Channel View — Message Input

**User Story:** As a user, I want to compose and send messages with rich input features, so that I can communicate effectively in channels.

#### Acceptance Criteria

1. THE Channel_View SHALL display a message input area at the bottom of the Posts tab containing a textarea, emoji picker button, file attachment button, @mention button, and send button.
2. WHEN the user presses Enter (without Shift), THE Channel_View SHALL send the composed message; WHEN the user presses Shift+Enter, THE Channel_View SHALL insert a newline.
3. WHEN a message is sent, THE Channel_View SHALL display an optimistic message immediately and replace it with the server-confirmed message upon successful API response.
4. IF the API call to send a message fails, THEN THE Channel_View SHALL remove the optimistic message, restore the input text, and display an error toast.
5. WHEN the user clicks the emoji picker button, THE Channel_View SHALL display the emoji picker popover; WHEN an emoji is selected, THE Channel_View SHALL insert it at the cursor position.
6. WHEN the user clicks the file attachment button, THE Channel_View SHALL open a file picker; WHEN a file is selected, THE Channel_View SHALL display a preview of the pending attachment above the input.
7. IF the selected file exceeds 25 MB, THEN THE Channel_View SHALL display an error toast and reject the file.
8. WHEN the user types "@" followed by characters, THE Channel_View SHALL display an @mention autocomplete dropdown populated from `GET /api/workspaces/members?search=`; WHEN the user selects a member, THE Channel_View SHALL insert `@name` into the input.
9. WHEN the active channel is an Announcement_Channel and the current user is a Team_Member (not Team_Owner), THE Channel_View SHALL disable the message input and display a read-only notice.
10. WHEN the active channel is an Announcement_Channel and the current user is a Team_Owner, THE Channel_View SHALL enable the message input normally.

---

### Requirement 6: Channel View — Message Actions

**User Story:** As a user, I want to react to, edit, delete, and reply to messages, so that I can interact with channel content.

#### Acceptance Criteria

1. WHEN the user hovers over a message, THE Channel_View SHALL display an action toolbar with buttons for: add reaction, edit (own messages only), delete (own messages or Team_Owner), and open thread reply.
2. WHEN the user selects a reaction emoji, THE Channel_View SHALL call `POST /api/messages/[messageId]/reactions`; WHEN the reaction is added, THE Channel_View SHALL update the reaction display optimistically.
3. WHEN the user clicks an existing reaction they have already added, THE Channel_View SHALL call `DELETE /api/messages/[messageId]/reactions` to toggle it off.
4. WHEN the user clicks edit on their own message, THE Channel_View SHALL replace the message bubble with an inline edit textarea pre-filled with the current content; WHEN the user saves, THE Channel_View SHALL call `PATCH /api/messages/[messageId]` and update the message in place.
5. WHEN the user clicks delete on a message, THE Channel_View SHALL call `DELETE /api/messages/[messageId]` and replace the message content with a "This message was deleted" placeholder.
6. WHEN the user clicks the thread reply button, THE Channel_View SHALL open the Thread_Panel sliding in from the right, following the same pattern as the chat system.
7. WHEN a message contains a URL, THE Channel_View SHALL render a link preview card below the message content.

---

### Requirement 7: Pinned Messages

**User Story:** As a user, I want to see pinned messages at the top of a channel, so that important information is always visible.

#### Acceptance Criteria

1. WHEN the Posts tab is active and the channel has pinned messages, THE Channel_View SHALL display a collapsible "Pinned" section at the top of the message area showing the pinned message previews.
2. WHEN the user clicks the pinned section header, THE Channel_View SHALL toggle the expanded/collapsed state of the pinned messages list using a Framer Motion animation.
3. WHEN a Team_Owner right-clicks or uses the action menu on a message, THE Channel_View SHALL display a "Pin message" option; WHEN selected, THE Channel_View SHALL call the appropriate API endpoint and add the message to the pinned section.
4. WHEN a Team_Owner uses the action menu on a pinned message, THE Channel_View SHALL display an "Unpin message" option; WHEN selected, THE Channel_View SHALL remove the message from the pinned section.

---

### Requirement 8: Channel View — Files Tab

**User Story:** As a user, I want to browse all files shared in a channel, so that I can find attachments without scrolling through messages.

#### Acceptance Criteria

1. WHEN the user clicks the "Files" tab, THE Channel_View SHALL display a grid or list of all file attachments sent in the channel, fetched from the channel files API.
2. THE Channel_View SHALL display each file entry with its name, size, uploader name, and upload date.
3. WHEN the user clicks a file entry, THE Channel_View SHALL open the file URL in a new browser tab.
4. WHEN no files have been shared in the channel, THE Channel_View SHALL display an empty state message.

---

### Requirement 9: Real-Time Messaging

**User Story:** As a user, I want channel messages to appear instantly without refreshing, so that conversations feel live.

#### Acceptance Criteria

1. WHEN the user selects a channel, THE Channel_View SHALL subscribe to the Pusher channel `private-channel-{channelId}`.
2. WHEN a `message:new` event is received on `private-channel-{channelId}`, THE Teams_Store SHALL add the message to the channel's message list.
3. WHEN a `message:updated` event is received, THE Teams_Store SHALL update the corresponding message in the channel's message list.
4. WHEN a `message:deleted` event is received, THE Teams_Store SHALL mark the corresponding message as deleted in the channel's message list.
5. WHEN a `reaction:added` event is received, THE Teams_Store SHALL add the reaction to the corresponding message.
6. WHEN a `reaction:removed` event is received, THE Teams_Store SHALL remove the reaction from the corresponding message.
7. WHEN the user leaves a channel (navigates away or selects a different channel), THE Channel_View SHALL unsubscribe from the previous channel's Pusher subscription.
8. WHEN a `message:new` event is received for a channel that is not currently active, THE Teams_Store SHALL increment the unread count for that channel.

---

### Requirement 10: Typing Indicators

**User Story:** As a user, I want to see when other team members are typing in a channel, so that I know a response is coming.

#### Acceptance Criteria

1. WHEN the user types in the channel message input, THE Channel_View SHALL emit a `client-typing:start` Pusher client event on `private-channel-{channelId}` at most once every 2 seconds.
2. WHEN the user stops typing for 2 seconds, THE Channel_View SHALL emit a `client-typing:stop` Pusher client event.
3. WHEN a `client-typing:start` event is received from another user, THE Channel_View SHALL display a typing indicator showing that user's name below the message list.
4. WHEN a `client-typing:stop` event is received, THE Channel_View SHALL remove that user's typing indicator.
5. WHEN a typing indicator has been visible for 5 seconds without a refresh event, THE Channel_View SHALL automatically remove it.
6. THE Channel_View SHALL never display the current user's own typing indicator.

---

### Requirement 11: Teams Store

**User Story:** As a developer, I want a dedicated Zustand store for teams and channels, so that state is managed consistently and independently from the chat store.

#### Acceptance Criteria

1. THE Teams_Store SHALL maintain a list of `TeamWithDetails` objects for the current workspace.
2. THE Teams_Store SHALL track the active team ID and active channel ID.
3. THE Teams_Store SHALL maintain a messages map keyed by channel ID, following the same structure as `useChatStore`.
4. THE Teams_Store SHALL maintain pagination cursors and `hasMore` flags per channel ID.
5. THE Teams_Store SHALL maintain unread counts per channel ID.
6. THE Teams_Store SHALL maintain typing indicator lists per channel ID.
7. THE Teams_Store SHALL expose actions: `setTeams`, `addTeam`, `updateTeam`, `removeTeam`, `setActiveTeam`, `setActiveChannel`, `setMessages`, `prependMessages`, `addMessage`, `updateMessage`, `removeMessage`, `setCursor`, `setHasMore`, `setUnread`, `incrementUnread`, `clearUnread`, `setTyping`, `clearTyping`.
8. THE Teams_Store SHALL be created with Zustand `devtools` middleware and named `"teams-store"`.

---

### Requirement 12: Create Team

**User Story:** As a user, I want to create a new team, so that I can organize my workspace collaborators around a topic or project.

#### Acceptance Criteria

1. WHEN the user clicks the "+" button in the Teams_Panel header, THE Teams_Panel SHALL open a Create Team modal.
2. THE Create_Team_Modal SHALL contain fields for: team name (required, max 80 characters), description (optional, max 280 characters), privacy toggle (public/private), and a member search/add field.
3. WHEN the user submits the Create Team form with a valid name, THE Create_Team_Modal SHALL call `POST /api/workspaces/[workspaceId]/teams` and add the new team to the Teams_Store.
4. IF the team name field is empty on submit, THEN THE Create_Team_Modal SHALL display an inline validation error and prevent submission.
5. WHEN the team is created successfully, THE Create_Team_Modal SHALL close, THE Teams_Panel SHALL display the new team expanded with its default "General" channel, and THE Channel_View SHALL navigate to the General channel.
6. WHEN the user adds members in the Create Team form, THE Create_Team_Modal SHALL search workspace members via `GET /api/workspaces/members?search=` and display matching results in a dropdown.
7. WHEN the team is created with additional members, THE Create_Team_Modal SHALL call `POST /api/workspaces/[workspaceId]/teams/[teamId]/members` for each added member after team creation.
8. IF the API call to create a team fails, THEN THE Create_Team_Modal SHALL display an error toast and keep the modal open with the form data intact.

---

### Requirement 13: Team Settings

**User Story:** As a Team_Owner, I want to manage my team's settings, so that I can keep the team organized and up to date.

#### Acceptance Criteria

1. WHEN a Team_Owner clicks the settings icon on a team row, THE Teams_Panel SHALL open a Team Settings panel or modal.
2. THE Team_Settings_Panel SHALL allow the Team_Owner to: rename the team (max 80 characters), update the description (max 280 characters), change the Emoji_Avatar, and toggle privacy.
3. WHEN the Team_Owner saves changes, THE Team_Settings_Panel SHALL call `PATCH /api/workspaces/[workspaceId]/teams/[teamId]` and update the team in the Teams_Store.
4. THE Team_Settings_Panel SHALL display the current list of team members with their roles and presence dots.
5. WHEN the Team_Owner clicks "Add Members", THE Team_Settings_Panel SHALL open a member search input and allow adding workspace members to the team via `POST /api/workspaces/[workspaceId]/teams/[teamId]/members`.
6. WHEN the Team_Owner clicks "Remove" next to a member, THE Team_Settings_Panel SHALL call `DELETE /api/workspaces/[workspaceId]/teams/[teamId]/members/[userId]` and remove the member from the list.
7. WHEN the Team_Owner clicks "Delete Team", THE Team_Settings_Panel SHALL display a confirmation dialog; WHEN confirmed, THE Team_Settings_Panel SHALL call `DELETE /api/workspaces/[workspaceId]/teams/[teamId]`, remove the team from the Teams_Store, and navigate away from any active channel in that team.
8. IF the Team_Owner attempts to remove themselves as the only owner, THEN THE Team_Settings_Panel SHALL display an error and prevent the action.
9. WHEN a Team_Member (non-owner) views the team settings, THE Team_Settings_Panel SHALL display team info and member list in read-only mode without edit controls.

---

### Requirement 14: Create Channel

**User Story:** As a Team_Owner, I want to add channels to my team, so that I can organize discussions by topic.

#### Acceptance Criteria

1. WHEN a Team_Owner clicks the "+" button next to a team's channel list, THE Teams_Panel SHALL open a Create Channel modal.
2. THE Create_Channel_Modal SHALL contain fields for: channel name (required, max 80 characters, lowercase letters, numbers, and hyphens only), description (optional, max 280 characters), and channel type selector (Standard / Announcement / Private).
3. IF the channel name contains invalid characters, THEN THE Create_Channel_Modal SHALL display an inline validation error.
4. WHEN the user submits the Create Channel form with a valid name, THE Create_Channel_Modal SHALL call `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels` and add the new channel to the Teams_Store under the correct team.
5. WHEN the channel is created successfully, THE Create_Channel_Modal SHALL close and THE Channel_View SHALL navigate to the new channel.
6. IF the channel type is ANNOUNCEMENT and the current user is not a Team_Owner, THEN THE Create_Channel_Modal SHALL disable the Announcement option and display a tooltip explaining the restriction.
7. IF the API call to create a channel fails, THEN THE Create_Channel_Modal SHALL display an error toast and keep the modal open.

---

### Requirement 15: Channel Settings

**User Story:** As a Team_Owner, I want to manage channel settings, so that I can keep channels organized and correctly configured.

#### Acceptance Criteria

1. WHEN a Team_Owner clicks the settings icon on a channel row or in the Channel_View header, THE Channel_View SHALL open a Channel Settings panel.
2. THE Channel_Settings_Panel SHALL allow the Team_Owner to: rename the channel (max 80 characters), update the description (max 280 characters), and set a topic (max 120 characters).
3. WHEN the Team_Owner saves changes, THE Channel_Settings_Panel SHALL call `PATCH /api/workspaces/[workspaceId]/teams/[teamId]/channels/[channelId]` and update the channel in the Teams_Store.
4. WHEN the Team_Owner clicks "Archive Channel", THE Channel_Settings_Panel SHALL display a confirmation dialog; WHEN confirmed, THE Channel_Settings_Panel SHALL soft-delete the channel (via a type or flag change) and remove it from the Teams_Panel.
5. WHEN a Team_Member (non-owner) views channel settings, THE Channel_Settings_Panel SHALL display channel info in read-only mode.

---

### Requirement 16: Permissions Enforcement

**User Story:** As a platform, I want to enforce role-based permissions on team and channel actions, so that the collaboration space remains secure and well-governed.

#### Acceptance Criteria

1. WHEN a Team_Member (non-owner) views the Teams_Panel, THE Teams_Panel SHALL NOT display the "+" button to add channels next to teams where the user is not a Team_Owner.
2. WHEN a Team_Member (non-owner) views the Teams_Panel, THE Teams_Panel SHALL NOT display the team settings icon for teams where the user is not a Team_Owner.
3. WHEN a Team_Member attempts to post in an Announcement_Channel, THE Channel_View SHALL display the input as disabled with a read-only notice (Requirement 5, criterion 9).
4. WHEN a Private_Channel is listed, THE Teams_Panel SHALL only display it to users who have a ChannelMember record for that channel.
5. WHEN a Team_Member views the message action toolbar, THE Channel_View SHALL only show the delete action for messages authored by that user; THE Channel_View SHALL show the delete action for all messages when the current user is a Team_Owner.
6. THE API route `POST /api/workspaces/[workspaceId]/teams/[teamId]/channels` SHALL return HTTP 403 if the requesting user is not a Team_Owner of the specified team.
7. THE API route `DELETE /api/workspaces/[workspaceId]/teams/[teamId]` SHALL return HTTP 403 if the requesting user is not a Team_Owner of the specified team.
8. THE API route `POST /api/channels/[channelId]/messages` SHALL return HTTP 403 if the channel type is ANNOUNCEMENT and the requesting user is not a Team_Owner.

---

### Requirement 17: Presence in Teams Panel

**User Story:** As a user, I want to see the online status of team members in the panel, so that I know who is available.

#### Acceptance Criteria

1. WHEN a team row is expanded, THE Teams_Panel SHALL display up to three member avatar thumbnails with Presence_Dots overlaid, using the same `PRESENCE_DOT` color mapping as the chat system.
2. THE Teams_Panel SHALL source presence status from the `usePresenceStore` already used by the chat system.
3. WHEN a team has more than three members, THE Teams_Panel SHALL display a "+N" overflow label after the three avatars indicating the remaining count.

---

### Requirement 18: Design and Animation

**User Story:** As a user, I want the Teams UI to feel polished and consistent with the rest of the Delix app, so that the experience is cohesive.

#### Acceptance Criteria

1. THE Teams_Panel SHALL use the same sidebar width (384px / `w-96`) and border styling as the `ChatList` component.
2. THE Channel_View SHALL use the same layout structure (top bar, scrollable message area, input area) as `ConversationView`.
3. WHEN teams or channels expand/collapse, THE Teams_Panel SHALL animate using Framer Motion with the same `[0.22, 1, 0.36, 1]` easing curve used throughout the app.
4. WHEN the Channel_View transitions between channels, THE Channel_View SHALL animate with `opacity: 0 → 1, x: 12 → 0` on enter and `opacity: 1 → 0, x: 0 → -12` on exit, matching the `ConversationView` transition.
5. WHEN modals open and close, THE modals SHALL animate using Framer Motion scale + opacity transitions consistent with existing modals in the app.
6. THE Teams_Panel and Channel_View SHALL use only existing shadcn/ui components, Tailwind utility classes, and design tokens already present in the codebase.
7. THE Teams_Panel and Channel_View SHALL be accessible: all interactive elements SHALL have ARIA labels, keyboard navigation SHALL be supported (Tab, Enter, Escape, Arrow keys for dropdowns), and focus SHALL be managed correctly when modals open and close.
8. THE Channel_View SHALL support both light and dark themes using the existing `next-themes` integration and CSS variable tokens.

---

### Requirement 19: Message Pagination and History

**User Story:** As a user, I want to load older messages by scrolling up, so that I can review the full history of a channel.

#### Acceptance Criteria

1. WHEN a channel is first selected, THE Channel_View SHALL fetch the 50 most recent messages from `GET /api/channels/[channelId]/messages?limit=50`.
2. THE API route `GET /api/channels/[channelId]/messages` SHALL accept `limit` and `cursor` query parameters and return `{ messages, nextCursor, hasMore }` following the same pagination contract as the conversations messages API.
3. WHEN the user scrolls to the top sentinel element and `hasMore` is true, THE Channel_View SHALL fetch the next page using the stored cursor and prepend the results.
4. WHEN older messages are prepended, THE Channel_View SHALL restore the scroll position so the user's current view does not jump.
5. WHEN `hasMore` is false, THE Channel_View SHALL display a "Beginning of #channel-name" label at the top of the message list.

---

### Requirement 20: Unread State Management

**User Story:** As a user, I want unread indicators to accurately reflect messages I haven't seen, so that I don't miss important channel activity.

#### Acceptance Criteria

1. WHEN the user selects a channel, THE Channel_View SHALL mark all messages as read by calling the appropriate read-receipt API endpoint and THE Teams_Store SHALL clear the unread count for that channel.
2. WHEN a `message:new` Pusher event arrives for a channel that is not currently active, THE Teams_Store SHALL increment the unread count for that channel.
3. WHEN the Teams_Panel renders a channel row with a non-zero unread count, THE Teams_Panel SHALL display a badge showing the count (capped at 99+).
4. WHEN all channels within a team have zero unread counts, THE Teams_Panel SHALL not display an unread indicator on the team row.
5. WHEN the user navigates away from the Teams page and returns, THE Teams_Store SHALL preserve unread counts that accumulated during the absence.
