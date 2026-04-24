"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  CalendarPlus,
  LogIn,
  MoreHorizontal,
  CalendarDays,
  Clock,
  Users,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export function MeetView() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const meetLink = "https://delix.app/meet/me-xyz-123";

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-8 py-8 space-y-8"
      >

        {/* ── Hero header ── */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-2xl overflow-hidden bg-linear-to-br from-primary via-primary/90 to-indigo-700 p-8 text-primary-foreground shadow-xl shadow-primary/20"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1 opacity-80">
                <Clock size={14} />
                <span className="text-sm">{timeStr} · {dateStr}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Good to see you.</h1>
              <p className="mt-1 text-primary-foreground/70 text-sm">Ready to connect with your team?</p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
              >
                <Video size={16} />
                New meeting
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-primary-foreground font-semibold text-sm border border-white/20 hover:bg-white/25 transition-colors"
              >
                <CalendarPlus size={16} />
                Schedule
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-primary-foreground font-semibold text-sm border border-white/20 hover:bg-white/25 transition-colors"
              >
                <LogIn size={16} />
                Join
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Two column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Meeting link card */}
          <motion.div
            variants={fadeUp}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 size={16} className="text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Your meeting link</h2>
              </div>
              <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <MoreHorizontal size={15} />
              </button>
            </div>

            {/* Avatar + info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                Me
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Personal meeting room</p>
                <p className="text-xs text-muted-foreground">Created 3 days ago</p>
              </div>
            </div>

            {/* Link display */}
            <div className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2 mb-4">
              <span className="text-xs text-muted-foreground truncate mr-2">{meetLink}</span>
              <CopyButton text={meetLink} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                Join now
              </button>
              <button className="flex-1 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors">
                Share link
              </button>
              <button className="flex-1 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors">
                Chat
              </button>
            </div>
          </motion.div>

          {/* Scheduled meetings card */}
          <motion.div
            variants={fadeUp}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays size={16} className="text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Upcoming meetings</h2>
              </div>
              <button className="text-xs text-primary hover:underline transition-colors">
                View calendar
              </button>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <CalendarDays size={24} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No meetings scheduled</p>
                <p className="text-xs text-muted-foreground mt-1">Your upcoming meetings will appear here.</p>
              </div>
              <button className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                <CalendarPlus size={13} />
                Schedule a meeting
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── Stats row ── */}
        <motion.div variants={fadeIn} className="grid grid-cols-3 gap-4">
          {[
            { icon: Video, label: "Meetings this week", value: "0", color: "text-violet-500", bg: "bg-violet-500/10" },
            { icon: Users, label: "People connected", value: "0", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: Clock, label: "Hours in meetings", value: "0h", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.bg)}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

      </motion.div>
    </div>
  );
}
