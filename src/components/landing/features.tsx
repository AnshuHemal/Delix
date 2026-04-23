"use client";

import { motion } from "framer-motion";
import { MessageSquare, Zap, BarChart2, Users, Grid3x3, Headphones } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Real-time team chat",
    description: "Whether you have a team of 2 or 200, our threaded conversations keep everyone on the same page and in the loop.",
  },
  {
    icon: Zap,
    title: "Instant video meetings",
    description: "Launch HD video calls in one click. Screen sharing, recording, and virtual backgrounds built in. No downloads required.",
  },
  {
    icon: BarChart2,
    title: "Team analytics & insights",
    description: "Measure what matters with real-time reports. Track engagement, meeting time, and collaboration patterns at a glance.",
  },
  {
    icon: Users,
    title: "Smart scheduling",
    description: "AI-powered meeting scheduler finds the perfect time for everyone. Integrates with Google Calendar and Outlook seamlessly.",
  },
  {
    icon: Grid3x3,
    title: "100+ integrations",
    description: "Connect the tools you already use. Slack, Notion, Figma, GitHub, and 100+ more. Plus, our extensive developer API.",
  },
  {
    icon: Headphones,
    title: "24/7 expert support",
    description: "We're an extension of your team. Chat with our friendly support team anytime you need help. Average response time: 2 minutes.",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export function Features() {
  return (
    <section id="features" className="pb-20 lg:pb-28 pt-8 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary mb-3">Features</p>
          <h2 className="text-4xl sm:text-5xl font-medium text-foreground tracking-tight leading-tight">
            Everything your team needs to collaborate
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Powerful features designed to help you work faster, communicate better,
            and stay organized. Trusted by over 10,000 teams worldwide.
          </p>
        </motion.div>

        {/* 3×2 Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex flex-col items-center text-center group cursor-default"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
                <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              </div>

              {/* Text */}
              <h3 className="text-base font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
