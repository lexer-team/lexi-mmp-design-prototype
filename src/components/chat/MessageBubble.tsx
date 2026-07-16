import { cn } from "@/lib/utils";
import { LexiIcon } from "./LexiIcon";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import type { Message, MessageBlock, ArtifactBlock } from "@/data/mock";
import { RiLoader4Line, RiCheckboxCircleLine } from "@remixicon/react";
import { useState } from "react";

// ─── Simple markdown renderer ────────────────────────────────────────────────
// Handles **bold**, - lists, and line breaks — enough for our mock content
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1" />;

        // Bullet list
        if (line.trim().startsWith("- ")) {
          const text = line.trim().slice(2);
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: renderBold(text) }} />
            </div>
          );
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: renderBold(line) }} />
        );
      })}
    </div>
  );
}

function renderBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ─── Tool block ───────────────────────────────────────────────────────────────
function ToolBlock({ block }: { block: Extract<MessageBlock, { type: "tool" }> }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
      {block.status === "thinking" ? (
        <RiLoader4Line className="size-3 animate-spin text-primary" />
      ) : (
        <RiCheckboxCircleLine className="size-3 text-emerald-500" />
      )}
      <span>{block.label}</span>
    </div>
  );
}

// ─── Message ──────────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  onExpandArtifact?: (block: ArtifactBlock) => void;
}

export function MessageBubble({ message, isLast, onExpandArtifact }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        isLast && "min-h-[calc(100dvh-200px)]",
      )}
    >
      {/* User prompt */}
      {message.prompt && (
        <div className="self-end max-w-xl">
          <div className="bg-card border border-border rounded-2xl px-4 py-2.5 text-sm break-words">
            {message.prompt}
          </div>
        </div>
      )}

      {/* Lexi response */}
      {message.blocks && message.blocks.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Lexi header */}
          <h4 className="text-base font-semibold text-primary flex items-center gap-2">
            <LexiIcon className="size-3.5" />
            {message.blocks.some((b) => b.type === "tool" && b.status === "thinking")
              ? "Lexi is thinking…"
              : "Lexi"}
          </h4>

          {/* Blocks */}
          {message.blocks.map((block, i) => {
            if (block.type === "text") {
              return <SimpleMarkdown key={i} content={block.content} />;
            }
            if (block.type === "tool") {
              return <ToolBlock key={i} block={block} />;
            }
            if (block.type === "artifact") {
              return (
                <ArtifactCard
                  key={i}
                  block={block}
                  onExpand={onExpandArtifact ? () => onExpandArtifact(block) : undefined}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
