"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Search, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
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
import { Switch } from "@/components/ui/switch";
import { useTeamsStore } from "@/stores/teams-store";
import type { TeamWithDetails } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTeamModalProps {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}

interface WorkspaceMember {
  id: string;
  name: string;
  image: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-purple-200 text-purple-800",
  "bg-orange-200 text-orange-800",
  "bg-yellow-200 text-yellow-800",
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-red-200 text-red-800",
  "bg-indigo-200 text-indigo-800",
  "bg-cyan-200 text-cyan-800",
];

function deterministicColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateTeamModal({ open, workspaceId, onClose }: CreateTeamModalProps) {
  // Form state
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Member search state
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<WorkspaceMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<WorkspaceMember[]>([]);
  const [isMemberSearchLoading, setIsMemberSearchLoading] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store the workspace ID in a ref so it's always current without stale closures.
  // We update it whenever the prop changes OR when we fetch it ourselves.
  const workspaceIdRef = useRef<string>(workspaceId);
  useEffect(() => {
    if (workspaceId) {
      workspaceIdRef.current = workspaceId;
    }
  }, [workspaceId]);
  // Store actions
  const addTeam = useTeamsStore((s) => s.addTeam);
  const setActiveTeam = useTeamsStore((s) => s.setActiveTeam);
  const setActiveChannel = useTeamsStore((s) => s.setActiveChannel);

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const memberSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus name input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [open]);

  // Debounced member search
  useEffect(() => {
    if (!open || !memberSearch.trim()) {
      const id = setTimeout(() => {
        setMemberResults([]);
        setShowMemberDropdown(false);
      }, 0);
      return () => clearTimeout(id);
    }

    const id = setTimeout(async () => {
      setIsMemberSearchLoading(true);
      try {
        const res = await fetch(
          `/api/workspaces/members?search=${encodeURIComponent(memberSearch.trim())}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const results: WorkspaceMember[] = (data.members ?? []).filter(
          (m: WorkspaceMember) => !selectedMembers.some((s) => s.id === m.id)
        );
        setMemberResults(results);
        setShowMemberDropdown(true);
      } catch {
        setMemberResults([]);
      } finally {
        setIsMemberSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [memberSearch, open, selectedMembers]);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        memberSearchRef.current?.contains(e.target as Node)
      )
        return;
      setShowMemberDropdown(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function resetForm() {
    setTeamName("");
    setDescription("");
    setIsPrivate(false);
    setNameError(null);
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMembers([]);
    setShowMemberDropdown(false);
    setIsSubmitting(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateName(value: string): string | null {
    if (!value.trim()) return "Team name is required";
    if (value.trim().length > 80) return "Team name must be 80 characters or fewer";
    return null;
  }

  function selectMember(member: WorkspaceMember) {
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearch("");
    setMemberResults([]);
    setShowMemberDropdown(false);
    memberSearchRef.current?.focus();
  }

  // ── Submit — plain async function, always fetches workspace ID fresh ────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nameErr = validateName(teamName);
    if (nameErr) {
      setNameError(nameErr);
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the ref (kept current by the useEffect above).
      // If somehow still empty, fetch it now as a last resort.
      let wsId = workspaceIdRef.current;
      if (!wsId) {
        const wsRes = await fetch("/api/workspaces");
        if (!wsRes.ok) throw new Error(`Could not load workspace (${wsRes.status})`);
        const wsData = await wsRes.json();
        wsId = wsData.workspaces?.[0]?.id ?? "";
        if (wsId) workspaceIdRef.current = wsId;
      }

      if (!wsId) {
        toast.error("No workspace found. Please complete onboarding first.");
        return;
      }

      // Create the team
      const createRes = await fetch(`/api/workspaces/${wsId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          description: description.trim() || undefined,
          isPrivate,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        const msg = (errData as { error?: string }).error ?? `Server error ${createRes.status}`;
        throw new Error(msg);
      }

      const responseData = await createRes.json();
      const team = responseData.team as TeamWithDetails;

      if (!team) {
        throw new Error("Server returned no team data");
      }

      // Add members in parallel (best-effort)
      if (selectedMembers.length > 0) {
        await Promise.allSettled(
          selectedMembers.map((m) =>
            fetch(`/api/workspaces/${wsId}/teams/${team.id}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: m.id }),
            })
          )
        );
      }

      // Update store and navigate to the new team's general channel
      addTeam(team);
      setActiveTeam(team.id);
      if (team.channels[0]) {
        setActiveChannel(team.channels[0].id);
      }

      resetForm();
      onClose();
    } catch (err) {
      console.error("[CreateTeamModal] submit error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Team name */}
          <div className="space-y-1.5">
            <Label htmlFor="team-name">
              Team name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team-name"
              ref={nameInputRef}
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (nameError) setNameError(validateName(e.target.value));
              }}
              onBlur={() => setNameError(validateName(teamName))}
              placeholder="e.g. Engineering, Marketing…"
              maxLength={80}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "team-name-error" : undefined}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <AnimatePresence mode="wait">
                {nameError && (
                  <motion.p
                    key="name-error"
                    id="team-name-error"
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
                {teamName.length}/80
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="team-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this team about?"
              maxLength={280}
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/280
            </p>
          </div>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <Globe size={16} className="text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">{isPrivate ? "Private" : "Public"}</p>
                <p className="text-xs text-muted-foreground">
                  {isPrivate
                    ? "Only invited members can join"
                    : "Anyone in the workspace can join"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isSubmitting}
              aria-label="Toggle team privacy"
            />
          </div>

          {/* Member search */}
          <div className="space-y-1.5">
            <Label htmlFor="member-search">
              Add members{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={16}
                        height={16}
                        unoptimized
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold",
                          deterministicColor(member.id)
                        )}
                      >
                        {getInitials(member.name)}
                      </div>
                    )}
                    <span>{member.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMembers((prev) => prev.filter((m) => m.id !== member.id))
                      }
                      className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                      aria-label={`Remove ${member.name}`}
                      disabled={isSubmitting}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="member-search"
                  ref={memberSearchRef}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onFocus={() => {
                    if (memberResults.length > 0) setShowMemberDropdown(true);
                  }}
                  placeholder="Search workspace members…"
                  className="pl-8"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>

              <AnimatePresence>
                {showMemberDropdown && (
                  <motion.div
                    ref={dropdownRef}
                    key="member-dropdown"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden"
                  >
                    {isMemberSearchLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      </div>
                    ) : memberResults.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No members found
                      </p>
                    ) : (
                      <ul role="listbox" aria-label="Member search results">
                        {memberResults.map((member) => (
                          <li key={member.id} role="option" aria-selected={false}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                // Use mousedown so the input doesn't lose focus first
                                e.preventDefault();
                                selectMember(member);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                              {member.image ? (
                                <Image
                                  src={member.image}
                                  alt={member.name}
                                  width={32}
                                  height={32}
                                  unoptimized
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                                    deterministicColor(member.id)
                                  )}
                                >
                                  {getInitials(member.name)}
                                </div>
                              )}
                              <span className="flex-1 text-sm font-medium text-foreground">
                                {member.name}
                              </span>
                              <Check size={14} className="text-primary opacity-0" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !teamName.trim()}>
              {isSubmitting ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
