"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, SlidersHorizontal, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";

type Chat = {
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
};

const pinnedChats: Chat[] = [
  { id: "1", name: "Ray Tanaka", preview: "Louisa will send the initial list of...", time: "1:47 PM", online: true, unread: false, avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "2", name: "Beth Davies", preview: "Thanks, that would be nice.", time: "1:43 PM", online: true, unread: false, avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: "3", name: "Kayo Miwa", preview: "I reviewed with the client on...", time: "Yesterday", online: false, unread: false, avatar: "https://randomuser.me/api/portraits/women/65.jpg" },
  { id: "4", name: "Will, Kayo, Eric, +2", preview: "Kayo: It would be great to sync...", time: "12:00 PM", online: false, unread: false, isGroup: true, avatar: "https://randomuser.me/api/portraits/men/46.jpg" },
  { id: "5", name: "August Bergman", preview: "I haven't checked available time...", time: "1:20 PM", online: true, unread: true, initials: "AB", avatarColor: "bg-pink-200 text-pink-800" },
];

const recentChats: Chat[] = [
  { id: "6", name: "Charlotte and Babak", preview: "Babak: I asked the client to send...", time: "1:58 PM", online: false, unread: false, avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
  { id: "7", name: "Emiliano Ceballos", preview: "😂😂", time: "1:55 PM", online: true, unread: true, initials: "EC", avatarColor: "bg-teal-200 text-teal-800" },
  { id: "8", name: "Marie Beaudouin", preview: "Sounds good?", time: "1:00 PM", online: true, unread: false, initials: "MB", avatarColor: "bg-purple-200 text-purple-800" },
  { id: "9", name: "Oscar Krogh", preview: "You: Thanks! Have a nice...", time: "11:02 AM", online: true, unread: false, initials: "OK", avatarColor: "bg-orange-200 text-orange-800" },
  { id: "10", name: "Daichi Fukuda", preview: "No, I think there are other...", time: "10:43 AM", online: false, unread: false, initials: "DF", avatarColor: "bg-yellow-200 text-yellow-800" },
  { id: "11", name: "Kian Lambert", preview: "Have you run this by Beth? Mak...", time: "Yesterday", online: false, unread: false, avatar: "https://randomuser.me/api/portraits/men/75.jpg" },
  { id: "12", name: "Team Design Template", preview: "Reta: Let's set up a brainstorm...", time: "Yesterday", online: false, unread: false, avatar: "https://randomuser.me/api/portraits/women/33.jpg" },
];

function Avatar({ chat }: { chat: Chat }) {
  return (
    <div className="relative shrink-0">
      {chat.avatar ? (
        <Image
          src={chat.avatar}
          alt={chat.name}
          width={40}
          height={40}
          unoptimized
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold", chat.avatarColor)}>
          {chat.initials}
        </div>
      )}
      {chat.online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-background" />
      )}
    </div>
  );
}

function ChatRow({ chat, selected, onSelect }: { chat: Chat; selected: boolean; onSelect: (chat: Chat) => void }) {
  return (
    <button
      onClick={() => onSelect(chat)}
      className={cn(
        "relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100",
        selected ? "bg-accent" : "hover:bg-muted/50"
      )}
    >
      {/* Unread dot */}
      {chat.unread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      <Avatar chat={chat} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm text-foreground truncate", chat.unread ? "font-bold" : "font-medium")}>
            {chat.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{chat.time}</span>
        </div>
        <p className={cn("text-xs text-muted-foreground truncate", chat.unread && "font-semibold")}>
          {chat.preview}
        </p>
      </div>
    </button>
  );
}

function Section({
  label,
  chats,
  selected,
  onSelect,
}: {
  label: string;
  chats: Chat[];
  selected: Chat | null;
  onSelect: (chat: Chat) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-4 py-1.5 w-full hover:bg-muted/50 transition-colors"
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18 }}
          className="text-muted-foreground"
        >
          <ChevronDown size={12} />
        </motion.span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="section"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {chats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                selected={selected?.id === chat.id}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatList({
  selected,
  onSelect,
}: {
  selected: Chat | null;
  onSelect: (chat: Chat) => void;
}) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button className="flex items-center gap-1 font-semibold text-foreground text-base hover:text-muted-foreground transition-colors">
          Chat
          <ChevronDown size={16} className="text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
            <SlidersHorizontal size={16} />
          </button>
          <button className="p-1.5 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
            <SquarePen size={16} />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <Section label="Pinned" chats={pinnedChats} selected={selected} onSelect={onSelect} />
        <Section label="Recent" chats={recentChats} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
}
