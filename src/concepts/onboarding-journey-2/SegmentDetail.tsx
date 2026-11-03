import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react";
import { useSession } from "./store";
import { SegmentBuilder } from "./components/SegmentBuilder";
import { segmentToLogic, computeMetrics, type LogicGroupNode } from "./segment-logic";

function ContextBlock({ label, text }: { label: string; text?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {text
        ? <p className="text-sm leading-relaxed text-foreground-secondary">{text}</p>
        : <p className="text-sm italic text-muted-foreground">Not documented yet — add context so your team knows the intent.</p>}
    </div>
  );
}

const EMPTY_TREE: LogicGroupNode = { kind: "group", id: "root", connector: "all", children: [] };

/**
 * Segment detail — reusable content shown both as a full page (from the Groups
 * list) and inside the inset side panel (from the artifact panel). Uses the same
 * SegmentBuilder interaction; metrics recompute from the live tree.
 */
export function SegmentDetail({ artifactId, onClose, compact = false }: {
  artifactId: string;
  onClose?: () => void;
  compact?: boolean;
}) {
  const { state } = useSession();
  const artifact = state.artifacts.get(artifactId);
  const [tree, setTree] = useState<LogicGroupNode>(() =>
    artifact?.body?.kind === "segment" ? segmentToLogic(artifact.id, artifact.body.criteria) : EMPTY_TREE,
  );

  if (!artifact || artifact.body?.kind !== "segment") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Segment not found.</p>
      </div>
    );
  }

  const body = artifact.body;
  const def = artifact.def;
  const seedMetrics = body.metrics?.slice(0, 3) ?? (body.population ? [{ label: "Population", value: body.population }] : []);
  const metrics = computeMetrics(tree, seedMetrics);

  return (
    <div className={cn("flex w-full flex-col", compact ? "gap-4 px-4 py-4" : "mx-auto max-w-4xl gap-6 px-6 py-6")}>
      {onClose && !compact && (
        <button
          onClick={onClose}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RiArrowLeftLine className="size-4" /> Back
        </button>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-xl")}>{artifact.name}</h1>
            {artifact.status === "saved"
              ? <Badge variant="success">Saved</Badge>
              : <Badge variant="warning">Proposed</Badge>}
            {!compact && <Badge variant="secondary">Dynamic · auto-updates</Badge>}
          </div>
          {def?.description && <p className="text-sm text-foreground-secondary">{def.description}</p>}
        </div>
        {!compact && <Button size="sm" className="shrink-0">Activate <RiArrowRightLine className="size-4" /></Button>}
      </div>

      {/* Metrics — recompute from the live tree */}
      {metrics.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="min-w-0">
              <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
              <p className="text-sm font-medium text-foreground-secondary">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Definition — the shared builder */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SegmentBuilder tree={tree} setTree={setTree} title="Definition" editable />
      </div>

      {!compact && (
        <>
          <ContextBlock
            label="Why we're building this"
            text="Re-engage lapsed but valuable customers before the holiday sale, focusing spend on people who are still reachable."
          />
          <ContextBlock
            label="When to use"
            text="Holiday and seasonal win-back campaigns where reachability matters more than raw audience size."
          />
        </>
      )}
    </div>
  );
}
