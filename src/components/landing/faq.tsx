"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const faqs = [
  {
    question: "Is there a free trial available?",
    answer:
      "Yes, you can try us for free for 30 days. If you want, we'll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately, and we'll prorate any charges.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "You can cancel your subscription at any time. Your account will remain active until the end of your current billing period, and you won't be charged again.",
  },
  {
    question: "Can other info be added to an invoice?",
    answer:
      "Yes, you can add custom information like your company name, VAT number, billing address, and purchase order numbers directly from your billing settings.",
  },
  {
    question: "How does billing work?",
    answer:
      "We bill monthly or annually depending on your plan. All payments are processed securely via Stripe. You'll receive an invoice via email after each payment.",
  },
  {
    question: "How do I change my account email?",
    answer:
      "Go to Settings → Account → Email. Enter your new email address and we'll send a verification link. Once confirmed, your email will be updated.",
  },
];

const supportTeam = [
  { src: "https://randomuser.me/api/portraits/men/22.jpg", name: "Alex" },
  { src: "https://randomuser.me/api/portraits/women/65.jpg", name: "Sarah" },
  { src: "https://randomuser.me/api/portraits/men/46.jpg", name: "Mike" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 lg:pb-28 bg-background">

      {/* FAQ content — narrower container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-medium text-foreground tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about the product and billing.
          </p>
        </motion.div>

        {/* FAQ list */}
        <div className="space-y-0 border-t border-border">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="border-b border-border"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="text-base font-semibold text-foreground pr-8">
                    {faq.question}
                  </span>
                  <div className="shrink-0 w-7 h-7 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-base text-muted-foreground leading-relaxed pr-12">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA card — wider container, breaks out of FAQ width */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center text-center pt-14 pb-16 px-8 rounded-2xl bg-muted/50"
        >
          {/* Avatar group */}
          <div className="flex -space-x-3 mb-6">
            {supportTeam.map((member) => (
              <div
                key={member.name}
                className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-background shadow-sm"
              >
                <Image
                  src={member.src}
                  alt={member.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Still have questions?
          </h3>
          <p className="text-base text-muted-foreground mb-8 max-w-sm">
            Can&apos;t find the answer you&apos;re looking for? Please chat to our
            friendly team.
          </p>

          <Link
            href="#contact"
            className="inline-flex items-center justify-center h-11 px-8 text-base font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get in touch
          </Link>
        </motion.div>
      </div>

    </section>
  );
}
