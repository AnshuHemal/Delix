"use client";

import { useState, Fragment } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Emoji-only helper ────────────────────────────────────────────────────────

/**
 * Returns true when the content consists solely of 1–3 emoji characters
 * (ignoring surrounding whitespace) with no other text.
 */
export function isEmojiOnly(content: string): boolean {
  if (!content) return false;
  const stripped = content.replace(/\s/g, "");
  // Match sequences of emoji presentation / extended pictographic characters
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  // Limit to a reasonable character count (3 emoji ≈ up to ~8 code points)
  return emojiRegex.test(stripped) && stripped.length <= 8;
}

// ─── Copy button for code blocks ─────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Inline parser ────────────────────────────────────────────────────────────

type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "url"; value: string }
  | { kind: "mention"; value: string };

/**
 * Parse a single line of text into inline nodes.
 * Order matters: code spans first (to avoid formatting inside them),
 * then bold, italic, mentions, URLs, and plain text.
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];

  // Combined regex — order: inline-code, bold, italic (*), italic (_), mention, url
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)|(@\w+)|(https?:\/\/[^\s<>"]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      nodes.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }

    const [full, inlineCode, bold, italicStar, italicUnderscore, mention, url] = match;

    if (inlineCode) {
      nodes.push({ kind: "code", value: full.slice(1, -1) });
    } else if (bold) {
      nodes.push({ kind: "bold", value: full.slice(2, -2) });
    } else if (italicStar) {
      nodes.push({ kind: "italic", value: full.slice(1, -1) });
    } else if (italicUnderscore) {
      nodes.push({ kind: "italic", value: full.slice(1, -1) });
    } else if (mention) {
      nodes.push({ kind: "mention", value: full.slice(1) }); // strip leading @
    } else if (url) {
      nodes.push({ kind: "url", value: full });
    }

    lastIndex = match.index + full.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

function renderInlineNode(
  node: InlineNode,
  index: number,
  currentUserName?: string
): React.ReactNode {
  switch (node.kind) {
    case "text":
      return <Fragment key={index}>{node.value}</Fragment>;

    case "bold":
      return <strong key={index}>{node.value}</strong>;

    case "italic":
      return <em key={index}>{node.value}</em>;

    case "code":
      return (
        <code
          key={index}
          className="font-mono bg-muted px-1 rounded text-[0.85em]"
        >
          {node.value}
        </code>
      );

    case "url":
      return (
        <a
          key={index}
          href={node.value}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary hover:text-primary/80 break-all"
        >
          {node.value}
        </a>
      );

    case "mention": {
      const isSelf =
        currentUserName &&
        node.value.toLowerCase() === currentUserName.toLowerCase();
      return (
        <span
          key={index}
          className={cn(
            "rounded px-0.5",
            isSelf
              ? "text-primary font-medium"
              : "bg-muted text-foreground"
          )}
        >
          @{node.value}
        </span>
      );
    }
  }
}

// ─── Block-level parser ───────────────────────────────────────────────────────

type Block =
  | { kind: "fenced-code"; lang: string; value: string }
  | { kind: "paragraph"; value: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  // Split on fenced code blocks (``` ... ```)
  const fencePattern = /```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) {
        blocks.push({ kind: "paragraph", value: text });
      }
    }
    blocks.push({ kind: "fenced-code", lang: match[1] ?? "", value: match[2] ?? "" });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      blocks.push({ kind: "paragraph", value: remaining });
    }
  }

  return blocks;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MessageContentProps {
  content: string;
  currentUserId: string;
  /** Optional: the current user's display name, used for @mention highlighting */
  currentUserName?: string;
}

export function MessageContent({
  content,
  currentUserId: _currentUserId,
  currentUserName,
}: MessageContentProps) {
  if (!content) return null;

  // Emoji-only: render large without bubble (caller handles the bubble suppression,
  // but we still render large here so the component is self-contained)
  if (isEmojiOnly(content)) {
    return (
      <span className="text-5xl leading-none select-none">{content}</span>
    );
  }

  const blocks = parseBlocks(content);

  return (
    <span className="whitespace-pre-wrap wrap-break-word">
      {blocks.map((block, blockIdx) => {
        if (block.kind === "fenced-code") {
          return (
            <span key={blockIdx} className="block my-1">
              <span className="relative block">
                <pre className="bg-muted rounded-md px-3 py-2 overflow-x-auto text-xs font-mono leading-relaxed pr-8">
                  <code>{block.value}</code>
                </pre>
                <CopyButton text={block.value} />
              </span>
            </span>
          );
        }

        // Paragraph: split on newlines to preserve line breaks
        const lines = block.value.split("\n");
        return (
          <Fragment key={blockIdx}>
            {lines.map((line, lineIdx) => {
              const nodes = parseInline(line);
              return (
                <Fragment key={lineIdx}>
                  {nodes.map((node, nodeIdx) =>
                    renderInlineNode(node, nodeIdx, currentUserName)
                  )}
                  {lineIdx < lines.length - 1 && <br />}
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </span>
  );
}
