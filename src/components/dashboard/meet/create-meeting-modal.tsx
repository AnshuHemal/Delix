"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function CreateMeetingModal({ open, onClose }: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");

  function handleCreate() {
    // TODO: implement create logic
    const link = `https://delix.app/meet/${Date.now()}`;
    navigator.clipboard.writeText(link).catch(() => {});
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
                  Give your meeting a title
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Title input */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting with Hemal Katariya"
                  autoFocus
                  className="w-full bg-muted/50 rounded-lg px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-primary/40 transition-colors"
                />

                {/* Create button */}
                <button
                  onClick={handleCreate}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                  Create and copy link
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
