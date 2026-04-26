"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChatRegular,            ChatFilled,
  VideoRegular,           VideoFilled,
  PeopleRegular,          PeopleFilled,
  PeopleCommunityRegular, PeopleCommunityFilled,
  CalendarLtrRegular,     CalendarLtrFilled,
  AlertRegular,           AlertFilled,
  SettingsRegular,        SettingsFilled,
  DatabaseRegular,        DatabaseFilled,
} from "@fluentui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "./user-menu";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { FluentIcon } from "@fluentui/react-icons";

const topNavItems: { icon: FluentIcon; iconFilled: FluentIcon; label: string; href: string; badge?: number }[] = [
  { icon: ChatRegular,            iconFilled: ChatFilled,            label: "Chat",        href: "/dashboard/chat",        badge: 1 },
  { icon: VideoRegular,           iconFilled: VideoFilled,           label: "Meet",        href: "/dashboard/meet" },
  { icon: PeopleRegular,          iconFilled: PeopleFilled,          label: "People",      href: "/dashboard/people" },
  { icon: PeopleCommunityRegular, iconFilled: PeopleCommunityFilled, label: "Communities", href: "/dashboard/communities" },
  { icon: CalendarLtrRegular,     iconFilled: CalendarLtrFilled,     label: "Calendar",    href: "/dashboard/calendar" },
  { icon: AlertRegular,           iconFilled: AlertFilled,           label: "Activity",    href: "/dashboard/activity" },
  { icon: DatabaseRegular,        iconFilled: DatabaseFilled,        label: "Schema",      href: "/dashboard/schema" },
];

const bottomNavItems: { icon: FluentIcon; iconFilled: FluentIcon; label: string; href: string }[] = [
  { icon: SettingsRegular, iconFilled: SettingsFilled, label: "Settings", href: "/dashboard/settings" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function NavItem({
  icon: Icon,
  iconFilled: IconFilled,
  label,
  href,
  badge,
  active,
}: {
  icon: FluentIcon;
  iconFilled: FluentIcon;
  label: string;
  href: string;
  badge?: number;
  active: boolean;
}) {
  const IconComponent = active ? IconFilled : Icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} className="relative flex flex-col items-center justify-center w-full py-2.5 group">
          {/* Active left border */}
          {active && (
            <motion.div
              layoutId="sidebar-indicator"
              transition={{ duration: 0.22, ease: EASE }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary rounded-r-full"
            />
          )}

          {/* Icon */}
          <div className="relative">
            <IconComponent
              className={cn(
                "transition-colors duration-150",
                active
                  ? "text-primary"
                  : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-100"
              )}
              style={{ fontSize: 28, width: 28, height: 28 }}
            />
            {badge && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center px-1">
                {badge}
              </span>
            )}
          </div>

          {/* Label */}
          <span className={cn(
            "text-[10px] mt-1 font-medium leading-none transition-colors duration-150",
            active
              ? "text-primary"
              : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-100"
          )}>
            {label}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard/chat") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/chat");
    }
    return pathname.startsWith(href);
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen bg-background overflow-hidden">

        {/* ── Sidebar ── */}
        <nav className="flex flex-col items-center w-20 bg-[#f3f3f3] dark:bg-zinc-900 border-r border-border shrink-0 py-2 overflow-visible">

          {/* Logo */}
          <Link href="/dashboard/chat" className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
          </Link>

          {/* Top nav */}
          <div className="flex flex-col items-center flex-1 w-full">
            {topNavItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>

          {/* Bottom nav */}
          <div className="flex flex-col items-center w-full pb-1">
            <div className="flex flex-col items-center gap-1 w-full mb-1">
              <ThemeToggle />
            </div>
            {bottomNavItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <div className="mt-2">
              <UserMenu />
            </div>
          </div>
        </nav>

        {/* ── Main content ── */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex-1 overflow-hidden bg-background"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
