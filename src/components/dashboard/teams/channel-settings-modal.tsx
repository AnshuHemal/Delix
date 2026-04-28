/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTeamsStore } from "@/stores/teams-store";
import { useSession } from "@/lib/auth-client";

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelSettingsModalProps {
  open: boolean;
  channelId: string;
  workspaceId: string;
  onClose: () => void;
}

// ─── Owner Edit Form ──────────────────────────────────────────────────────────

interface OwnerFormProps {
  channelId: string;
  workspaceId: string;
  teamId: string;
  initialName: string;
  initialDescription: string;
  initialTopic: string;
  onSaved: (data: { name: string; description: string; topic: string }) => void;
}

function OwnerForm({
  channelId,
  workspaceId,
  teamId,
  initialName,
  initialDescription,
  initialTopic,
  onSaved,
}: OwnerFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [topic, setTopic] = useState(initialTopic);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when channel changes (modal re-opened for different channel)
  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setTopic(initialTopic);
    setNameError(null);
  }, [initialName, initialDescription, initialTopic]);

  function validateName(value: string): string | null {
    if (!value.trim()) return "Channel name is required";
    if (value.trim().length > 80) return "Channel name must be 80 characters or fewer";
    return null;
  }

  async function handleSave() {
    const nameErr = validateName(name);
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${teamId}/channels/${channelId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            topic: topic.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Failed to update channel");
      }
      toast.success("Channel settings saved");
      onSaved({ name: name.trim(), description: description.trim(), topic: topic.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to save settings", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  const isDirty =
    name !== initialName ||
    description !== initialDescription ||
    topic !== initialTopic;

  return (
    <div className="space-y-5">
      {/* Channel name */}
      <div className="space-y-1.5">
        <Label htmlFor="channel-settings-name">
          Channel name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="channel-settings-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(validateName(e.target.value));
          }}
          onBlur={() => setNameError(validateName(name))}
          placeholder="e.g. general, announcements…"
          maxLength={80}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "channel-name-error" : undefined}
          disabled={isSaving}
        />
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
          <span className="ml-auto text-xs text-muted-foreground">{name.length}/80</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="channel-settings-description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="channel-settings-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this channel about?"
          maxLength={280}
          rows={3}
          className="resize-none"
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/280</p>
      </div>

      {/* Topic */}
      <div className="space-y-1.5">
        <Label htmlFor="channel-settings-topic">
          Topic{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="channel-settings-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Sprint 42 planning, Q3 roadmap…"
          maxLength={120}
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground text-right">{topic.length}/120</p>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={isSaving || !isDirty || !name.trim()}
        >
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Read-only View ───────────────────────────────────────────────────────────

interface ReadOnlyViewProps {
  name: string;
  description: string;
  topic: string;
}

function ReadOnlyView({ name, description, topic }: ReadOnlyViewProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Channel name
        </p>
        <p className="text-sm text-foreground font-medium">#{name}</p>
      </div>

      {description && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </p>
          <p className="text-sm text-foreground">{description}</p>
        </div>
      )}

      {topic && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Topic
          </p>
          <p className="text-sm text-foreground">{topic}</p>
        </div>
      )}

      {!description && !topic && (
        <p className="text-sm text-muted-foreground italic">No description or topic set.</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChannelSettingsModal({
  open,
  channelId,
  workspaceId,
  onClose,
}: ChannelSettingsModalProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const teams = useTeamsStore((s) => s.teams);
  const updateTeam = useTeamsStore((s) => s.updateTeam);
  const setActiveChannel = useTeamsStore((s) => s.setActiveChannel);

  // Find the channel and its owning team across all teams
  const owningTeam = teams.find((t) => t.channels.some((ch) => ch.id === channelId)) ?? null;
  const channel = owningTeam?.channels.find((ch) => ch.id === channelId) ?? null;

  // Determine if current user is a Team Owner of the owning team
  const isTeamOwner =
    owningTeam?.members.some(
      (m) => m.userId === currentUserId && m.role === "OWNER"
    ) ?? false;

  // Archive confirmation dialog state
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Close archive dialog when main modal closes
  useEffect(() => {
    if (!open) {
      setShowArchiveConfirm(false);
    }
  }, [open]);

  // Close modal if channel disappears from store (e.g. archived by another user)
  const channelExists = teams.some((t) => t.channels.some((ch) => ch.id === channelId));
  useEffect(() => {
    if (open && !channelExists) {
      onClose();
    }
  }, [open, channelExists, onClose]);

  // Handle save — update channel in store
  const handleSaved = useCallback(
    (data: { name: string; description: string; topic: string }) => {
      if (!owningTeam || !channel) return;
      const updatedChannels = owningTeam.channels.map((ch) =>
        ch.id === channelId
          ? { ...ch, name: data.name, description: data.description || null, topic: data.topic || null }
          : ch
      );
      updateTeam(owningTeam.id, { channels: updatedChannels });
    },
    [owningTeam, channel, channelId, updateTeam]
  );

  // Handle archive
  async function handleArchive() {
    if (!owningTeam || !channel) return;

    setIsArchiving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${owningTeam.id}/channels/${channelId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: true }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Failed to archive channel");
      }

      // Remove channel from team in store
      const updatedChannels = owningTeam.channels.filter((ch) => ch.id !== channelId);
      updateTeam(owningTeam.id, { channels: updatedChannels });

      // Navigate away from the archived channel
      setActiveChannel(null);

      toast.success(`#${channel.name} has been archived`);
      setShowArchiveConfirm(false);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to archive channel", { description: message });
    } finally {
      setIsArchiving(false);
    }
  }

  if (!channel || !owningTeam) return null;

  const initialName = channel.name;
  const initialDescription = channel.description ?? "";
  const initialTopic = (channel as { topic?: string | null }).topic ?? "";

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-muted-foreground font-normal">#</span>
              <span className="truncate">{channel.name}</span>
              <span className="text-muted-foreground font-normal text-sm">
                — {isTeamOwner ? "Settings" : "Info"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={isTeamOwner ? "owner" : "member"}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                {isTeamOwner ? (
                  <div className="space-y-6">
                    <OwnerForm
                      channelId={channelId}
                      workspaceId={workspaceId}
                      teamId={owningTeam.id}
                      initialName={initialName}
                      initialDescription={initialDescription}
                      initialTopic={initialTopic}
                      onSaved={handleSaved}
                    />

                    {/* Danger zone — Archive */}
                    <div className="pt-4 border-t border-border">
                      <div
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          "bg-destructive/5 border border-destructive/20"
                        )}
                      >
                        <AlertTriangle
                          size={16}
                          className="text-destructive shrink-0 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">Danger zone</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Archiving this channel will hide it from the panel. Messages are
                            preserved but the channel will no longer be accessible.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowArchiveConfirm(true)}
                        >
                          <Archive size={13} className="mr-1.5" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ReadOnlyView
                    name={initialName}
                    description={initialDescription}
                    topic={initialTopic}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 pb-5 pt-0 shrink-0 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive &ldquo;#{channel.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This channel will be hidden from the panel. All messages will be preserved,
              but team members will no longer be able to post or read new messages here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? "Archiving…" : "Archive channel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
