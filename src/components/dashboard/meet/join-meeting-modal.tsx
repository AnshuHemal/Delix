"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function JoinMeetingModal({ open, onClose }: JoinMeetingModalProps) {
  const [meetingId, setMeetingId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [idFocused, setIdFocused] = useState(false);

  function handleJoin() {
    if (!meetingId.trim()) return;
    // TODO: implement join logic
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl shadow-black/10 border border-border pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-5">
                <h2 className="text-base font-bold text-foreground">
                  Join a meeting with an ID
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Meeting ID field */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                    Meeting ID
                    <Info size={14} className="text-muted-foreground" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      onFocus={() => setIdFocused(true)}
                      onBlur={() => setIdFocused(false)}
                      placeholder="Type a meeting ID"
                      className="w-full bg-muted/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border-b-2 transition-colors"
                      style={{
                        borderBottomColor: idFocused ? "var(--primary)" : "transparent",
                      }}
                    />
                  </div>
                </div>

                {/* Passcode field */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Type a meeting passcode
                  </label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Type a meeting passcode"
                    className="w-full bg-muted/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-primary/40 transition-colors"
                  />
                </div>

                {/* Join button */}
                <button
                  onClick={handleJoin}
                  disabled={!meetingId.trim()}
                  className={cn(
                    "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150",
                    meetingId.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Join meeting
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
