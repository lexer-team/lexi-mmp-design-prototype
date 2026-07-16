import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getDef } from "@/data/def-registry";
import { KIND_META } from "@/components/definitions/kind-meta";
import { DefinitionCard } from "@/components/definitions/DefinitionCard";
import type { DefRef } from "@/data/def-registry";

const CITATION_RE = /\[\[([^\]]+)\]\]/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

interface RichTextProps {
  content: string;
}

// Inline markdown: renders `[[id]]` citations and `**bold**` within a string,
// preserving order. Shared by paragraphs, headings, bullets and insight callouts.
export function renderInline(text: string, keyBase = "i"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(...renderBold(text.slice(lastIndex, match.index), `${keyBase}-${lastIndex}`));
    nodes.push(<InlineCitation key={`${keyBase}-c${match.index}`} id={match[1]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(...renderBold(text.slice(lastIndex), `${keyBase}-${lastIndex}`));
  return nodes;
}

function renderBold(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(<strong key={`${keyBase}-b${match.index}`} className="font-semibold text-foreground">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Markdown-lite block renderer for Lexi responses: supports `## heading`,
// `### sub-heading`, `- bullet` lists, blank-line spacing, and inline
// `[[id]]` / `**bold**`. Keeps everything in the supporting-text tier.
export function RichText({ content }: RichTextProps) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
        {bullets}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(<li key={`li-${i}`}>{renderInline(bullet[1], `li-${i}`)}</li>);
      return;
    }
    flushBullets();

    if (line.trim() === "") {
      out.push(<div key={`sp-${i}`} className="h-1" />);
      return;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      out.push(<h6 key={`h3-${i}`} className="text-sm font-semibold text-foreground">{renderInline(h3[1], `h3-${i}`)}</h6>);
      return;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      out.push(
        <h5 key={`h2-${i}`} className="mt-1 text-sm font-semibold text-foreground first:mt-0">
          {renderInline(h2[1], `h2-${i}`)}
        </h5>,
      );
      return;
    }
    out.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
  });
  flushBullets();

  return <div className="space-y-2 text-sm leading-relaxed text-foreground-secondary">{out}</div>;
}

// Inline renderer for short, single-line strings (e.g. a user prompt bubble):
// splits on `[[id]]` tokens and renders each as the same InlineCitation chip used
// elsewhere, but stays inline and inherits the surrounding text colour (no block
// wrapper / paragraph spacing). Keeps @-mentions looking identical everywhere.
export function MentionText({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push(<InlineCitation key={match.index} id={match[1]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return <>{parts}</>;
}

// Plain-text form of a string with `[[id]]` tokens, rendered as "@Name" — for
// places that can't host rich nodes (e.g. the truncated suggestion chip).
export function stripMentions(content: string): string {
  return content.replace(CITATION_RE, (_full, id) => {
    const def = getDef(id);
    return def ? `@${def.name}` : id;
  });
}

function InlineCitation({ id }: { id: string }) {
  const def = getDef(id);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  if (!def) {
    return <span className="font-medium text-foreground">{id}</span>;
  }

  const Icon = KIND_META[def.kind]?.icon;

  return (
    <span
      ref={triggerRef}
      className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 inline-flex items-baseline"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {Icon && <Icon className="relative top-[1px] mr-0.5 inline size-3 text-muted-foreground" />}
      <span className="font-medium text-foreground">
        {def.name}
      </span>
      {open && createPortal(
        <div
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <DefinitionCard def={def} />
        </div>,
        document.body,
      )}
    </span>
  );
}
