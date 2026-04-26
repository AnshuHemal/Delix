"use client";

import { motion } from "framer-motion";
import { Users, Clock, Settings, MoreHorizontal, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { myProfile } from "./people-data";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Tab = "all" | "active";

interface PeopleSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navItems: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "all",    icon: Users, label: "All contacts" },
  { id: "active", icon: Clock, label: "Active now"   },
];

export function PeopleSidebar({ activeTab, onTabChange }: PeopleSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="w-64 shrink-0 border-r border-border flex flex-col bg-sidebar overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-[14px] border-b border-border shrink-0">
        <h1 className="text-base font-semibold text-foreground">People</h1>
        <button
          aria-label="Settings"
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* ── Nav items ── */}
      <nav className="px-2 py-2 space-y-0.5 shrink-0">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── My profile ── */}
      <div className="mt-3 px-2 shrink-0">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          You
        </p>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
          <ContactAvatar contact={myProfile} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {myProfile.name}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">Your profile</p>
          </div>
          <button
            aria-label="More options"
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted/80 transition-all text-muted-foreground"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Invite footer ── */}
      <div className="p-3 border-t border-border shrink-0">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <UserPlus size={14} />
          Invite to Delix
        </button>
      </div>
    </motion.aside>
  );
}
