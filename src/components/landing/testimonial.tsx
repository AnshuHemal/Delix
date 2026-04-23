"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const testimonials = [
  {
    company: "Wildcrafted",
    companyIcon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5L18 8v8l-6 3.75L6 16V8l6-3.5z" />
      </svg>
    ),
    quote: "We've been using Delix to kick start every new project and can't imagine working without it.",
    name: "Amélie Laurent",
    role: "Product Manager, Wildcrafted",
    // randomuser.me stable portrait URL
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    avatarFallback: "AL",
  },
  {
    company: "Kintsugi",
    companyIcon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
      </svg>
    ),
    quote: "Delix replaced four different tools for us. It's saved our team hours every single week.",
    name: "Marcus Chen",
    role: "Engineering Lead, Kintsugi",
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    avatarFallback: "MC",
  },
  {
    company: "Warpspeed",
    companyIcon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    quote: "Our remote team feels more connected than ever. Delix is simply the best collaboration tool.",
    name: "Sofia Reyes",
    role: "Head of Operations, Warpspeed",
    avatarSrc: "https://randomuser.me/api/portraits/women/68.jpg",
    avatarFallback: "SR",
  },
  {
    company: "Magnolia",
    companyIcon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    quote: "We evaluated six platforms before choosing Delix. The design and reliability are simply unmatched.",
    name: "James Okafor",
    role: "CTO, Magnolia",
    avatarSrc: "https://randomuser.me/api/portraits/men/75.jpg",
    avatarFallback: "JO",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Testimonial() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function goTo(i: number) {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  }

  const t = testimonials[index];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
    exit: (d: number) => ({ opacity: 0, x: d * -40, scale: 0.97, transition: { duration: 0.3 } }),
  };

  return (
    <section className="py-10 lg:py-14 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center min-h-[280px] justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center"
            >
              {/* Company */}
              <div className="flex items-center gap-2 text-muted-foreground mb-8">
                <span className="text-foreground">{t.companyIcon}</span>
                <span className="text-sm font-semibold text-foreground">{t.company}</span>
              </div>

              {/* Quote */}
              <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground leading-snug tracking-tight max-w-4xl">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border shadow-md">
                  <Image
                    src={t.avatarSrc}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="group p-1"
              aria-label={`Go to testimonial ${i + 1}`}
            >
              <motion.div
                animate={{
                  width: i === index ? 24 : 8,
                  backgroundColor: i === index ? "var(--primary)" : "var(--border)",
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-2 rounded-full"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
