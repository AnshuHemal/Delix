"use client";

import Image from "next/image";
import { FileIcon, Download } from "lucide-react";
import type { MessageAttachment } from "@/generated/prisma/client";

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => {
        const isImage = attachment.mimeType.startsWith("image/");

        if (isImage) {
          return (
            <a
              key={attachment.id}
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[320px] rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
            >
              <Image
                src={attachment.fileUrl}
                alt={attachment.fileName}
                width={320}
                height={240}
                unoptimized
                className="w-full h-auto object-cover"
              />
            </a>
          );
        }

        // Non-image file card
        return (
          <a
            key={attachment.id}
            href={attachment.fileUrl}
            download={attachment.fileName}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors max-w-[320px]"
          >
            <div className="w-10 h-10 rounded bg-background flex items-center justify-center shrink-0">
              <FileIcon size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>
            <Download size={16} className="text-muted-foreground shrink-0" />
          </a>
        );
      })}
    </div>
  );
}
