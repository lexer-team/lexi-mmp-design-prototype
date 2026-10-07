import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RiExpandDiagonalLine } from "@remixicon/react";
import type { DefRef } from "@/data/def-registry";
import { KIND_META, ENTITY_LABEL } from "./kind-meta";

// ─── The shared anatomy: one definition card, used everywhere ────────────────────
// Cleaned up: no divider lines, only the load-bearing rows. Identity → description
// → logic/value → one key stat (or the allowed values). An expand button at the
// top right opens the full view; source / owner / where-used live there.

export function DefinitionCard({
  def,
  onExpand,
  hideRuleDetails = false,
}: {
  def: DefRef;
  onExpand?: () => void;
  hideRuleDetails?: boolean;
}) {
  const meta = KIND_META[def.kind];
  const Icon = meta.icon;
  const hideSegmentDetails = hideRuleDetails && def.kind === "segment";
  const hideLogic = hideRuleDetails && (def.kind === "segment" || def.kind === "group");

  return (
    <div className="flex w-80 flex-col gap-2.5 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
      {/* Identity — no divider */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{def.name}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {meta.label}{def.entity ? ` · ${ENTITY_LABEL[def.entity] ?? def.entity}` : ""}
          </p>
        </div>
        <button
          onClick={onExpand}
          title="Expand"
          className="-mr-0.5 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RiExpandDiagonalLine className="size-4" />
        </button>
      </div>

      {/* Plain-language description */}
      {def.description && !hideSegmentDetails && (
        <p className="text-sm leading-relaxed text-foreground-secondary">{def.description}</p>
      )}

      {/* The logic / value */}
      {def.logic && !hideLogic && (
        <div className="rounded-lg bg-muted px-2.5 py-1.5">
          <p className="break-words font-mono text-xs leading-relaxed text-foreground-secondary">{def.logic}</p>
        </div>
      )}

      {/* One key stat, inline — only the most useful number */}
      {def.stat && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold tabular-nums text-foreground">{def.stat.value}</span>
          <span className="text-xs text-muted-foreground">{def.stat.label}</span>
        </div>
      )}

      {/* Allowed values (attributes) — stand in for a stat */}
      {!def.stat && def.possibleValues && def.possibleValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {def.possibleValues.slice(0, 4).map((v) => <Badge key={v} variant="outline" size="sm">{v}</Badge>)}
          {def.possibleValues.length > 4 && (
            <span className="self-center text-xs text-muted-foreground">+{def.possibleValues.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── The expanded register: a segment when it IS the answer ──────────────────────

export function SegmentReferenceCard({ def, onOpen }: { def: DefRef; onOpen?: () => void }) {
  const Icon = KIND_META[def.kind].icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{def.name}</span>
          {def.statusLabel && <Badge variant={def.statusTone ?? "secondary"} size="sm">{def.statusLabel}</Badge>}
        </div>
        <p className="truncate text-xs text-foreground-secondary">{def.description}</p>
      </div>
      {def.stat && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground">{def.stat.value}</p>
          <p className="text-[11px] text-muted-foreground">{def.stat.label}</p>
        </div>
      )}
      <Button size="sm" variant="outline" className="shrink-0" onClick={onOpen}>Open</Button>
    </div>
  );
}
