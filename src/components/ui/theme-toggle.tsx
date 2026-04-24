"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Sun, Moon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-toggle]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!mounted) {
    return <div className={cn("w-10 h-10 rounded-lg bg-muted animate-pulse", className)} />;
  }

  const current = themes.find((t) => t.value === theme) ?? themes[0];
  const CurrentIcon = current.icon;

  return (
    <div className={cn("relative", className)} data-theme-toggle>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-100"
        )}
        aria-label="Toggle theme"
      >
        <CurrentIcon size={22} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-full ml-3 w-44 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-[100]"
            style={{ transformOrigin: "left bottom" }}
          >
            <div className="p-1">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon size={15} />
                    <span className="flex-1 text-left">{t.label}</span>
                    {isActive && <Check size={13} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
