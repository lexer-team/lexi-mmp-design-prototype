/**
 * Segment - V1 — lightweight markdown
 *
 * `Markdown` renders a useful subset: headings, paragraphs, bold/citations
 * (via the shared renderInline), bullet/ordered lists, GFM pipe tables,
 * blockquotes, horizontal rules, code blocks, and a ```chart fenced block that
 * renders a bar/line chart via ChartBlock. `MarkdownEditor` adds a preview/edit
 * toggle over a textarea. No new dependencies.
 */
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { renderInline } from "./components/RichText";
import { ChartBlock } from "./components/ResponseBlocks";
import type { ChartSpec } from "./types";

function parseChart(json: string): ChartSpec | null {
  try {
    const o = JSON.parse(json);
    if (o && (o.kind === "bar" || o.kind === "line") && Array.isArray(o.series) && Array.isArray(o.data)) {
      return o as ChartSpec;
    }
  } catch { /* ignore */ }
  return null;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // Fenced block — ```chart … ``` or generic code.
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
      i++; // closing fence
      const content = body.join("\n");
      if (lang === "chart") {
        const spec = parseChart(content);
        blocks.push(spec
          ? <ChartBlock key={key++} chart={spec} />
          : <pre key={key++} className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground-secondary">{content}</pre>);
      } else {
        blocks.push(<pre key={key++} className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground-secondary">{content}</pre>);
      }
      continue;
    }

    // Heading.
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const cls = h[1].length <= 2 ? "text-base font-semibold text-foreground" : "text-sm font-semibold text-foreground";
      blocks.push(<p key={key++} className={cls}>{renderInline(h[2], `h${key}`)}</p>);
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { blocks.push(<hr key={key++} className="border-border" />); i++; continue; }

    // Table — header row + dashed separator.
    if (line.trim().startsWith("|") && i + 1 < lines.length && /-/.test(lines[i + 1]) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(splitRow(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{header.map((c, ci) => (
                <th key={ci} className="border-b border-border px-2 py-1.5 text-left font-medium text-foreground">{renderInline(c, `th${ci}`)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => (
                  <td key={ci} className="border-b border-border/60 px-2 py-1.5 text-foreground-secondary tabular-nums">{renderInline(c, `td${ri}-${ci}`)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote.
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push(<blockquote key={key++} className="border-l-2 border-border pl-3 text-sm italic text-foreground-secondary">{renderInline(quote.join(" "), `bq${key}`)}</blockquote>);
      continue;
    }

    // Unordered list.
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      blocks.push(<ul key={key++} className="list-disc space-y-1 pl-5 text-sm text-foreground-secondary">{items.map((it, ii) => <li key={ii}>{renderInline(it, `li${key}-${ii}`)}</li>)}</ul>);
      continue;
    }

    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      blocks.push(<ol key={key++} className="list-decimal space-y-1 pl-5 text-sm text-foreground-secondary">{items.map((it, ii) => <li key={ii}>{renderInline(it, `ol${key}-${ii}`)}</li>)}</ol>);
      continue;
    }

    // Paragraph.
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== "" &&
      !/^(#{1,6}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) { para.push(lines[i]); i++; }
    blocks.push(<p key={key++} className="text-sm leading-relaxed text-foreground-secondary">{renderInline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className="flex flex-col gap-3">{blocks}</div>;
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export function MarkdownEditor({
  value, onChange, title = "Finding",
}: {
  value: string;
  onChange: (v: string) => void;
  title?: string;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(["preview", "edit"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "edit" ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground">
            Markdown — supports headings, lists, tables, and{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">```chart</code> blocks.
          </p>
        </>
      ) : value.trim() ? (
        <Markdown source={value} />
      ) : (
        <p className="text-sm italic text-muted-foreground">No finding yet — switch to edit to add one.</p>
      )}
    </div>
  );
}
