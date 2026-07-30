import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";
import { DefinitionCard } from "@/components/definitions/DefinitionCard";
import { type DefRef } from "@/data/def-registry";
import {
  RiStackLine,
  RiPushpinLine,
  RiArrowDownSLine,
  RiGroupLine,
  RiBroadcastLine,
  RiLightbulbLine,
  RiRouteLine,
  RiBarChartLine,
  RiDashboardLine,
  RiListOrdered2,
  RiCloseLine,
  RiFileCopyLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { Artifact, ArtifactType } from "./types";
import { useSession } from "./store";

const ARTIFACT_ICON: Record<ArtifactType | string, RemixiconComponentType> = {
  segment: RiGroupLine,
  activation: RiBroadcastLine,
  insight: RiLightbulbLine,
  workflow: RiRouteLine,
  scorecard: RiBarChartLine,
  dashboard: RiDashboardLine,
  recommendation: RiListOrdered2,
};

function findTextPoint(root: Element, targetOffset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let traversed = 0;
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const len = textNode.data.length;
    if (targetOffset <= traversed + len) {
      return {
        node: textNode,
        offset: Math.max(0, Math.min(targetOffset - traversed, len)),
      };
    }
    traversed += len;
    current = walker.nextNode();
  }

  return null;
}

function scrollToSentenceStart(messageEl: Element, sentenceStartOffset?: number) {
  if (typeof sentenceStartOffset !== "number") {
    messageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const point = findTextPoint(messageEl, sentenceStartOffset);
  if (!point) {
    messageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const markerRange = document.createRange();
  markerRange.setStart(point.node, point.offset);
  markerRange.collapse(true);

  const marker = document.createElement("span");
  marker.setAttribute("aria-hidden", "true");
  marker.className = "pointer-events-none";
  marker.style.display = "inline-block";
  marker.style.width = "1px";
  marker.style.height = "1em";

  markerRange.insertNode(marker);
  marker.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  requestAnimationFrame(() => marker.remove());
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface ContextPanelProps {
  open: boolean;
}

export function ContextPanel({ open }: ContextPanelProps) {
  const { state, dispatch } = useSession();
  const conversationScopedPins = state.activeConversationId ? state.pins : [];

  const focusArtifactInChat = useCallback((artifactId: string) => {
    const matchingConversationId = Object.entries(state.conversationSnapshots)
      .find(([, snapshot]) => snapshot.artifacts.has(artifactId))?.[0];

    if (matchingConversationId) {
      dispatch({ type: "SELECT_CONVERSATION", id: matchingConversationId, autoStart: false });
    }

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("prototype-master:focus-artifact", {
        detail: { artifactId },
      }));

      const artifact = state.artifacts.get(artifactId);
      if (artifact?.type === "segment") {
        dispatch({ type: "OPEN_SEGMENT", id: artifactId });
      }
    }, matchingConversationId ? 90 : 0);
  }, [dispatch, state.artifacts, state.conversationSnapshots]);

  const savedArtifacts = useMemo(
    () => Array.from(state.artifacts.values()).filter((a) => a.status === "saved"),
    [state.artifacts],
  );
  const savedInsights = useMemo(
    () => savedArtifacts.filter((artifact) => artifact.type === "insight" && artifact.body?.kind === "insight"),
    [savedArtifacts],
  );
  const savedNonInsightArtifacts = useMemo(
    () => savedArtifacts.filter((artifact) => !(artifact.type === "insight" && artifact.body?.kind === "insight")),
    [savedArtifacts],
  );

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 bg-background transition-[width,opacity,padding] duration-200",
        open
          ? "w-[280px] p-2 opacity-100 overflow-visible"
          : "w-0 opacity-0 p-0 overflow-hidden"
      )}
    >
      {/* Card 1: Artifacts */}
      <ContextCard
        icon={RiStackLine}
        title="Artifacts"
        tooltip="Things Lexi created or you approved during this session"
        empty={savedNonInsightArtifacts.length === 0}
      >
        <div className="flex flex-col gap-0.5">
          {savedNonInsightArtifacts.length > 0 ? (
            savedNonInsightArtifacts.map((a) => {
              const Icon = ARTIFACT_ICON[a.type] ?? RiStackLine;
              const isEditing = state.editingSegmentId === a.id;
              return (
                <HoverItem key={a.id} def={a.def} artifact={a}>
                  <button
                    onClick={() => {
                      dispatch({ type: "CLOSE_SOURCES" });
                      dispatch({ type: "CLOSE_SEGMENT" });

                      if (a.type === "segment") {
                        focusArtifactInChat(a.id);
                        return;
                      }

                      if (a.type === "activation" && a.body?.kind === "activation") {
                        if (a.body.conversationId) {
                          dispatch({ type: "SELECT_CONVERSATION", id: a.body.conversationId, autoStart: false });
                        }

                        if (a.body.sourceMessageId) {
                          window.setTimeout(() => {
                            window.dispatchEvent(new CustomEvent("prototype-master:jump-to-message", {
                              detail: { messageId: a.body.sourceMessageId },
                            }));
                          }, 60);
                          return;
                        }
                      }

                      focusArtifactInChat(a.id);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors w-full",
                      isEditing
                        ? "bg-brand-100 ring-1 ring-brand-300"
                        : "hover:bg-accent",
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="size-3 text-primary" />
                    </span>
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {a.name}
                    </span>
                    {isEditing && (
                      <span className="shrink-0 text-[10px] font-medium text-primary">Editing</span>
                    )}
                  </button>
                </HoverItem>
              );
            })
          ) : (
            <EmptyState
              icon={RiStackLine}
              title="No artifacts yet"
              hint="Segments and insights you save from Lexi's replies collect here."
            />
          )}
        </div>
      </ContextCard>

      {/* Card 2: Insights */}
      <ContextCard
        icon={RiLightbulbLine}
        title="Insights"
        tooltip="Insights captured from Lexi's responses"
        empty={savedInsights.length === 0}
      >
        <div className="flex flex-col gap-0.5">
          {savedInsights.length > 0 ? (
            savedInsights.map((insight) => (
              <HoverItem key={insight.id} artifact={insight}>
                <button
                  onClick={() => focusArtifactInChat(insight.id)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <RiLightbulbLine className="size-3 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{insight.name}</span>
                    {insight.body?.kind === "insight" ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-foreground-secondary">{insight.body.finding}</span>
                    ) : null}
                  </span>
                </button>
              </HoverItem>
            ))
          ) : (
            <EmptyState
              icon={RiLightbulbLine}
              title="No insights yet"
              hint="Capture insights from highlighted chat text and they will appear here."
            />
          )}
        </div>
      </ContextCard>

      {/* Card 3: Pinned */}
      <ContextCard
        icon={RiPushpinLine}
        title="Pinned"
        tooltip="Fragments you highlighted from Lexi's responses"
        empty={conversationScopedPins.length === 0}
      >
        <div className="flex flex-col gap-1.5">
          {conversationScopedPins.length > 0 ? (
            conversationScopedPins.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const el = document.querySelector(`[data-message-id="${p.sourceMessageId}"]`);
                  if (!el) return;
                  scrollToSentenceStart(el, p.sentenceStartOffset);
                }}
                className="group relative rounded-lg bg-muted px-2.5 py-2 text-left text-sm text-foreground-secondary leading-relaxed transition-colors hover:bg-accent"
              >
                <span className="line-clamp-3">{p.text}</span>
                <span className="absolute right-1.5 top-1.5 hidden items-center gap-0.5 group-hover:flex">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.text); }}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                  >
                    <RiFileCopyLine className="size-3" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: "REMOVE_PIN", id: p.id }); }}
                    className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                  >
                    <RiCloseLine className="size-3" />
                  </span>
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              icon={RiPushpinLine}
              title="Nothing pinned yet"
              hint="Highlight text in Lexi's messages to pin useful fragments here."
            />
          )}
        </div>
      </ContextCard>
    </div>
  );
}

