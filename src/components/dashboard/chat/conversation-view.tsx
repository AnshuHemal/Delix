"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { init } from "emoji-mart";
import { useTheme } from "next-themes";
import {
  Video, Phone, Search, MoreHorizontal,
  Smile, Image as ImageIcon, Paperclip, AtSign, Plus, Send,
  MessageSquareDashed, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

init({ data });

const Picker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false }
);

type Chat = {
  id: string;
  name: string;
  online: boolean;
  avatar?: string;
  initials?: string;
  avatarColor?: string;
  [key: string]: unknown;
};

type Message = {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  senderName?: string;
  senderInitials?: string;
  senderColor?: string;
  isDateSeparator?: boolean;
  dateLabel?: string;
};

const mockMessages: Message[] = [
  { id: "sep1", text: "", sent: false, time: "", isDateSeparator: true, dateLabel: "27 March 04:44 PM" },
  { id: "1", text: "Hii", sent: true, time: "04:44 PM" },
  { id: "2", text: "Hello", sent: false, time: "04:45 PM", senderName: "Kunal Fauzdar", senderInitials: "KF", senderColor: "bg-violet-200 text-violet-800" },
  { id: "3", text: "Kya hua.. Jag suna suna ho gya.. 🤣", sent: true, time: "04:46 PM" },
  { id: "4", text: "Haan , aise hi accha lagta hain", sent: false, time: "04:47 PM", senderName: "Kunal Fauzdar", senderInitials: "KF", senderColor: "bg-violet-200 text-violet-800" },
  { id: "5", text: "😂", sent: true, time: "04:48 PM" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const tabs = ["Chat", "Files", "Photos"];

function isEmojiOnly(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  return emojiRegex.test(stripped) && stripped.length <= 8;
}

function TopBarAvatar({ chat }: { chat: Chat }) {
  return (
    <div className="relative shrink-0">
      {chat.avatar ? (
        <Image src={chat.avatar as string} alt={chat.name} width={32} height={32} unoptimized
          className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold", chat.avatarColor as string)}>
          {chat.initials}
        </div>
      )}
      <span className={cn(
        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
        chat.online ? "bg-green-500" : "bg-muted-foreground"
      )} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <MessageSquareDashed className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="font-semibold text-foreground">Select a conversation</p>
      <p className="text-sm text-muted-foreground">
        Choose from your existing conversations or start a new one.
      </p>
    </div>
  );
}

// Timestamp label — fades in on parent group hover
function TimeLabel({ time, side }: { time: string; side: "left" | "right" }) {
  return (
    <span className={cn(
      "text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 select-none whitespace-nowrap",
      side === "right" ? "self-end mb-0.5" : "self-end mb-0.5"
    )}>
      {time}
    </span>
  );
}

export function ConversationView({
  chat,
  showSearch,
  onToggleSearch,
}: {
  chat: Chat | null;
  showSearch: boolean;
  onToggleSearch: () => void;
}) {
  const [activeTab, setActiveTab] = useState("Chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [showPicker, setShowPicker] = useState(false);
  const { resolvedTheme } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const smileRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat]);

  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        smileRef.current && !smileRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPicker]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        text,
        sent: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  }

  if (!chat) {
    return (
      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
        <EmptyState />
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={chat.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex flex-col h-full bg-background"
      >

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 shrink-0 border-b border-border min-h-[52px]">
          <div className="flex items-center gap-3 self-stretch">
            {/* Avatar centered vertically */}
            <div className="flex items-center">
              <TopBarAvatar chat={chat} />
            </div>

            {/* Name + tabs in one row, tabs pinned to bottom via self-end */}
            <div className="flex items-center gap-4 self-stretch">
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {chat.name}
              </span>

              <div className="flex items-end self-stretch">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative px-3 pb-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                      activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div layoutId="conv-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        transition={{ duration: 0.2, ease: EASE }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 py-2.5">
            {[
              { icon: Video, label: "Video call", onClick: undefined },
              { icon: Phone, label: "Audio call", onClick: undefined },
              { icon: Users, label: "Participants", onClick: undefined },
              { icon: Search, label: "Search", onClick: () => onToggleSearch() },
              { icon: MoreHorizontal, label: "More", onClick: undefined },
            ].map(({ icon: Icon, label, onClick }) => (
              <button key={label} title={label} onClick={onClick}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  label === "Search" && showSearch
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto flex flex-col px-26 py-6">
          <div className="mt-auto flex flex-col gap-1">
            {messages.map((msg) => {
              if (msg.isDateSeparator) {
                return (
                  <div key={msg.id} className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground">{msg.dateLabel}</span>
                  </div>
                );
              }

              const emojiOnly = isEmojiOnly(msg.text);

              if (msg.sent) {
                return (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={cn(
                      "flex justify-end items-center gap-3 group",
                      emojiOnly ? "mb-4" : "mb-1"
                    )}
                  >
                    {/* Timestamp left of message */}
                    <TimeLabel time={msg.time} side="left" />

                    {emojiOnly ? (
                      <div className="relative">
                        <motion.span
                          whileHover={{ scale: 1.3, rotate: [0, -10, 10, -5, 0] }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="text-6xl leading-none select-none cursor-default inline-block"
                          style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))" }}
                        >
                          {msg.text}
                        </motion.span>
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                      </div>
                    ) : (
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed max-w-[65%]">
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                );
              }

              return (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className={cn(
                    "flex items-end gap-2 group",
                    emojiOnly ? "mb-4" : "mb-1"
                  )}
                >
                  <div className="relative shrink-0 self-end mb-0.5">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold",
                      msg.senderColor ?? "bg-violet-200 text-violet-800"
                    )}>
                      {msg.senderInitials ?? "?"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 ring-1 ring-background" />
                  </div>

                  <div className="flex flex-col max-w-[65%]">
                    {msg.senderName && (
                      <span className="text-xs text-muted-foreground mb-1 ml-0.5">{msg.senderName}</span>
                    )}
                    {emojiOnly ? (
                      <motion.span
                        whileHover={{ scale: 1.3, rotate: [0, -10, 10, -5, 0] }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="text-6xl leading-none select-none cursor-default inline-block"
                        style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))" }}
                      >
                        {msg.text}
                      </motion.span>
                    ) : (
                      <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed">
                        {msg.text}
                      </div>
                    )}
                  </div>

                  {/* Timestamp right of message */}
                  <TimeLabel time={msg.time} side="right" />
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="px-26 py-4 shrink-0">
          <div className="relative">
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  ref={pickerRef}
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-xl overflow-hidden"
                  style={{ transformOrigin: "bottom right" }}
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: { native: string }) => {
                      setInput((prev) => prev + emoji.native);
                    }}
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
                    set="native"
                    previewPosition="none"
                    skinTonePosition="none"
                    maxFrequentRows={2}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-sm">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  ref={smileRef}
                  onClick={() => setShowPicker((v) => !v)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    showPicker ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Smile size={17} />
                </button>
                {[ImageIcon, Paperclip, AtSign, Plus].map((Icon, i) => (
                  <button key={i} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Icon size={17} />
                  </button>
                ))}
                <button onClick={handleSend} disabled={!input.trim()}
                  className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
