"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Overview", href: "#" },
    { label: "Features", href: "#features" },
    { label: "Solutions", href: "#", badge: "New" },
    { label: "Tutorials", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Releases", href: "#" },
  ],
  Company: [
    { label: "About us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "News", href: "#" },
    { label: "Media kit", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Resources: [
    { label: "Blog", href: "#" },
    { label: "Newsletter", href: "#" },
    { label: "Events", href: "#" },
    { label: "Help centre", href: "#" },
    { label: "Tutorials", href: "#" },
    { label: "Support", href: "#" },
  ],
  "Use cases": [
    { label: "Startups", href: "#" },
    { label: "Enterprise", href: "#" },
    { label: "Government", href: "#" },
    { label: "SaaS centre", href: "#" },
    { label: "Marketplaces", href: "#" },
    { label: "Ecommerce", href: "#" },
  ],
  Social: [
    { label: "X", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "Facebook", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "AngelList", href: "#" },
    { label: "Dribbble", href: "#" },
  ],
  Legal: [
    { label: "Terms", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "Licenses", href: "#" },
    { label: "Settings", href: "#" },
    { label: "Contact", href: "#" },
  ],
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border">

        {/* CTA section */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col items-center text-center py-16 lg:py-20 border-b border-border"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-medium text-foreground tracking-tight"
          >
            Start growing with Delix
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-base text-muted-foreground"
          >
            Join over 10,000+ teams already working smarter with Delix.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
            <Link
              href="#contact"
              className="inline-flex items-center h-11 px-6 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Chat to us
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Get started
            </Link>
          </motion.div>
        </motion.div>

        {/* Link grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 py-12"
        >
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                      {"badge" in link && link.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-between py-8 border-t border-border"
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Delix</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Delix, Inc. All rights reserved.
          </p>
        </motion.div>

      </div>
    </footer>
  );
}
