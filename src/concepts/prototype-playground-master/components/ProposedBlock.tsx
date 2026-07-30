import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  RiCheckLine,
  RiCloseLine,
  RiGroupLine,
  RiLightbulbLine,
  RiRouteLine,
  RiBarChartLine,
  RiDashboardLine,
  RiListOrdered2,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowDownLine,
  RiEditLine,
  RiShieldCheckLine,
  RiAlertLine,
  RiPencilLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { Artifact, ArtifactType } from "../types";
import { useSession } from "../store";
import { SegmentBuilder, ViewToggle, type DefView } from "./SegmentBuilder";
import { segmentToLogic, computeMetrics, type LogicGroupNode } from "../segment-logic";

const TYPE_ICON: Record<ArtifactType, RemixiconComponentType> = {
  segment: RiGroupLine,
  insight: RiLightbulbLine,
  recommendation: RiListOrdered2,
  workflow: RiRouteLine,
  scorecard: RiBarChartLine,
  dashboard: RiDashboardLine,
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  segment: "Segment",
  insight: "Insight",
  recommendation: "Recommendation",
  workflow: "Workflow",
  scorecard: "Scorecard",
  dashboard: "Dashboard",
};

interface ProposedBlockProps {
  artifactId: string;
  /** When set, this card collapses to a compact "first cut" note once the segment is refined. */
  collapseWhenRefined?: boolean;
}

export function ProposedBlock({ artifactId, collapseWhenRefined }: ProposedBlockProps) {
  const { state } = useSession();
  const artifact = state.artifacts.get(artifactId);

  if (!artifact) return null;

  if (artifact.type === "insight") {
    return <InsightBlock artifact={artifact} />;
  }

  if (artifact.type === "recommendation" && artifact.body?.kind === "recommendation") {
    return <RecommendationBlock artifact={artifact} />;
  }

  if (artifact.type === "segment" && artifact.body?.kind === "segment") {
    return <SegmentCard artifact={artifact} collapseWhenRefined={collapseWhenRefined} />;
  }

  return <CardBlock artifact={artifact} />;
}

// ─── Insight — quote-style block ────────────────────────────────────────────

function InsightBlock({ artifact }: { artifact: Artifact }) {
  const canKickoffSegment = artifact.id === "bf-insight-reactivation-window";

  const kickoffSegmentFromInsight = () => {
    window.dispatchEvent(
      new CustomEvent("prototype-master:start-next-turn", {
        detail: {
          text: "Yes, let's build a segment for early access customers for Black Friday",
        },
      }),
    );
  };

  // Saved → render as full artifact card
  if (artifact.status === "saved") {
    return <SavedInsightCard artifact={artifact} />;
  }

  // Dismissed insights are hidden from the chat stream.
  if (artifact.status === "dismissed") {
    return null;
  }

  // Proposed → standalone response frame (no save/reject controls)
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h5 className="text-sm font-semibold text-foreground">{artifact.name}</h5>
        {canKickoffSegment && (
          <Button
            size="xs"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={kickoffSegmentFromInsight}
          >
            Build the early access segment
          </Button>
        )}
      </div>

      {/* Body */}
      {artifact.body?.kind === "insight" && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground-secondary mb-0.5">Recommendation</p>
            <RecommendationText content={artifact.body.implication} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dismiss reason popover ─────────────────────────────────────────────────

function DismissBody({
  reason,
  onReasonChange,
  onDismiss,
  onCancel,
}: {
  reason: string;
  onReasonChange: (v: string) => void;
  onDismiss: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <p className="text-sm font-medium text-foreground mb-1.5">Help Lexi understand more:</p>
      <input
        type="text"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Optional reason..."
        className="w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/40"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onDismiss();
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-2 flex items-center gap-1.5">
        <Button
          size="xs"
          variant="ghost"
          className="h-6 flex-1 px-2 text-[11px]"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="xs"
          className="h-6 flex-1 px-2 text-[11px]"
          onClick={onDismiss}
        >
          Submit
        </Button>
      </div>
    </>
  );
}

// When `anchorRef` is given, the popover is portaled to <body> with fixed
// positioning so it isn't clipped by an `overflow-hidden` card and doesn't
// reflow the card's content. Otherwise it falls back to absolute positioning.
function DismissPopover({
  anchorRef,
  ...body
}: {
  anchorRef?: React.RefObject<HTMLElement | null>;
  reason: string;
  onReasonChange: (v: string) => void;
  onDismiss: () => void;
  onCancel: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const WIDTH = 220;

  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    let left = Math.min(r.right - WIDTH, window.innerWidth - WIDTH - 8);
    left = Math.max(8, left);
    let top = r.bottom + 4;
    if (top + 150 > window.innerHeight - 8) top = r.top - 150; // flip up near the bottom
    setPos({ top, left });
  }, [anchorRef]);

  if (anchorRef) {
    if (!pos) return null;
    return createPortal(
      <div
        className="fixed z-[9999] w-[220px] rounded-lg border border-border bg-card p-2.5 shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150"
        style={{ top: pos.top, left: pos.left }}
      >
        <DismissBody {...body} />
      </div>,
      document.body,
    );
  }

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-[220px] rounded-lg border border-border bg-card p-2.5 shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <DismissBody {...body} />
    </div>
  );
}

