"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2 } from "lucide-react";

interface MeetNowModalProps {
  open: boolean;
  onClose: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function MeetNowModal({ open, onClose }: MeetNowModalProps) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGetLink() {
    const link = `https://delix.app/meet/${Date.now()}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
    // TODO: implement start meeting logic
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
                  Start a meeting now
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Meeting name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Meeting name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Meeting with Hemal Katariya"
                    autoFocus
                    className="w-full bg-background rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors"
                  />
                </div>

                {/* Get a link to share */}
                <button
                  onClick={handleGetLink}
                  className="w-full py-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 size={15} className="text-muted-foreground" />
                  {copied ? "Link copied!" : "Get a link to share"}
                </button>

                {/* Start meeting */}
                <button
                  onClick={handleStart}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                >
                  Start meeting
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
