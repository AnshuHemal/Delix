"use client";

import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactRow } from "./contact-row";
import { type Contact } from "./people-data";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden:   {},
  visible:  { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
};

export type SortKey = "name" | "email" | "phone";

interface ContactsTableProps {
  contacts: Contact[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  activeTab: "all" | "active";
}

function SortIcon({ col, sortKey, sortAsc }: { col: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== col)
    return <ChevronUp size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />;
  return sortAsc
    ? <ChevronUp  size={11} className="text-primary" />
    : <ChevronDown size={11} className="text-primary" />;
}

export function ContactsTable({
  contacts,
  sortKey,
  sortAsc,
  onSort,
  activeTab,
}: ContactsTableProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Hint bar ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
        className="px-5 py-2.5 text-xs text-muted-foreground border-b border-border shrink-0"
      >
        {activeTab === "all"
          ? "Find people you know in Delix by searching or inviting them."
          : "People who are currently active and available to connect."}
      </motion.p>

      {/* ── Column headers ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.08, ease: EASE }}
        className={cn(
          "grid items-center px-5 py-2 border-b border-border shrink-0",
          "grid-cols-[minmax(180px,2fr)_auto_minmax(160px,2fr)_minmax(100px,1fr)]",
          "text-xs font-semibold text-muted-foreground"
        )}
      >
        {/* Name sort */}
        <button
          onClick={() => onSort("name")}
          className="flex items-center gap-1 text-left group w-fit"
        >
          Name
          <SortIcon col="name" sortKey={sortKey} sortAsc={sortAsc} />
        </button>

        {/* Spacer for action buttons column */}
        <span className="w-[88px]" />

        {/* Email sort */}
        <button
          onClick={() => onSort("email")}
          className="flex items-center gap-1 text-left group w-fit"
        >
          Email
          <SortIcon col="email" sortKey={sortKey} sortAsc={sortAsc} />
        </button>

        {/* Phone sort */}
        <button
          onClick={() => onSort("phone")}
          className="flex items-center gap-1 text-left group w-fit"
        >
          Phone
          <SortIcon col="phone" sortKey={sortKey} sortAsc={sortAsc} />
        </button>
      </motion.div>

      {/* ── Rows ── */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col items-center justify-center h-full gap-3 text-center px-8"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <RefreshCw size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground">
              Try a different search term or invite someone to Delix.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {contacts.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
