"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  {
    label: "Products",
    href: "#",
    children: [
      { label: "Video Meetings", href: "#", description: "HD calls for your team" },
      { label: "Team Chat", href: "#", description: "Real-time messaging" },
      { label: "File Sharing", href: "#", description: "Share and collaborate" },
    ],
  },
  {
    label: "Services",
    href: "#",
    children: [
      { label: "Enterprise", href: "#", description: "For large organizations" },
      { label: "Consulting", href: "#", description: "Expert guidance" },
    ],
  },
  { label: "Pricing", href: "#pricing" },
  {
    label: "Resources",
    href: "#",
    children: [
      { label: "Documentation", href: "#", description: "Guides and API docs" },
      { label: "Blog", href: "#", description: "News and updates" },
      { label: "Community", href: "#", description: "Join the conversation" },
    ],
  },
  { label: "About", href: "#about" },
];

function NavLinks({
  activeDropdown,
  setActiveDropdown,
  pill,
}: {
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  pill?: boolean;
}) {
  return (
    <nav className="hidden md:flex items-center gap-0.5">
      {navLinks.map((link) => (
        <div key={link.label} className="relative">
          {link.children ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown(activeDropdown === link.label ? null : link.label);
                }}
                className={cn(
                  "flex items-center gap-1 px-3.5 py-2 text-sm font-medium transition-colors",
                  pill ? "rounded-full" : "rounded-lg",
                  activeDropdown === link.label
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  activeDropdown === link.label && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {activeDropdown === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl border border-border bg-background shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-1.5">
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          onClick={() => setActiveDropdown(null)}
                          className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-medium text-foreground">{child.label}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{child.description}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link
              href={link.href}
              className={cn(
                "px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                pill ? "rounded-full" : "rounded-lg"
              )}
            >
              {link.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = () => setActiveDropdown(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const logo = (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setActiveDropdown(null)}>
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm">
        <Zap className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <span className="font-bold text-sm text-foreground">Delix</span>
    </Link>
  );

  const ctaButtons = (pill?: boolean) => (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      <Button
        variant="outline"
        size="sm"
        className={cn("h-9 px-5 font-medium", pill ? "rounded-full" : "rounded-lg")}
        asChild
      >
        <Link href="/login">Log in</Link>
      </Button>
      <Button
        size="sm"
        className={cn("h-9 px-5 font-medium", pill ? "rounded-full" : "rounded-lg")}
        asChild
      >
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  );

  return (
    <>
      {/* ── Full-width flat navbar (at top) ── */}
      <AnimatePresence>
        {!scrolled && (
          <motion.header
            key="flat"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border"
          >
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between h-16">
              {logo}
              <NavLinks activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />
              {ctaButtons()}
              <button
                className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Floating pill navbar (on scroll) ── */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            key="pill"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
          >
            <header className="w-full max-w-4xl rounded-full border border-border bg-background/95 backdrop-blur-xl shadow-lg shadow-black/5">
              <div className="flex items-center justify-between h-14 px-5">
                {logo}
                <NavLinks activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} pill />
                {ctaButtons(true)}
                <button
                  className="md:hidden p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </header>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-40 left-4 right-4 rounded-2xl border border-border bg-background shadow-xl overflow-hidden",
              scrolled ? "top-[76px]" : "top-[68px]"
            )}
          >
            <div className="p-3 flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border">
                <Button variant="outline" className="rounded-full font-medium" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button className="rounded-full font-medium" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
