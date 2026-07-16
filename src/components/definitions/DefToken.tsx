import { useRef, useState } from "react";
import { RiAddLine } from "@remixicon/react";
import { getDef, treatmentForKind, type DefRef } from "@/data/def-registry";
import { KIND_META } from "./kind-meta";
import { DefinitionCard } from "./DefinitionCard";

// ─── The inline token — the handle that summons a definition ─────────────────────
// `variant="auto"` (default) picks the treatment from the kind: saved objects
// (segment / dashboard / group) get a chip; concepts that are only a definition
// or value (term / attribute / metric) get a dotted underline in the prose.

type TokenVariant = "auto" | "chip" | "underline" | "highlight";

export function DefToken({
  id, def: defProp, variant = "auto", label,
}: { id?: string; def?: DefRef; variant?: TokenVariant; label?: string }) {
  const def = defProp ?? (id ? getDef(id) : undefined);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Undefined / gap term — the "fill the gap" treatment
  if (!def) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-400/70 bg-amber-50/60 px-1.5 align-middle text-sm font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
        {label ?? id} <RiAddLine className="size-3" />
      </span>
    );
  }

  const resolved = variant === "auto" ? treatmentForKind(def.kind) : variant;
  const Icon = KIND_META[def.kind].icon;
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120); };
  const text = label ?? def.name;

  const trigger =
    resolved === "underline" ? (
      <span className="cursor-help font-medium text-foreground underline decoration-dotted decoration-foreground/40 underline-offset-4">
        {text}
      </span>
    ) : resolved === "highlight" ? (
      <span className="cursor-pointer rounded bg-primary/10 px-1 font-medium text-primary">{text}</span>
    ) : (
      <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-1.5 align-middle text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent">
        <Icon className="size-3 text-primary" />
        {text}
      </span>
    );

  return (
    <span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {trigger}
      {open && (
        <span className="absolute left-0 top-full z-50 block pt-2">
          <DefinitionCard def={def} />
        </span>
      )}
    </span>
  );
}
