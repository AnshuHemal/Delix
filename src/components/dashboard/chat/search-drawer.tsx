"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  senderName?: string;
  isDateSeparator?: boolean;
};

type SearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  messages: Message[];
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function SearchIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-44 h-36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background document stack */}
      <rect x="30" y="40" width="80" height="100" rx="8" fill="#EEF2FF" />
      <rect x="38" y="32" width="80" height="100" rx="8" fill="#E0E7FF" />
      <rect x="46" y="24" width="80" height="100" rx="8" fill="#C7D2FE" />

      {/* Document lines */}
      <rect x="58" y="50" width="52" height="5" rx="2.5" fill="#818CF8" opacity="0.5" />
      <rect x="58" y="62" width="40" height="5" rx="2.5" fill="#818CF8" opacity="0.4" />
      <rect x="58" y="74" width="46" height="5" rx="2.5" fill="#818CF8" opacity="0.3" />
      <rect x="58" y="86" width="34" height="5" rx="2.5" fill="#818CF8" opacity="0.2" />

      {/* Magnifier circle */}
      <circle cx="138" cy="88" r="34" fill="url(#bgCircle)" opacity="0.15" />
      <circle cx="138" cy="88" r="26" fill="white" stroke="url(#ringGrad)" strokeWidth="5" />

      {/* Dots inside magnifier */}
      <circle cx="128" cy="88" r="5" fill="#6366F1" />
      <circle cx="138" cy="88" r="5" fill="#8B5CF6" />
      <circle cx="148" cy="88" r="5" fill="#A78BFA" />

      {/* Handle */}
      <line x1="158" y1="108" x2="174" y2="126" stroke="url(#handleGrad)" strokeWidth="7" strokeLinecap="round" />

      <defs>
        <linearGradient id="bgCircle" x1="104" y1="54" x2="172" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="112" y1="62" x2="164" y2="114" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="handleGrad" x1="158" y1="108" x2="174" y2="126" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SearchDrawer({ open, onClose, messages }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  function handleClose() {
    setQuery("");
    setHasAttachment(false);
    onClose();
  }

  const results = query.trim()
    ? messages.filter(
        (m) => !m.isDateSeparator && m.text.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col h-full w-full bg-background">
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 border-b border-border">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-foreground leading-5">Find in chat</h2>
              <div className="pb-4.5" />
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground -mt-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search input */}
          <div className="px-4 pt-4 pb-3 shrink-0">
            <div className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
              "border-primary bg-background"
            )}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a search keyword..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <Search size={15} className="text-muted-foreground shrink-0" />
            </div>

            {/* Filter chip */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => setHasAttachment((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  hasAttachment
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <Paperclip size={11} />
                Has attachment
              </button>
            </div>
          </div>

          {/* Results / Empty state */}
          <div className="flex-1 overflow-y-auto">
            {query.trim() === "" ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
                className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center pb-16"
              >
                <SearchIllustration />
                <div>
                  <p className="text-sm font-semibold text-foreground">Search in this chat</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Find messages and links shared in this chat.
                  </p>
                </div>
              </motion.div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center pb-16">
                <p className="text-sm font-semibold text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground">
                  Try a different keyword.
                </p>
              </div>
            ) : (
              <div className="px-4 py-2 flex flex-col gap-1">
                <p className="text-xs text-muted-foreground px-1 py-2">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.04, ease: EASE }}
                    className="p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {msg.sent ? "You" : (msg.senderName ?? "Them")}
                      </span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {/* Highlight matching text */}
                      {msg.text.split(new RegExp(`(${query})`, "gi")).map((part, j) =>
                        part.toLowerCase() === query.toLowerCase() ? (
                          <mark key={j} className="bg-primary/20 text-primary rounded px-0.5">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
  );
}