// ─── Saved insight → rendered as a card ──────────────────────────────────────

function SavedInsightCard({ artifact }: { artifact: Artifact }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RiLightbulbLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{artifact.name}</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-primary animate-in fade-in-0 duration-200">
          <RiCheckLine className="size-3" />
          Saved
        </span>
      </div>
      {artifact.body?.kind === "insight" && (
        <div className="px-3 py-2.5 space-y-1.5">
          <div>
            <p className="text-sm font-medium text-foreground-secondary mb-0.5">Recommendation</p>
            <RecommendationText content={artifact.body.implication} />
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationText({ content }: { content: string }) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== "recommendation");

  const blocks: Array<{ type: "text" | "bullet"; value: string }> = [];
  for (const line of lines) {
    if (line.startsWith("- ")) blocks.push({ type: "bullet", value: line.slice(2).trim() });
    else blocks.push({ type: "text", value: line });
  }

  return (
    <div className="space-y-1.5 text-sm text-foreground-secondary leading-relaxed">
      {blocks.map((block, index) => (
        block.type === "bullet" ? (
          <div key={`recommendation-${index}`} className="flex gap-2">
            <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-foreground-secondary" />
            <span>{block.value}</span>
          </div>
        ) : (
          <p key={`recommendation-${index}`}>{block.value}</p>
        )
      ))}
    </div>
  );
}

// ─── Recommendation — enriched card with expand/collapse ────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  klaviyo: "Klaviyo",
  meta: "Meta",
  sms: "SMS",
  email: "Email",
};

