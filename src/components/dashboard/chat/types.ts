/**
 * Shared types for the chat feature
 */

export interface Chat {
  id: string;
  name: string;
  preview: string;
  time: string;
  online: boolean;
  unread: boolean;
  avatar?: string;
  initials?: string;
  avatarColor?: string;
  isGroup?: boolean;
}
