"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, MessageCircle, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const helpLinks = [
  { icon: FileQuestion, title: "Documentation", description: "Dive in to learn all about our product.", label: "Start learning", href: "#" },
  { icon: BookOpen, title: "Our blog", description: "Read the latest posts on our blog.", label: "View latest posts", href: "#" },
  { icon: MessageCircle, title: "Chat to us", description: "Can't find what you're looking for?", label: "Chat to our team", href: "#" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.35 + i * 0.1 } }),
};

export function NotFoundView() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-20">

      {/* Top text */}
      <motion.div variants={stagger} initial="hidden" animate="visible"
        className="flex flex-col items-center text-center max-w-xl w-full"
      >
        <motion.p variants={fadeUp} className="text-base font-semibold text-primary mb-4">
          404 error
        </motion.p>

        <motion.h1 variants={fadeUp}
          className="text-5xl sm:text-6xl font-semibold text-foreground tracking-tight leading-[1.1]"
        >
          We lost this page
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground leading-relaxed">
          We searched high and low, but couldn&apos;t find what you&apos;re looking for.
          <br className="hidden sm:block" />
          Let&apos;s find a better place for you to go.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex items-center gap-3">
          <Button variant="outline" className="h-11 px-6 gap-2 font-semibold text-base"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>
          <Button className="h-11 px-6 font-semibold text-base" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
        {helpLinks.map((link, i) => (
          <motion.div key={link.title} custom={i} variants={cardVariants} initial="hidden" animate="visible"
            className="flex flex-col p-8 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200 cursor-pointer"
          >
            <link.icon className="w-6 h-6 text-primary mb-8" />
            <p className="text-base font-semibold text-foreground mb-1.5">{link.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{link.description}</p>
            <Link href={link.href}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mt-auto group/link"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform duration-150" />
            </Link>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
