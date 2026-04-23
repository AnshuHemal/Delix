"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Video, MessageSquare, Calendar, Hash, Home, Users, Settings, Search, BarChart2, CheckSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };

// Sidebar nav items for the mockup
const sidebarItems = [
  { icon: Home, label: "Home" },
  { icon: BarChart2, label: "Dashboard", active: true },
  { icon: Users, label: "Teams" },
  { icon: CheckSquare, label: "Tasks", badge: "8" },
  { icon: FileText, label: "Docs" },
  { icon: Settings, label: "Settings" },
];

// Stat cards for the mockup
const stats = [
  { label: "Active meetings", value: "24", change: "+12%", up: true },
  { label: "Messages today", value: "1,847", change: "+6.2%", up: true },
  { label: "Online now", value: "312", change: "+0.8%", up: true },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden pt-28 pb-0">

      {/* ── Full-screen grid background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />
      {/* Radial fade — grid disappears toward center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 85% 55% at 50% 40%, var(--background) 40%, transparent 100%)",
        }}
      />
      {/* Bottom fade — grid bleeds into dashboard */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-linear-to-t from-background to-transparent pointer-events-none" />

      {/* ── Content ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-5xl mx-auto"
      >
        {/* Announcement badge */}
        <motion.div variants={fadeUp} className="mb-6">
          <Link
            href="#"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-background/80 backdrop-blur-sm text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-medium text-foreground">New feature</span>
            <span className="text-muted-foreground">Check out the team dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-medium text-foreground tracking-tight leading-[1.08]"
        >
          One workspace for your
          <br />
          <span className="text-primary">Entire team.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-muted-foreground max-w-3xl leading-relaxed"
        >
          Delix brings meetings, chat, files, and scheduling into one beautiful
          workspace. Built for teams that move fast and work smart.
          Trusted by over 10,000 teams worldwide.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-6 font-semibold gap-2 rounded-full"
          >
            <Play className="w-4 h-4" />
            Demo
          </Button>
          <Button
            size="lg"
            className="h-11 px-6 font-semibold rounded-full"
            asChild
          >
            <Link href="/signup">Sign up</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* ── Dashboard mockup ── */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
        className="relative z-10 w-full max-w-6xl mx-auto mt-14 px-4"
      >
        <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/5 overflow-hidden">

          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
            <div className="w-3 h-3 rounded-full bg-destructive/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
            <div className="w-3 h-3 rounded-full bg-green-400/50" />
            <div className="flex-1 flex items-center justify-center">
              <div className="h-5 w-52 rounded-md bg-border/80" />
            </div>
          </div>

          {/* App body */}
          <div className="flex h-[420px] sm:h-[500px]">

            {/* Sidebar */}
            <div className="w-52 shrink-0 border-r border-border bg-sidebar flex-col py-3 px-2 gap-0.5 hidden sm:flex">
              {/* Logo row */}
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-[10px] font-semibold">D</span>
                </div>
                <span className="text-sm font-semibold text-sidebar-foreground">Delix</span>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sidebar-accent mb-2 mx-1">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">Search</span>
                <kbd className="text-[10px] text-muted-foreground bg-border px-1 rounded">⌘K</kbd>
              </div>

              {/* Nav items */}
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    item.active
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">My dashboard</h2>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-24 rounded-md bg-muted border border-border" />
                  <div className="h-7 w-20 rounded-md bg-muted border border-border" />
                  <div className="h-7 w-20 rounded-md bg-muted border border-border" />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 px-6 pt-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                      </div>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full">
                      ↑ {stat.change}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="flex-1 px-6 pt-4 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Team activity</p>
                    <p className="text-2xl font-semibold text-foreground mt-0.5">$7,804.16</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {["12 months", "30 days", "7 days", "24 hours"].map((t, i) => (
                      <button
                        key={t}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                          i === 0
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG chart */}
                <div className="w-full h-28 relative">
                  <svg viewBox="0 0 800 120" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 30, 60, 90].map((y) => (
                      <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="var(--border)" strokeWidth="1" />
                    ))}
                    {/* Filled area */}
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,90 C50,85 100,80 150,75 C200,70 250,72 300,65 C350,58 400,55 450,48 C500,41 550,38 600,30 C650,22 700,18 750,12 L800,8 L800,120 L0,120 Z"
                      fill="url(#chartGrad)"
                    />
                    {/* Main line */}
                    <path
                      d="M0,90 C50,85 100,80 150,75 C200,70 250,72 300,65 C350,58 400,55 450,48 C500,41 550,38 600,30 C650,22 700,18 750,12 L800,8"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Dotted comparison line */}
                    <path
                      d="M0,100 C50,98 100,95 150,92 C200,89 250,88 300,85 C350,82 400,80 450,76 C500,72 550,70 600,65 C650,60 700,56 750,50 L800,46"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                      strokeDasharray="5,4"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1 px-0.5">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                      <span key={m} className="text-[10px] text-muted-foreground">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

    </section>
  );
}
