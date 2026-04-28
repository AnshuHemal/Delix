/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  FileIcon,
  FileImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileTextIcon,
  FileCodeIcon,
  FileArchiveIcon,
  FileSpreadsheetIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileWithUploader } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null): React.ReactNode {
  if (!mimeType) return <FileIcon className="w-6 h-6 text-muted-foreground" />;

  if (mimeType.startsWith("image/"))
    return <FileImageIcon className="w-6 h-6 text-blue-500" />;
  if (mimeType.startsWith("video/"))
    return <FileVideoIcon className="w-6 h-6 text-purple-500" />;
  if (mimeType.startsWith("audio/"))
    return <FileAudioIcon className="w-6 h-6 text-pink-500" />;
  if (mimeType === "application/pdf")
    return <FileTextIcon className="w-6 h-6 text-red-500" />;
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv"
  )
    return <FileSpreadsheetIcon className="w-6 h-6 text-green-500" />;
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return <FileTextIcon className="w-6 h-6 text-blue-600" />;
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip"
  )
    return <FileArchiveIcon className="w-6 h-6 text-yellow-500" />;
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  )
    return <FileCodeIcon className="w-6 h-6 text-orange-500" />;

  return <FileIcon className="w-6 h-6 text-muted-foreground" />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FileSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-3.5 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-muted shrink-0" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

function FileCard({ file }: { file: FileWithUploader }) {
  const uploadDate = new Date(file.createdAt);

  return (
    <button
      type="button"
      onClick={() => window.open(file.url, "_blank")}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left",
        "hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={`Open ${file.name}`}
    >
      {/* File icon + name + size */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {getFileIcon(file.mimeType)}
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate leading-snug">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>

      {/* Uploader + date */}
      <div className="flex items-center gap-2">
        {file.uploadedBy.image ? (
          <Image
            src={file.uploadedBy.image}
            alt={file.uploadedBy.name ?? "User"}
            width={20}
            height={20}
            unoptimized
            className="w-5 h-5 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold shrink-0">
            {file.uploadedBy.name?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        )}
        <span className="text-xs text-muted-foreground truncate">
          {file.uploadedBy.name ?? "Unknown"}
          <span className="mx-1">·</span>
          {format(uploadDate, "MMM d, yyyy")}
        </span>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ChannelFilesTabProps {
  channelId: string;
}

export function ChannelFilesTab({ channelId }: ChannelFilesTabProps) {
  const [files, setFiles] = useState<FileWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchFiles() {
      try {
        const res = await fetch(`/api/channels/${channelId}/files`);
        if (!res.ok) throw new Error("Failed to load files");
        const data = await res.json();
        if (!cancelled) {
          setFiles(data.files ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load files");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchFiles();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FileSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8 py-16">
        <p className="text-sm text-muted-foreground">Failed to load files. Please try again.</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <FileIcon className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No files shared yet</p>
        <p className="text-xs text-muted-foreground">
          Files attached to messages in this channel will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  );
}
