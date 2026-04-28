/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, Globe, Trash2, UserMinus, UserPlus, AlertTriangle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTeamsStore } from "@/stores/teams-store";
import { usePresenceStore } from "@/stores/presence-store";
import type { TeamWithDetails, TeamMemberWithUser, PresenceStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  AVAILABLE: "bg-green-500",
  BUSY: "bg-yellow-400",
  BE_RIGHT_BACK: "bg-yellow-400",
  AWAY: "bg-orange-400",
  DO_NOT_DISTURB: "bg-red-500",
  OFFLINE: "bg-muted-foreground",
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamSettingsModalProps {
  open: boolean;
  teamId: string;
  workspaceId: string;
  isTeamOwner: boolean;
  currentUserId: string;
  onClose: () => void;
}

interface WorkspaceMember {
  id: string;
  name: string;
  image: string | null;
}

type TabId = "general" | "members";

// ─── Presence Dot ─────────────────────────────────────────────────────────────

function PresenceDot({ userId }: { userId: string }) {
  const status = usePresenceStore((s) => s.getStatus(userId));
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background",
        PRESENCE_DOT[status]
      )}
    />
  );
}

// ─── Member Avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: TeamMemberWithUser }) {
  const name = member.user.name ?? "Unknown";
  const colorClass = deterministicColor(member.userId);
  return (
    <div className="relative shrink-0">
      {member.user.image ? (
        <Image
          src={member.user.image}
          alt={name}
          width={36}
          height={36}
          unoptimized
          className="w-9 h-9 rounded-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
            colorClass
          )}
        >
          {getInitials(name)}
        </div>
      )}
      <PresenceDot userId={member.userId} />
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

interface GeneralTabProps {
  team: TeamWithDetails;
  workspaceId: string;
  onTeamUpdated: (data: Partial<TeamWithDetails>) => void;
}