function RecommendationBlock({ artifact }: { artifact: Artifact }) {
  const { dispatch } = useSession();
  const [expanded, setExpanded] = useState(false);
  const body = artifact.body;
  if (body?.kind !== "recommendation") return null;

  const uniqueChannels = [...new Set(body.steps.map((s) => s.channel))];
  const maxWeek = Math.max(...body.steps.map((s) => s.week));
  const segmentCount = new Set(body.steps.map((s) => s.segment)).size;

  if (artifact.status === "dismissed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Dismissed</span>
        <span className="text-xs text-muted-foreground">·</span>
        <button
          onClick={() => dispatch({ type: "RESTORE_ARTIFACT", id: artifact.id })}
          className="text-sm text-primary hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  const isConfirmed = artifact.planStatus === "confirmed";

  return (
    <div className={cn(
      "rounded-xl border bg-card shadow-xs overflow-hidden",
      isConfirmed ? "border-primary/40" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RiListOrdered2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{artifact.name}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">Recommendation</p>
        </div>
        {artifact.status === "saved" && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <RiCheckLine className="size-3" />
            {isConfirmed ? "Confirmed" : "Saved"}
          </span>
        )}
      </div>

      {/* Summary row */}
      <div className="px-3 py-2 border-b border-border/40">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground-secondary">
          <span>{segmentCount} segments</span>
          <span className="text-border">·</span>
          <span>{maxWeek} weeks</span>
          <span className="text-border">·</span>
          <span>{uniqueChannels.map((c) => CHANNEL_LABEL[c] || c).join(" + ")}</span>
        </div>
        {/* Step summary (collapsed) */}
        <div className="mt-1.5 space-y-0.5">
          {body.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm text-foreground-secondary">
              <span className="shrink-0 w-8 font-medium text-muted-foreground">Wk{step.week}</span>
              <span className="truncate">{step.label}</span>
              {step.projectedRevenue && (
                <span className="ml-auto shrink-0 font-medium text-foreground">{step.projectedRevenue}</span>
              )}
              {step.approvalGate ? (
                <RiAlertLine className="size-3 shrink-0 text-amber-500" />
              ) : (
                <RiShieldCheckLine className="size-3 shrink-0 text-emerald-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        {expanded ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
        {expanded ? "Collapse details" : "Show details"}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2.5 space-y-3 animate-in slide-in-from-top-1 fade-in-0 duration-150">
          {/* Steps detail */}
          <div className="space-y-2">
            {body.steps.map((step, i) => (
              <div key={step.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                    <Badge size="sm" variant="secondary" className="text-[10px]">
                      {CHANNEL_LABEL[step.channel] || step.channel}
                    </Badge>
                    {step.approvalGate && (
                      <Badge size="sm" variant="warning" className="text-[10px]">Gate</Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground-secondary mt-0.5">{step.offer}</p>
                  {step.conditional && (
                    <p className="text-[11px] text-amber-600 mt-0.5">If: {step.conditional}</p>
                  )}
                </div>
                {step.projectedRevenue && (
                  <span className="text-sm font-medium text-foreground shrink-0">{step.projectedRevenue}</span>
                )}
              </div>
            ))}
          </div>

          {/* Scorecard preview */}
          <div className="border-t border-border/40 pt-2">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Scorecard</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {body.scorecard.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm">
                  <span className="text-foreground-secondary">{m.label}:</span>
                  <span className="font-medium text-foreground">{m.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inputs/provenance */}
          {body.inputs.length > 0 && (
            <div className="border-t border-border/40 pt-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Based on</p>
              <div className="flex flex-wrap gap-1">
                {body.inputs.map((inputId) => (
                  <span
                    key={inputId}
                    className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-foreground-secondary"
                  >
                    {inputId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {artifact.status === "proposed" && (
        <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
          <Button
            size="xs"
            onClick={() => dispatch({ type: "CONFIRM_RECOMMENDATION", id: artifact.id })}
          >
            Approve
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => dispatch({ type: "DISMISS_ARTIFACT", id: artifact.id })}
          >
            Reject
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="ml-auto"
            onClick={() => dispatch({ type: "OPEN_PLAN_BUILDER", id: artifact.id })}
          >
            <RiEditLine className="size-3 mr-1" />
            Edit plan
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Card block — segments, recommendations, etc. ───────────────────────────

function CardBlock({ artifact }: { artifact: Artifact }) {
  const { dispatch } = useSession();

  if (artifact.status === "dismissed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Dismissed</span>
        <span className="text-xs text-muted-foreground">·</span>
        <button
          onClick={() => dispatch({ type: "RESTORE_ARTIFACT", id: artifact.id })}
          className="text-sm text-primary hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  const Icon = TYPE_ICON[artifact.type];
  const saved = artifact.status === "saved";

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Header — icon square, title + inline Saved badge, type subtitle (mirrors SegmentCard) */}
      <div className="flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{artifact.name}</span>
            {saved && (
              <Badge variant="success" size="sm" className="gap-1"><RiCheckLine className="size-3" />Saved</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{TYPE_LABEL[artifact.type]}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <ArtifactBody artifact={artifact} />
      </div>

      {/* Footer — right-aligned Dismiss then Save (matches SegmentCard) */}
      {!saved && (
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-3 py-2">
          <Button
            size="xs"
            variant="outline"
            className="w-20"
            onClick={() => dispatch({ type: "DISMISS_ARTIFACT", id: artifact.id })}
          >
            Dismiss
          </Button>
          <Button
            size="xs"
            className="w-20"
            onClick={() => dispatch({ type: "SAVE_ARTIFACT", id: artifact.id })}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function ArtifactBody({ artifact }: { artifact: Artifact }) {
  const { body } = artifact;
  if (!body) return null;

  switch (body.kind) {
    case "recommendation":
      return (
        <ol className="space-y-1">
          {body.steps.map((step, i) => (
            <li key={step.id} className={cn("flex items-start gap-2 text-sm text-foreground-secondary")}>
              <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      );

    case "workflow":
    case "dashboard":
      return (
        <p className="text-sm text-foreground-secondary">{body.description}</p>
      );

    default:
      return null;
  }
}

// ─── Segment card — Preview / Edit / Saved / Dismissed ───────────────────────

function SegmentCard({ artifact, collapseWhenRefined }: { artifact: Artifact; collapseWhenRefined?: boolean }) {
  const { state, dispatch } = useSession();
  const [showDismiss, setShowDismiss] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [defView, setDefView] = useState<DefView>("plain");
  const dismissAnchor = useRef<HTMLDivElement>(null);

  const body = artifact.body;
  // Hooks must run unconditionally — seed the tree from the segment body.
  const [tree, setTree] = useState<LogicGroupNode>(() =>
    segmentToLogic(artifact.id, body?.kind === "segment" ? body.criteria : []),
  );

  if (body?.kind !== "segment") return null;

  // ── Refined → this earlier "first cut" card collapses to a compact note ──
  if (collapseWhenRefined && artifact.refinedFrom) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 animate-in fade-in-0 duration-300">
        <RiGroupLine className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm text-foreground-secondary">
          First cut · <span className="font-medium text-foreground">{artifact.refinedFrom.population}</span> customers
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <RiArrowDownLine className="size-3" /> Refined below
        </span>
      </div>
    );
  }

  // ── Dismissed → banner with undo ──
  if (artifact.status === "dismissed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
        <RiCloseLine className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground-secondary">Segment suggestion dismissed</span>
        <button
          onClick={() => dispatch({ type: "RESTORE_ARTIFACT", id: artifact.id })}
          className="ml-auto text-sm font-medium text-primary hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  const editing = state.editingSegmentId === artifact.id;
  const saved = artifact.status === "saved";

  const seedMetrics = body.metrics?.slice(0, 3) ?? (body.population ? [{ label: "Population", value: body.population }] : []);
  const metrics = computeMetrics(tree, seedMetrics);

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border bg-card shadow-xs transition-colors",
      editing ? "border-brand-300 ring-1 ring-brand-300" : "border-border",
    )}>
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RiGroupLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{artifact.name}</span>
            {saved && (
              <Badge variant="success" size="sm" className="gap-1"><RiCheckLine className="size-3" />Saved</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Segment{body.purpose ? ` · ${body.purpose}` : ""}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => dispatch({ type: "START_EDIT_SEGMENT", id: artifact.id })}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit segment"
          >
            <RiPencilLine className="size-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3 px-3 py-3">
        {metrics.length > 0 && (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
          >
            {metrics.map((m, i) => (
              <div key={i} className="min-w-0">
                <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
                <p className="text-sm font-medium text-foreground-secondary">{m.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">Definition</span>
            <ViewToggle value={defView} onChange={setDefView} />
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <SegmentBuilder tree={tree} setTree={setTree} view={defView} editable={editing} />
          </div>
        </div>
      </div>

      {/* Actions — only while editing or still proposed (saved cards have no footer) */}
      {(editing || !saved) && (
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-3 py-2">
          {editing ? (
            // Right-aligned: Cancel then Save (Save is rightmost), matching the proposed footer.
            <>
              <Button size="xs" variant="ghost" className="w-20" onClick={() => dispatch({ type: "STOP_EDIT_SEGMENT" })}>
                Cancel
              </Button>
              <Button size="xs" className="min-w-20" onClick={() => dispatch({ type: "SAVE_ARTIFACT", id: artifact.id })}>
                {saved ? "Save changes" : "Save segment"}
              </Button>
            </>
          ) : (
            // Right-aligned, fixed-width: Dismiss then Save (Save is rightmost).
            <>
              <div ref={dismissAnchor}>
                <Button size="xs" variant="outline" className="w-20" onClick={() => setShowDismiss(true)}>
                  Dismiss
                </Button>
                {showDismiss && (
                  <DismissPopover
                    anchorRef={dismissAnchor}
                    reason={dismissReason}
                    onReasonChange={setDismissReason}
                    onDismiss={() => { dispatch({ type: "DISMISS_ARTIFACT", id: artifact.id }); setShowDismiss(false); }}
                    onCancel={() => { setShowDismiss(false); setDismissReason(""); }}
                  />
                )}
              </div>
              <Button size="xs" className="w-20" onClick={() => dispatch({ type: "SAVE_ARTIFACT", id: artifact.id })}>
                Save
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
