"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, MessageSquare, Video, Calendar, Users, Settings, Search, Zap, ChevronLeft, Hash, Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "./user-menu";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: MessageSquare, label: "Chat", href: "/dashboard/chat", badge: 3 },
  { icon: Video, label: "Meetings", href: "/dashboard/meetings" },
  { icon: Calendar, label: "Calendar", href: "/dashboard/calendar" },
  { icon: Users, label: "Teams", href: "/dashboard/teams" },
];

const channels = [
  { name: "general", unread: 2 },
  { name: "engineering", unread: 0 },
  { name: "design", unread: 5 },
  { name: "marketing", unread: 0 },
  { name: "random", unread: 1 },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-muted/30 overflow-hidden">

        {/* Icon rail */}
        <div className="flex flex-col items-center w-16 bg-foreground border-r border-border/20 py-4 gap-1 shrink-0">
          <Link href="/dashboard" className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
          </Link>

          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-background/50 hover:text-background hover:bg-background/10"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}

          <div className="mt-auto flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard/settings"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-background/50 hover:text-background hover:bg-background/10 transition-all"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            <UserMenu />
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden shrink-0"
            >
              {/* Workspace header */}
              <div className="px-4 py-4 border-b border-sidebar-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-sidebar-foreground">Acme Corp</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Free plan</p>
                  </div>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-3 py-3">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 text-muted-foreground hover:text-sidebar-foreground text-sm transition-colors">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search...</span>
                  <kbd className="ml-auto text-xs bg-border px-1.5 py-0.5 rounded">⌘K</kbd>
                </button>
              </div>

              {/* Channels */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                  <button className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {channels.map((ch) => (
                  <Link key={ch.name} href={`/dashboard/chat/${ch.name}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm flex-1 truncate">{ch.name}</span>
                    {ch.unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {ch.unread}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-r-md bg-border hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground items-center justify-center transition-all hidden lg:flex"
          style={{ left: collapsed ? 64 : 304 }}
        >
          <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
        </button>

        {/* Main */}
        <main className="flex-1 overflow-hidden bg-background">{children}</main>
      </div>
    </TooltipProvider>
  );
}