// ─── Shared empty state ─────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: RemixiconComponentType;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-medium text-foreground-secondary">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Hover card wrapper ─────────────────────────────────────────────────────
function formatSavedAt(savedAt?: string): string {
  if (!savedAt) return "Saved recently";
  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) return "Saved recently";
  return `Saved ${parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function InsightHoverCard({ artifact }: { artifact: Artifact }) {
  if (artifact.type !== "insight" || artifact.body?.kind !== "insight") return null;
  return (
    <div className="w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="mb-1 flex items-center gap-1.5">
        <RiLightbulbLine className="size-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Insight</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{artifact.name}</p>
      <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-foreground-secondary">{artifact.body.finding}</p>
      <p className="mt-2 text-xs text-muted-foreground">{formatSavedAt(artifact.savedAt)}</p>
    </div>
  );
}

function HoverItem({ def, artifact, children }: { def?: DefRef; artifact?: Artifact; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left - 8 });
    }
    setOpen(true);
  }, []);
  const hide = useCallback(() => { timer.current = setTimeout(() => setOpen(false), 120); }, []);

  const canHoverInsight = artifact?.type === "insight" && artifact.body?.kind === "insight";
  if (!def && !canHoverInsight) return <>{children}</>;

  return (
    <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && createPortal(
        <div
          className="fixed z-[9999] -translate-x-full"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {def ? <DefinitionCard def={def} /> : (artifact ? <InsightHoverCard artifact={artifact} /> : null)}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

export function ContextCard({
  icon: Icon,
  title,
  tooltip,
  empty,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tooltip: string;
  /** Empty cards collapse to just the header; they auto-expand when content is added. */
  empty: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!empty);
  // Auto-expand when content arrives; auto-collapse when it's cleared. Manual
  // chevron toggles persist until the empty state changes again.
  const prevEmpty = useRef(empty);
  useEffect(() => {
    if (prevEmpty.current !== empty) {
      setOpen(!empty);
      prevEmpty.current = empty;
    }
  }, [empty]);

  return (
    <div className={cn("flex shrink-0 flex-col rounded-xl border border-border bg-card", open && "max-h-[40%]")}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex h-9 shrink-0 cursor-pointer select-none items-center gap-2 px-3"
        title={open ? "Collapse" : "Expand"}
      >
        <Icon className="size-3.5 text-muted-foreground shrink-0" />
        {/* Tooltip hitbox is the title text only, not the full-width header */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-0 max-w-full cursor-help truncate text-sm font-medium text-foreground">
              {title}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{tooltip}</TooltipContent>
        </Tooltip>
        {/* Spacer pushes the chevron to the right; clicking it still toggles via the header */}
        <span className="flex-1" />
        <RiArrowDownSLine className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </div>
      {open && <div className="overflow-y-auto border-t border-border p-2">{children}</div>}
    </div>
  );
}