function GeneralTab({ team, workspaceId, onTeamUpdated }: GeneralTabProps) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [avatar, setAvatar] = useState(team.avatar ?? "");
  const [isPrivate, setIsPrivate] = useState(team.isPrivate);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateTeam = useTeamsStore((s) => s.updateTeam);

  function validateName(value: string): string | null {
    if (!value.trim()) return "Team name is required";
    if (value.trim().length > 80) return "Team name must be 80 characters or fewer";
    return null;
  }

  function validateAvatar(value: string): string | null {
    if (!value) return null; // optional
    // Allow single emoji or empty
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    // Simple check: should be a short string (emoji can be multi-byte but short visually)
    if ([...trimmed].length > 2) return "Avatar should be a single emoji character";
    return null;
  }

  async function handleSave() {
    const nameErr = validateName(name);
    const avatarErr = validateAvatar(avatar);
    if (nameErr) { setNameError(nameErr); return; }
    if (avatarErr) { setAvatarError(avatarErr); return; }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            avatar: avatar.trim() || null,
            isPrivate,
          }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to update team");
      }
      const { team: updated } = await res.json();
      updateTeam(team.id, updated);
      onTeamUpdated(updated);
      toast.success("Team settings saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to save settings", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  const isDirty =
    name !== team.name ||
    description !== (team.description ?? "") ||
    avatar !== (team.avatar ?? "") ||
    isPrivate !== team.isPrivate;

  return (
    <div className="space-y-5">
      {/* Team name */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-team-name">
          Team name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="settings-team-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(validateName(e.target.value));
          }}
          onBlur={() => setNameError(validateName(name))}
          placeholder="e.g. Engineering, Marketing…"
          maxLength={80}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "settings-name-error" : undefined}
          disabled={isSaving}
        />
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {nameError && (
              <motion.p
                key="name-error"
                id="settings-name-error"
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
        <Label htmlFor="settings-description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="settings-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this team about?"
          maxLength={280}
          rows={3}
          className="resize-none"
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/280</p>
      </div>

      {/* Emoji avatar */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-avatar">
          Emoji avatar{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="flex items-center gap-3">
          {/* Preview */}
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
              avatar.trim() ? "bg-muted" : deterministicColor(team.id)
            )}
            aria-hidden
          >
            {avatar.trim() || getInitials(team.name)}
          </div>
          <Input
            id="settings-avatar"
            value={avatar}
            onChange={(e) => {
              // Only keep the last typed character (single emoji)
              const val = e.target.value;
              const chars = [...val];
              const last = chars.length > 0 ? chars[chars.length - 1] : "";
              setAvatar(last);
              if (avatarError) setAvatarError(validateAvatar(last));
            }}
            placeholder="e.g. 🚀"
            maxLength={4}
            aria-invalid={!!avatarError}
            aria-describedby={avatarError ? "settings-avatar-error" : undefined}
            disabled={isSaving}
            className="w-24"
          />
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar("")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear emoji avatar"
            >
              Clear
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          {avatarError && (
            <motion.p
              key="avatar-error"
              id="settings-avatar-error"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-destructive"
            >
              {avatarError}
            </motion.p>
          )}
        </AnimatePresence>
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
          disabled={isSaving}
          aria-label="Toggle team privacy"
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={isSaving || !isDirty || !name.trim()}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

interface MembersTabProps {
  team: TeamWithDetails;
  workspaceId: string;
  currentUserId: string;
  onTeamUpdated: (data: Partial<TeamWithDetails>) => void;
}

function MembersTab({ team, workspaceId, currentUserId, onTeamUpdated }: MembersTabProps) {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<WorkspaceMember[]>([]);
  const [isMemberSearchLoading, setIsMemberSearchLoading] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [lastOwnerError, setLastOwnerError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const memberSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateTeam = useTeamsStore((s) => s.updateTeam);
  const removeTeam = useTeamsStore((s) => s.removeTeam);
  const setActiveTeam = useTeamsStore((s) => s.setActiveTeam);
  const setActiveChannel = useTeamsStore((s) => s.setActiveChannel);

  // ── Debounced member search ──────────────────────────────────────────────
  useEffect(() => {
    if (!memberSearch.trim()) {
      setMemberResults([]);
      setShowMemberDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsMemberSearchLoading(true);
      try {
        const params = new URLSearchParams({ search: memberSearch.trim() });
        const res = await fetch(`/api/workspaces/members?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch members");
        const data = await res.json();
        const results: WorkspaceMember[] = (data.members ?? []).filter(
          (m: WorkspaceMember) => !team.members.some((tm) => tm.userId === m.id)
        );
        setMemberResults(results);
        setShowMemberDropdown(true);
      } catch {
        setMemberResults([]);
      } finally {
        setIsMemberSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [memberSearch, team.members]);

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        memberSearchRef.current &&
        !memberSearchRef.current.contains(e.target as Node)
      ) {
        setShowMemberDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Add member ───────────────────────────────────────────────────────────
  async function handleAddMember(member: WorkspaceMember) {
    setShowMemberDropdown(false);
    setMemberSearch("");
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${team.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: member.id, role: "MEMBER" }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to add member");
      }
      const { member: newMember } = await res.json();
      // Update team in store
      updateTeam(team.id, {
        members: [...team.members, newMember],
      });
      onTeamUpdated({ members: [...team.members, newMember] });
      toast.success(`Added ${member.name} to the team`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to add member", { description: message });
    }
  }

  // ── Remove member ────────────────────────────────────────────────────────
  async function handleRemoveMember(memberId: string) {
    setLastOwnerError(null);

    // Guard: check if removing the last owner
    const owners = team.members.filter((m) => m.role === "OWNER");
    const memberToRemove = team.members.find((m) => m.userId === memberId);
    if (memberToRemove?.role === "OWNER" && owners.length === 1) {
      setLastOwnerError("Cannot remove the last team owner. Promote another member first.");
      return;
    }

    setRemovingMemberId(memberId);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${team.id}/members/${memberId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to remove member");
      }
      // Update team in store
      const updatedMembers = team.members.filter((m) => m.userId !== memberId);
      updateTeam(team.id, { members: updatedMembers });
      onTeamUpdated({ members: updatedMembers });
      toast.success("Member removed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to remove member", { description: message });
    } finally {
      setRemovingMemberId(null);
    }
  }

  // ── Delete team ──────────────────────────────────────────────────────────
  async function handleDeleteTeam() {
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/teams/${team.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to delete team");
      }
      // Remove from store and navigate away
      removeTeam(team.id);
      setActiveTeam(null);
      setActiveChannel(null);
      toast.success("Team deleted");
      setShowDeleteConfirm(false);
      // Close the settings modal (parent will handle)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to delete team", { description: message });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Last owner error banner */}
      <AnimatePresence mode="wait">
        {lastOwnerError && (
          <motion.div
            key="last-owner-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{lastOwnerError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add members */}
      <div className="space-y-1.5">
        <Label htmlFor="add-member-search">Add members</Label>
        <div className="relative">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="add-member-search"
              ref={memberSearchRef}
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              onFocus={() => {
                if (memberResults.length > 0) setShowMemberDropdown(true);
              }}
              placeholder="Search workspace members…"
              className="pl-8"
              autoComplete="off"
            />
          </div>

          {/* Dropdown */}
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
                          onClick={() => handleAddMember(member)}
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
                          <UserPlus size={14} className="text-muted-foreground" />
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

      {/* Member list */}
      <div className="space-y-1.5">
        <Label>Team members ({team.members.length})</Label>
        <div className="rounded-lg border border-border divide-y divide-border">
          {team.members.map((member) => {
            const name = member.user.name ?? "Unknown";
            const isCurrentUser = member.userId === currentUserId;
            const isRemoving = removingMemberId === member.userId;
            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
              >
                <MemberAvatar member={member} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {name}
                    {isCurrentUser && (
                      <span className="text-muted-foreground font-normal"> (you)</span>
                    )}
                  </p>
                </div>
                <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={isRemoving}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label={`Remove ${name}`}
                >
                  {isRemoving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
                  ) : (
                    <UserMinus size={14} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete team */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deleting this team will remove all channels and messages. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={13} className="mr-1.5" />
            Delete team
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team &ldquo;{team.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team, all its channels, and all messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Read-only Member View ────────────────────────────────────────────────────

function ReadOnlyMembersView({ team }: { team: TeamWithDetails }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {team.members.length} member{team.members.length !== 1 ? "s" : ""}
      </p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {team.members.map((member) => {
          const name = member.user.name ?? "Unknown";
          return (
            <div key={member.userId} className="flex items-center gap-3 p-3">
              <MemberAvatar member={member} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{name}</p>
              </div>
              <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                {member.role}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Read-only General View ───────────────────────────────────────────────────

function ReadOnlyGeneralView({ team }: { team: TeamWithDetails }) {
  const avatarContent = team.avatar ?? getInitials(team.name);
  const avatarColor = deterministicColor(team.id);

  return (
    <div className="space-y-5">
      {/* Team avatar + name */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0",
            team.avatar ? "bg-muted" : avatarColor
          )}
        >
          {avatarContent}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{team.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {team.isPrivate ? (
              <Lock size={12} className="text-muted-foreground" />
            ) : (
              <Globe size={12} className="text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {team.isPrivate ? "Private" : "Public"} team
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </p>
          <p className="text-sm text-foreground">{team.description}</p>
        </div>
      )}

      {/* Member count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{team.channels.length} channel{team.channels.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamSettingsModal({
  open,
  teamId,
  workspaceId,
  isTeamOwner,
  currentUserId,
  onClose,
}: TeamSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  // Read team from store
  const team = useTeamsStore((s) => s.teams.find((t) => t.id === teamId));

  // Reset tab when modal opens
  useEffect(() => {
    if (open) setActiveTab("general");
  }, [open]);

  // Handle team updated (refresh local state)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTeamUpdated = useCallback((_data: Partial<TeamWithDetails>) => {
    // Store is already updated by the tab components; nothing extra needed here
  }, []);

  // Watch for team removal (deletion triggers close)
  const teamExists = useTeamsStore((s) => s.teams.some((t) => t.id === teamId));
  useEffect(() => {
    if (open && !teamExists) {
      // Team was deleted — close modal
      onClose();
    }
  }, [open, teamExists, onClose]);

  if (!team) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "general", label: "General" },
    { id: "members", label: "Members" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
                team.avatar ? "bg-muted" : deterministicColor(team.id)
              )}
            >
              {team.avatar ?? getInitials(team.name)}
            </span>
            <span className="truncate">{team.name}</span>
            <span className="text-muted-foreground font-normal text-sm">
              — {isTeamOwner ? "Settings" : "Info"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs (owner mode only) */}
        {isTeamOwner && (
          <div className="flex gap-0 px-6 pt-4 shrink-0 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isTeamOwner ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                {activeTab === "general" ? (
                  <GeneralTab
                    team={team}
                    workspaceId={workspaceId}
                    onTeamUpdated={handleTeamUpdated}
                  />
                ) : (
                  <MembersTab
                    team={team}
                    workspaceId={workspaceId}
                    currentUserId={currentUserId}
                    onTeamUpdated={handleTeamUpdated}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            // Member (read-only) mode: show general info + member list
            <div className="space-y-6">
              <ReadOnlyGeneralView team={team} />
              <div className="border-t border-border pt-5">
                <p className="text-sm font-medium text-foreground mb-3">Members</p>
                <ReadOnlyMembersView team={team} />
              </div>
            </div>
          )}
        </div>

        {/* Footer close button */}
        <DialogFooter className="px-6 pb-5 pt-0 shrink-0 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
