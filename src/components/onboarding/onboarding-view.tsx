"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
  Users,
  MessageSquare,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { workspacesApi } from "@/lib/api";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const schema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(80),
  slug: z
    .string()
    .min(2, "URL must be at least 2 characters")
    .max(40, "URL must be 40 characters or less")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(300).optional(),
});

type FormData = z.infer<typeof schema>;

const features = [
  { icon: MessageSquare, label: "Real-time chat", desc: "DMs and channel messaging" },
  { icon: Video, label: "HD video meetings", desc: "Meet with your whole team" },
  { icon: Users, label: "Teams & channels", desc: "Organize by project or topic" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function OnboardingView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const nameValue = watch("name", "");
  const slugValue = watch("slug", "");

  // Auto-generate slug from name unless user has manually edited it
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValue("name", val);
    if (!slugEdited) {
      setValue("slug", slugify(val), { shouldValidate: true });
    }
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await workspacesApi.create(data);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create workspace";
      setError(msg);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-full max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden">

        {/* ── Left panel — feature highlights ── */}
        <div className="md:col-span-2 bg-linear-to-br from-primary via-primary/90 to-indigo-700 p-8 text-primary-foreground flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-6">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold mb-2">Your workspace awaits</h2>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              A workspace is your team&apos;s home in Delix — where all your conversations,
              meetings, and files live.
            </p>
          </div>

          <div className="space-y-4 mt-8">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: EASE }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-xs text-primary-foreground/60">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="md:col-span-3 p-8">
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Create your workspace</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Takes less than a minute. You can always change these later.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Workspace name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                autoComplete="off"
                autoFocus
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                {...register("name")}
                onChange={handleNameChange}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Slug / URL */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">Workspace URL</Label>
              <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50 overflow-hidden">
                <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input shrink-0 select-none">
                  delix.app/
                </span>
                <input
                  id="slug"
                  type="text"
                  placeholder="acme-corp"
                  autoComplete="off"
                  className={cn(
                    "flex-1 px-3 py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground",
                    errors.slug && "text-destructive"
                  )}
                  {...register("slug")}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setValue("slug", e.target.value, { shouldValidate: true });
                  }}
                />
                {slugValue && !errors.slug && (
                  <div className="pr-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
              {errors.slug ? (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This will be your workspace&apos;s unique URL
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="description"
                placeholder="What does your team work on?"
                autoComplete="off"
                {...register("description")}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold group mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
