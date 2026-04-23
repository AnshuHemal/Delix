"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const companies = [
  { name: "Vercel", src: "https://cdn.simpleicons.org/vercel/000000", width: 120 },
  { name: "Linear", src: "https://cdn.simpleicons.org/linear/5E6AD2", width: 120 },
  { name: "Notion", src: "https://cdn.simpleicons.org/notion/000000", width: 120 },
  { name: "Figma", src: "https://cdn.simpleicons.org/figma/F24E1E", width: 100 },
  { name: "Stripe", src: "https://cdn.simpleicons.org/stripe/635BFF", width: 120 },
  { name: "Supabase", src: "https://cdn.simpleicons.org/supabase/3ECF8E", width: 140 },
];

export function Logos() {
  return (
    <section className="py-14 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-base text-muted-foreground mb-12"
        >
          Join 10,000+ teams already working smarter
        </motion.p>

        {/* Logo row — spread across full section width */}
        <div className="flex flex-wrap items-center justify-between gap-y-8">
          {companies.map((company, i) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 * i }}
              whileHover={{ scale: 1.06, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 opacity-40 hover:opacity-80 transition-opacity duration-300 grayscale hover:grayscale-0"
            >
              <Image
                src={company.src}
                alt={company.name}
                width={company.width}
                height={32}
                className="h-8 w-auto object-contain"
                unoptimized
              />
              <span className="text-base font-semibold text-foreground whitespace-nowrap">
                {company.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 h-px bg-border origin-left"
        />
      </div>
    </section>
  );
}
