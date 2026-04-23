"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";

const reviews = [
  {
    company: "Powersurge",
    companyColor: "text-violet-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" opacity="0.4" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" opacity="0.4" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" opacity="0.7" />
      </svg>
    ),
    review: "Delix has been a lifesaver for our team — everything we need is right at our fingertips, and it helps us jump right into new projects.",
    name: "Nikolas Gibbons",
    role: "Product Designer, Powersurge",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    company: "Goodwell",
    companyColor: "text-green-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
    review: "Delix is our secret weapon for staying ahead of deadlines. It gives us everything we need to get started quickly.",
    name: "Ammar Foley",
    role: "UX Designer, Goodwell",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg",
  },
  {
    company: "Stack3d Lab",
    companyColor: "text-zinc-700",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    review: "Our workflow has improved dramatically since we started using Delix. It's become an integral part of our process. Easy to use, top-notch resources. I recommend it to everyone!",
    name: "Mathilde Lewis",
    role: "Project Lead, Stack3d Lab",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    company: "Railspeed",
    companyColor: "text-red-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
    review: "We love Delix! It's made the collaboration process super streamlined. Our team ships faster than ever.",
    name: "Marco Kelly",
    role: "UI Designer, Railspeed",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
  },
  {
    company: "Quixotic",
    companyColor: "text-orange-500",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
    ),
    review: "Delix is hands down the best workspace tool we've used. It has literally everything we need to get started for any possible project.",
    name: "Florence Shaw",
    role: "Web Designer, Quixotic",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    company: "Magnolia",
    companyColor: "text-pink-500",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2C8 2 4 5 4 9c0 5 8 13 8 13s8-8 8-13c0-4-4-7-8-7zm0 9a2 2 0 1 1 2-2 2 2 0 0 1-2 2z" />
      </svg>
    ),
    review: "Delix is an absolute game-changer for our projects. We can't imagine going back to how we used to work without it.",
    name: "Stefan Sears",
    role: "UI/UX Designer, Magnolia",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
  },
  {
    company: "Wildcrafted",
    companyColor: "text-blue-500",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5L18 8v8l-6 3.75L6 16V8l6-3.5z" />
      </svg>
    ),
    review: "Starting projects used to feel daunting, but Delix simplifies everything. We've used it for both small and large projects, and it never disappoints.",
    name: "Zaid Schwartz",
    role: "Creative Director, Wildcrafted",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
  },
  {
    company: "Solaris Energy",
    companyColor: "text-yellow-500",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    review: "With Delix, we can focus more on work and less on the tedious setup. Best money ever spent.",
    name: "Owen Garcia",
    role: "CTO, Solaris Energy",
    avatar: "https://randomuser.me/api/portraits/men/36.jpg",
  },
  {
    company: "Ikigai Labs",
    companyColor: "text-zinc-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <rect x="2" y="10" width="20" height="4" rx="2" />
        <rect x="6" y="6" width="12" height="4" rx="2" opacity="0.5" />
        <rect x="6" y="14" width="12" height="4" rx="2" opacity="0.5" />
      </svg>
    ),
    review: "Delix has been a real time-saver for us. It's organized, efficient, and keeps us moving forward with every project.",
    name: "Priya Nair",
    role: "Product Manager, Ikigai Labs",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    company: "Nexlayer",
    companyColor: "text-cyan-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    review: "Switching to Delix was the best decision we made this year. The interface is intuitive and the team features are outstanding.",
    name: "Lena Park",
    role: "Engineering Manager, Nexlayer",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
  },
  {
    company: "Driftwood",
    companyColor: "text-amber-600",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M3 12h18M3 6h18M3 18h12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
    review: "Delix keeps our distributed team perfectly in sync. The video quality and chat reliability are unmatched.",
    name: "Carlos Mendez",
    role: "Head of Product, Driftwood",
    avatar: "https://randomuser.me/api/portraits/men/61.jpg",
  },
  {
    company: "Luminary",
    companyColor: "text-purple-500",
    companyLogo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
      </svg>
    ),
    review: "We onboarded our entire 50-person team in a single afternoon. Delix just works, and that's exactly what we needed.",
    name: "Aisha Okonkwo",
    role: "COO, Luminary",
    avatar: "https://randomuser.me/api/portraits/women/79.jpg",
  },
];

// Split into 3 columns
const col1 = reviews.filter((_, i) => i % 3 === 0); // scrolls UP
const col2 = reviews.filter((_, i) => i % 3 === 1); // scrolls DOWN
const col3 = reviews.filter((_, i) => i % 3 === 2); // scrolls UP

function ReviewCard({ review }: { review: (typeof reviews)[0] }) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow duration-300 mb-4">
      {/* Company */}
      <div className="flex items-center gap-2">
        <span className={review.companyColor}>{review.companyLogo}</span>
        <span className="text-sm font-semibold text-foreground">{review.company}</span>
      </div>
      {/* Review */}
      <p className="text-sm text-muted-foreground leading-relaxed">{review.review}</p>
      {/* Reviewer */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
          <Image src={review.avatar} alt={review.name} width={36} height={36} className="w-full h-full object-cover" unoptimized />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{review.name}</span>
            <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

function ScrollColumn({
  items,
  direction,
  speed = 40,
}: {
  items: (typeof reviews);
  direction: "up" | "down";
  speed?: number;
}) {
  const [paused, setPaused] = useState(false);
  const doubled = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 680 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          transform: direction === "up" ? "translateY(0)" : "translateY(-50%)",
          animation: `${direction === "up" ? "reviewScrollUp" : "reviewScrollDown"} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          willChange: "transform",
        }}
      >
        {doubled.map((review, i) => (
          <ReviewCard key={`${review.name}-${i}`} review={review} />
        ))}
      </div>
    </div>
  );
}

export function Reviews() {
  return (
    <section className="bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl sm:text-5xl font-medium text-foreground tracking-tight">
            Our reviews
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hear first-hand from our incredible community of customers.
          </p>
        </motion.div>

        {/* Scrolling columns */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ScrollColumn items={col1} direction="up" speed={45} />
            <ScrollColumn items={col2} direction="down" speed={38} />
            <ScrollColumn items={col3} direction="up" speed={50} />
          </div>

          {/* Top fade */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-background to-transparent pointer-events-none z-10" />

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background to-transparent pointer-events-none z-10" />
        </div>

      </div>
    </section>
  );
}
