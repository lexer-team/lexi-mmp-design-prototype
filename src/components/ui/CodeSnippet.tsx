import { useState } from "react";
import { cn } from "@/lib/utils";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";

/* code snippet: filename/language bar with a copy button over a token-styled
   block. Dependency-free (no syntax-highlighting lib); for real highlighting,
   wrap a highlighter like Shiki or Prism and keep this chrome. */

export function CodeSnippet({
  code,
  filename,
  language,
  className,
}: {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-muted", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
          {filename ?? language ?? "Code"}
        </span>
        <button
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy"}
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          )}
        >
          {copied ? <RiCheckLine className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <RiFileCopyLine className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
