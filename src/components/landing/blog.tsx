"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const posts = [
  {
    category: "Design",
    categoryColor: "text-primary",
    title: "UX review presentations",
    excerpt:
      "How do you create compelling presentations that wow your colleagues and impress your managers?",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    author: "Olivia Rhye",
    authorAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    date: "20 Jan 2026",
    href: "#",
  },
  {
    category: "Product",
    categoryColor: "text-primary",
    title: "Migrating to Linear 101",
    excerpt:
      "Linear helps streamline software projects, sprints, tasks, and bug tracking. Here's how to get started.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80",
    author: "Phoenix Baker",
    authorAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
    date: "19 Jan 2026",
    href: "#",
  },
  {
    category: "Software Engineering",
    categoryColor: "text-primary",
    title: "Building your API stack",
    excerpt:
      "The rise of RESTful APIs has been met with a rise in tools for creating, testing, and managing them.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80",
    author: "Lana Steiner",
    authorAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
    date: "18 Jan 2026",
    href: "#",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: i * 0.1 },
  }),
};

export function Blog() {
  return (
    <section className="py-20 lg:pb-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-border pt-20 lg:pt-28">

        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-start justify-between gap-6 mb-12"
        >
          <div>
            <p className="text-sm font-semibold text-primary mb-2">Our blog</p>
            <h2 className="text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
              Latest blog posts
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-lg">
              Tools and strategies modern teams need to help their companies grow.
            </p>
          </div>

          <Link
            href="#"
            className="shrink-0 inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mt-1"
          >
            View all posts
          </Link>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.article
              key={post.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="group flex flex-col"
            >
              {/* Image */}
              <Link href={post.href} className="block overflow-hidden rounded-2xl mb-5">
                <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
              </Link>

              {/* Category */}
              <p className={`text-sm font-semibold ${post.categoryColor} mb-2`}>
                {post.category}
              </p>

              {/* Title + arrow */}
              <Link href={post.href} className="flex items-start justify-between gap-3 mb-3 group/title">
                <h3 className="text-lg font-semibold text-foreground group-hover/title:text-primary transition-colors leading-snug">
                  {post.title}
                </h3>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5 group-hover/title:text-primary group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5 transition-all" />
              </Link>

              {/* Excerpt */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                {post.excerpt}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                  <Image
                    src={post.authorAvatar}
                    alt={post.author}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.date}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
      </div>
    </section>
  );
}
