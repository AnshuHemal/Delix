"use client";

import { motion } from "framer-motion";
import { MessageSquare, Phone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { type Contact, statusConfig } from "./people-data";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const rowVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

interface ContactRowProps {
  contact: Contact;
  onMessage?: (contact: Contact) => void;
  onCall?:    (contact: Contact) => void;
  onMore?:    (contact: Contact) => void;
}

export function ContactRow({
  contact,
  onMessage,
  onCall,
  onMore,
}: ContactRowProps) {
  const { label: statusLabel } = statusConfig[contact.status];

  return (
    <motion.div
      variants={rowVariants}
      className={cn(
        "grid items-center px-5 py-0 border-b border-border/60",
        "hover:bg-muted/30 transition-colors cursor-pointer group",
        // columns: name | actions (inline) | email | phone
        "grid-cols-[minmax(180px,2fr)_auto_minmax(160px,2fr)_minmax(100px,1fr)]"
      )}
      style={{ minHeight: 44 }}
    >
      {/* ── Name + avatar ── */}
      <div className="flex items-center gap-3 min-w-0 py-2.5">
        <ContactAvatar contact={contact} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {contact.name}
          </p>
          {contact.status !== "Available" && (
            <p className="text-xs text-muted-foreground leading-tight">{statusLabel}</p>
          )}
        </div>
      </div>

      {/* ── Inline action buttons (visible on hover) ── */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-3">
        <button
          aria-label={`Message ${contact.name}`}
          onClick={(e) => { e.stopPropagation(); onMessage?.(contact); }}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <MessageSquare size={14} />
        </button>
        <button
          aria-label={`Call ${contact.name}`}
          onClick={(e) => { e.stopPropagation(); onCall?.(contact); }}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Phone size={14} />
        </button>
        <button
          aria-label={`More options for ${contact.name}`}
          onClick={(e) => { e.stopPropagation(); onMore?.(contact); }}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* ── Email ── */}
      <span className="text-sm text-primary truncate pr-4">
        {contact.email ?? ""}
      </span>

      {/* ── Phone ── */}
      <span className="text-sm text-muted-foreground truncate">
        {contact.phone ?? ""}
      </span>
    </motion.div>
  );
}
