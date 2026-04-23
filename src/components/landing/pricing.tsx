"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Perfect for small teams getting started.",
    features: ["Up to 10 team members", "40-min meeting limit", "5 GB file storage", "Basic chat & channels", "Community support"],
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: { monthly: 12, annual: 9 },
    description: "For growing teams that need more power.",
    features: ["Unlimited team members", "Unlimited meeting duration", "100 GB file storage", "Advanced chat features", "Meeting recording", "Priority support", "Custom integrations"],
    cta: "Start free trial",
    href: "/signup?plan=pro",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: { monthly: 29, annual: 22 },
    description: "For large organizations with advanced needs.",
    features: ["Everything in Pro", "Unlimited storage", "SSO & SAML", "Advanced security", "SLA guarantee", "Dedicated support", "Custom contracts"],
    cta: "Contact sales",
    href: "/contact",
    highlighted: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">No hidden fees. No surprises. Cancel anytime.</p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                !annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Annual
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">Save 25%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative rounded-lg p-6 flex flex-col",
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-2xl scale-105"
                  : "bg-card border border-border"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-yellow-400 text-yellow-900 border-0 font-semibold px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className={cn("text-lg font-bold mb-1", plan.highlighted ? "text-primary-foreground" : "text-foreground")}>
                  {plan.name}
                </h3>
                <p className={cn("text-sm", plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {plan.description}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={cn("text-4xl font-bold", plan.highlighted ? "text-primary-foreground" : "text-foreground")}>
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className={cn("text-sm", plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      /user/mo
                    </span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.highlighted ? "text-primary-foreground/80" : "text-primary")} />
                    <span className={plan.highlighted ? "text-primary-foreground/90" : "text-muted-foreground"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "secondary" : "default"}
                className={cn("w-full font-semibold", plan.highlighted && "text-primary")}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
