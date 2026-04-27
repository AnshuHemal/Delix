"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Search, Check } from "lucide-react";
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
import { useChatStore } from "@/stores/chat-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewConversationModalProps {
  open: boolean;
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

export function NewConversationModal({ open, onClose }: NewConversationModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  // ── Fetch members ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }

        const response = await fetch(`/api/workspaces/members?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch members");
        }

        const data = await response.json();
        setMembers(data.members ?? []);
      } catch (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  // ── Focus input on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // ── Handle modal close with state reset ──────────────────────────────────
  function handleClose() {
    setSearchQuery("");
    setMembers([]);
    setSelectedMembers([]);
    setIsCreating(false);
    onClose();
  }

  // ── Toggle member selection ──────────────────────────────────────────────
  function toggleMember(member: WorkspaceMember) {
    setSelectedMembers((prev) => {
      const isSelected = prev.some((m) => m.id === member.id);
      if (isSelected) {
        return prev.filter((m) => m.id !== member.id);
      }
      return [...prev, member];
    });
  }

  // ── Remove selected member ───────────────────────────────────────────────
  function removeMember(memberId: string) {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  // ── Create conversation ──────────────────────────────────────────────────
  async function handleCreateConversation() {
    if (selectedMembers.length === 0 || isCreating) return;

    setIsCreating(true);
    try {
      const payload =
        selectedMembers.length === 1
          ? {
              type: "DIRECT" as const,
              userId: selectedMembers[0].id,
            }
          : {
              type: "GROUP" as const,
              userIds: selectedMembers.map((m) => m.id),
            };

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      const conversationId = data.conversation?.id;

      if (conversationId) {
        // Set active conversation and navigate
        setActiveConversation(conversationId);
        router.push(`/dashboard/chat?id=${conversationId}`);
        handleClose();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      // TODO: Show error toast
    } finally {
      setIsCreating(false);
    }
  }

  const isSelected = (memberId: string) =>
    selectedMembers.some((m) => m.id === memberId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name..."
              className="pl-9"
            />
          </div>

          {/* Selected members chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
                >
                  {member.image ? (
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={20}
                      height={20}
                      unoptimized
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                        deterministicColor(member.id)
                      )}
                    >
                      {getInitials(member.name)}
                    </div>
                  )}
                  <span className="font-medium">{member.name}</span>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    aria-label={`Remove ${member.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Members list */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <p className="text-sm text-muted-foreground">
                  {searchQuery.trim()
                    ? "No members found"
                    : "Start typing to search for members"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {members.map((member) => {
                  const selected = isSelected(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        selected && "bg-accent"
                      )}
                    >
                      {/* Avatar */}
                      {member.image ? (
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={36}
                          height={36}
                          unoptimized
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                            deterministicColor(member.id)
                          )}
                        >
                          {getInitials(member.name)}
                        </div>
                      )}

                      {/* Name */}
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {member.name}
                      </span>

                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          selected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selected && <Check size={14} className="text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={selectedMembers.length === 0 || isCreating}
          >
            {isCreating
              ? "Creating..."
              : selectedMembers.length === 1
              ? "Start DM"
              : `Create group (${selectedMembers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
