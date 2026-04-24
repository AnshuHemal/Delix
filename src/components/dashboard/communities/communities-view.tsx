"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Sparkles, Plus, Users, Calendar, Globe, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const templates = [
  { icon: GraduationCap, label: "School", emoji: "🎓", color: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" },
  { icon: Briefcase, label: "Business", emoji: "💼", color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" },
  { icon: Sparkles, label: "Life", emoji: "✨", color: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300" },
];

const features = [
  { icon: Users, title: "Bring people together", desc: "Create spaces for your community to connect, share, and collaborate." },
  { icon: Calendar, title: "Plan events easily", desc: "Schedule and manage events so everyone stays in the loop." },
  { icon: Globe, title: "Stay organized", desc: "Channels, announcements, and resources all in one place." },
  { icon: Zap, title: "Get more done", desc: "Integrated tools to help your community move faster." },
];

export function CommunitiesView() {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-8 pt-12 pb-16"
      >

        {/* ── Hero section ── */}
        <motion.div variants={fadeUp} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-5">
            <Heart size={14} className="fill-primary" />
            Communities
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight mb-4">
            Build your community
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
            Bring your community together in one place to plan events, stay organized, and get more done.
          </p>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={18} />
            Create your own
          </motion.button>
        </motion.div>

        {/* ── Templates ── */}
        <motion.div variants={fadeUp} className="mb-14">
          <p className="text-base font-semibold text-foreground mb-4">Create with a template</p>
          <div className="flex items-center gap-3 flex-wrap">
            {templates.map((t) => (
              <motion.button
                key={t.label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTemplate(activeTemplate === t.label ? null : t.label)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all shadow-sm",
                  activeTemplate === t.label
                    ? "bg-primary/10 border-primary/40 text-primary shadow-primary/10"
                    : cn("bg-card hover:shadow-md", t.color)
                )}
              >
                <span className="text-base">{t.emoji}</span>
                {t.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Feature grid ── */}
        <motion.div variants={fadeUp}>
          <p className="text-base font-semibold text-foreground mb-5">Why communities?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground mb-1.5">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Discover banner ── */}
        <motion.div
          variants={fadeUp}
          className="mt-10 relative rounded-2xl overflow-hidden bg-linear-to-r from-primary via-primary/90 to-indigo-600 p-8 text-primary-foreground shadow-xl shadow-primary/20"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white translate-y-1/2" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">Discover</p>
              <h2 className="text-2xl font-bold mb-1">Find communities to join</h2>
              <p className="text-primary-foreground/70 text-sm">Explore public communities and connect with people who share your interests.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
            >
              <Globe size={16} />
              Browse communities
            </motion.button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
