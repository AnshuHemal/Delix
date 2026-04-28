"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Lock, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamsStore } from "@/stores/teams-store";
import type { ChannelWithDetails } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateChannelModalProps {
  open: boolean;
  workspaceId: string;
  teamId: string;
  isTeamOwner: boolean;
  onClose: () => void;
}

type ChannelType = "STANDARD" | "ANNOUNCEMENT" | "PRIVATE";

interface ChannelTypeOption {
  value: ChannelType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_NAME_REGEX = /^[a-z0-9-]+$/;

const CHANNEL_TYPE_OPTIONS: ChannelTypeOption[] = [
  {
    value: "STANDARD",
    label: "Standard",
    description: "All team members can read and post",
    icon: <Hash size={16} />,
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcement",
    description: "Only owners can post; all members can read",
    icon: <Megaphone size={16} />,
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Only invited members can access",
    icon: <Lock size={16} />,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateChannelModal({
  open,
  workspaceId,
  teamId,
  isTeamOwner,
  onClose,
}: CreateChannelModalProps) {
  // ── Form state ───────────────────────────────────────────────────────────
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("STANDARD");
  const [nameError, setNameError] = useState<string | null>(null);

  // ── Submit state ─────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Store actions ────────────────────────────────────────────────────────
  const teams = useTeamsStore((s) => s.teams);
  const updateTeam = useTeamsStore((s) => s.updateTeam);
  const setActiveChannel = useTeamsStore((s) => s.setActiveChannel);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Focus name input on open ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [open]);

  // ── Reset form on close ──────────────────────────────────────────────────
  function resetForm() {
    setChannelName("");
    setDescription("");
    setChannelType("STANDARD");
    setNameError(null);
    setIsSubmitting(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Validation ───────────────────────────────────────────────────────────
  function validateName(value: string): string | null {
    if (!value.trim()) return "Channel name is required";
    if (value.length > 80) return "Channel name must be 80 characters or fewer";
    if (!CHANNEL_NAME_REGEX.test(value)) {
      return "Channel name can only contain lowercase letters, numbers, and hyphens";
    }
    return null;
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setChannelName(value);
    if (nameError) {
      setNameError(validateName(value));
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const error = validateName(channelName);
    if (error) {
      setNameError(error);
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${teamId}/channels`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: channelName.trim(),
            description: description.trim() || undefined,
            type: channelType,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to create channel");
      }

      const { channel } = (await res.json()) as { channel: ChannelWithDetails };

      // Update the team's channels in the store
      const team = teams.find((t) => t.id === teamId);
      const existingChannels = team?.channels ?? [];
      updateTeam(teamId, { channels: [...existingChannels, channel] });

      // Navigate to the new channel
      setActiveChannel(channel.id);

      // Close modal
      resetForm();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to create channel", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    channelName,
    description,
    channelType,
    workspaceId,
    teamId,
    teams,
    updateTeam,
    setActiveChannel,
    onClose,
  ]);

  // ── Keyboard submit ──────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-[480px]"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Channel name */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">
              Channel name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
                #
              </span>
              <Input
                id="channel-name"
                ref={nameInputRef}
                value={channelName}
                onChange={handleNameChange}
                onBlur={() => setNameError(validateName(channelName))}
                placeholder="e.g. general, announcements"
                className="pl-7"
                maxLength={80}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "channel-name-error" : undefined}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center justify-between">
              <AnimatePresence mode="wait">
                {nameError && (
                  <motion.p
                    key="name-error"
                    id="channel-name-error"
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs text-destructive"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
              <span className="ml-auto text-xs text-muted-foreground">
                {channelName.length}/80
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              maxLength={280}
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/280
            </p>
          </div>

          {/* Channel type selector */}
          <div className="space-y-1.5">
            <Label>Channel type</Label>
            <TooltipProvider>
              <div className="space-y-2" role="radiogroup" aria-label="Channel type">
                {CHANNEL_TYPE_OPTIONS.map((option) => {
                  const isAnnouncement = option.value === "ANNOUNCEMENT";
                  const isDisabled = isAnnouncement && !isTeamOwner;
                  const isSelected = channelType === option.value;

                  const button = (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={isDisabled}
                      disabled={isDisabled || isSubmitting}
                      onClick={() => !isDisabled && setChannelType(option.value)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent",
                        isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {option.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                      {/* Selection indicator */}
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )}
                        aria-hidden
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </span>
                    </button>
                  );

                  if (isDisabled) {
                    return (
                      <Tooltip key={option.value}>
                        <TooltipTrigger asChild>
                          <span className="block">{button}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Only team owners can create Announcement channels
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return button;
                })}
              </div>
            </TooltipProvider>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !channelName.trim()}
          >
            {isSubmitting ? "Creating…" : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
