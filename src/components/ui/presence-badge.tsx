"use client";

import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/types";

interface PresenceBadgeProps {
  status: PresenceStatus;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  PresenceStatus,
  { color: string; label: string }
> = {
  AVAILABLE:      { color: "bg-emerald-500",  label: "Available" },
  BUSY:           { color: "bg-red-500",       label: "Busy" },
  DO_NOT_DISTURB: { color: "bg-red-500",       label: "Do not disturb" },
  BE_RIGHT_BACK:  { color: "bg-yellow-400",    label: "Be right back" },
  AWAY:           { color: "bg-yellow-400",    label: "Away" },
  OFFLINE:        { color: "bg-zinc-400",      label: "Offline" },
};

const sizeMap = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-[1.5px]",
  md: "w-3.5 h-3.5 border-2",
};

export function PresenceBadge({ status, size = "sm", className }: PresenceBadgeProps) {
  const { color, label } = statusConfig[status] ?? statusConfig.OFFLINE;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "rounded-full border-background shrink-0",
        color,
        sizeMap[size],
        // DND gets a minus indicator
        status === "DO_NOT_DISTURB" && "relative after:absolute after:inset-x-[2px] after:top-1/2 after:-translate-y-1/2 after:h-[2px] after:bg-white after:rounded-full",
        className
      )}
    />
  );
}

export { statusConfig };
