import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { RiCloseLine, RiDragMove2Line } from "@remixicon/react";

type WidgetKind =
  | "activation-status"
  | "campaign-spend"
  | "integration-health"
  | "segment-opportunities"
  | "actionable-insights"
  | "calendar-reminders"
  | "notes"
  | "benchmark-pulse"
  ;

type NavPage = "chat" | "segments" | "activations" | "dashboards" | "benchmarks" | "scorecard" | "metrics" | "integrations" | "insights";

type ActivationCounts = {
  all: number;
  live: number;
  scheduled: number;
  awaitingApproval: number;
  sent: number;
  completed: number;
  failed: number;
};

type WidgetConfig = {
  kind: WidgetKind;
  title: string;
  description: string;
};

type WidgetInstance = {
  id: string;
  kind: WidgetKind;
};

type Position = { x: number; y: number };

type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const WIDGET_LIBRARY: WidgetConfig[] = [
  {
    kind: "activation-status",
    title: "Activation Status",
    description: "Live status distribution for ongoing and scheduled sends.",
  },
  {
    kind: "campaign-spend",
    title: "Spend per Campaign",
    description: "Campaign spend and activation status in one operational view.",
  },
  {
    kind: "integration-health",
    title: "Integration Health",
    description: "Disconnection and sync issues that need intervention.",
  },
  {
    kind: "segment-opportunities",
    title: "High-Impact Segments",
    description: "Suggested segments with expected uplift and size.",
  },
  {
    kind: "actionable-insights",
    title: "Actionable Insights",
    description: "Prioritized recommendations with immediate next steps.",
  },
  {
    kind: "calendar-reminders",
    title: "Calendar Reminders",
    description: "Upcoming work that needs attention this week.",
  },
  {
    kind: "benchmark-pulse",
    title: "Benchmark Pulse",
    description: "Recent movement against your benchmark groups.",
  },
  {
    kind: "notes",
    title: "Notes",
    description: "Quick capture for ideas, blockers, and follow-ups.",
  },
];

const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: "w-1", kind: "activation-status" },
  { id: "w-2", kind: "campaign-spend" },
  { id: "w-3", kind: "integration-health" },
  { id: "w-4", kind: "segment-opportunities" },
  { id: "w-5", kind: "actionable-insights" },
  { id: "w-6", kind: "calendar-reminders" },
  { id: "w-7", kind: "benchmark-pulse" },
  { id: "w-8", kind: "notes" },
];

const CAMPAIGN_SPEND_ROWS = [
  { id: "cmp-1", campaign: "Winback Lapsed 90d", status: "Live", spend: 18420, budget: 24000, roas: 5.4 },
  { id: "cmp-2", campaign: "VIP Cross-Sell July", status: "Scheduled", spend: 9200, budget: 16000, roas: 4.2 },
  { id: "cmp-3", campaign: "New Buyer Journey", status: "Awaiting approval", spend: 3120, budget: 12000, roas: 0 },
  { id: "cmp-4", campaign: "Dormant Reactivation", status: "Completed", spend: 14950, budget: 15000, roas: 3.8 },
];

const INTEGRATION_HEALTH = [
  { id: "int-1", source: "Meta Ads", status: "Disconnected", impact: "Spend and conversion sync paused", action: "Reconnect" },
  { id: "int-2", source: "Klaviyo", status: "Warning", impact: "Event lag at 47 minutes", action: "Review" },
  { id: "int-3", source: "Shopify", status: "Healthy", impact: "Sync healthy", action: "Open" },
];

const SEGMENT_OPPORTUNITIES = [
  { id: "seg-1", name: "Lapsing VIPs", population: "8,420", uplift: "+12.8%", confidence: 88 },
  { id: "seg-2", name: "High Intent - No Purchase", population: "12,905", uplift: "+9.4%", confidence: 81 },
  { id: "seg-3", name: "Seasonal Repeat Buyers", population: "5,180", uplift: "+7.1%", confidence: 76 },
];

const ACTIONABLE_INSIGHTS = [
  { id: "ins-1", title: "Recover at-risk revenue", detail: "Dormant cohort conversion dropped 3.2 points this week.", action: "Launch reactivation sequence", priority: "High" },
  { id: "ins-2", title: "Shift budget to top ROAS channel", detail: "Meta retargeting outperformed email by 1.7x in last 7 days.", action: "Rebalance campaign budget", priority: "Medium" },
  { id: "ins-3", title: "Tighten suppression criteria", detail: "Complaint risk increased in low-engagement audience slice.", action: "Apply stricter exclusion rules", priority: "High" },
];

const BENCHMARK_TREND = [62, 65, 64, 68, 70, 72, 74];

const CALENDAR_REMINDERS = [
  { id: "cal-1", day: "Mon", time: "10:00", task: "Review disconnected integrations", owner: "Ops" },
  { id: "cal-2", day: "Tue", time: "13:30", task: "Approve VIP cross-sell activation", owner: "Growth" },
  { id: "cal-3", day: "Thu", time: "09:00", task: "RFM weekly benchmark readout", owner: "Analytics" },
  { id: "cal-4", day: "Fri", time: "16:00", task: "Campaign budget rebalance", owner: "Performance" },
];

const DEFAULT_NOTES = [
  "Reconnect Meta Ads before Tuesday send window.",
  "Prioritize Lapsing VIP segment for next creative test.",
  "Validate complaint suppression threshold this week.",
];

function findConfig(kind: WidgetKind): WidgetConfig {
  return WIDGET_LIBRARY.find((item) => item.kind === kind) ?? WIDGET_LIBRARY[0];
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function getDefaultCardSize(kind: WidgetKind): { width: number; height: number } {
  if (kind === "campaign-spend") return { width: 560, height: 360 };
  if (kind === "actionable-insights") return { width: 560, height: 340 };
  if (kind === "notes") return { width: 560, height: 360 };
  return { width: 360, height: 260 };
}

function createInitialPositions(widgets: WidgetInstance[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  const canvasWidth = 1200;
  const gap = 24;
  const start = 24;
  let x = start;
  let y = start;
  let rowHeight = 0;

  for (const widget of widgets) {
    const size = getDefaultCardSize(widget.kind);
    if (x + size.width + gap > canvasWidth) {
      x = start;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    positions[widget.id] = { x, y };
    x += size.width + gap;
    rowHeight = Math.max(rowHeight, size.height);
  }

  return positions;
}

export function CanvasPage({
  userName,
  activationCounts,
  segmentCount,
  dashboardCount,
  metricCount,
  trackerCount,
  onNavigate,
  onStartSegment,
  onStartActivation,
  onOpenChat,
}: {
  userName: string;
  activationCounts: ActivationCounts;
  segmentCount: number;
  dashboardCount: number;
  metricCount: number;
  trackerCount: number;
  onNavigate: (page: NavPage) => void;
  onStartSegment: () => void;
  onStartActivation: () => void;
  onOpenChat: () => void;
}) {
  const MIN_CARD_WIDTH = 280;
  const MIN_CARD_HEIGHT = 180;
  const CANVAS_PADDING = 16;
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_WIDGETS);
  const [nextWidget, setNextWidget] = useState<WidgetKind>("calendar-reminders");
  const [isRearrangingLayout, setIsRearrangingLayout] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [isResizingCard, setIsResizingCard] = useState(false);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, { width: number; height: number }>>(() => {
    const initial: Record<string, { width: number; height: number }> = {};
    for (const widget of DEFAULT_WIDGETS) {
      initial[widget.id] = getDefaultCardSize(widget.kind);
    }
    return initial;
  });
  const [widgetPositions, setWidgetPositions] = useState<Record<string, Position>>(() => {
    return createInitialPositions(DEFAULT_WIDGETS);
  });
  const [pendingRemoveWidgetId, setPendingRemoveWidgetId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>(DEFAULT_NOTES);
  const [draftNote, setDraftNote] = useState("");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activationCompletionRate = useMemo(() => {
    if (activationCounts.all === 0) return 0;
    return Math.round((activationCounts.completed / activationCounts.all) * 100);
  }, [activationCounts]);

  const totalExperienceElements =
    segmentCount + dashboardCount + metricCount + trackerCount + activationCounts.all;

  const totalSpend = useMemo(() => CAMPAIGN_SPEND_ROWS.reduce((sum, row) => sum + row.spend, 0), []);

  const canvasHeight = useMemo(() => {
    const bottomEdge = widgets.reduce((maxBottom, widget) => {
      const pos = widgetPositions[widget.id] ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
      const size = getCardDimensions(widget.id, widget.kind);
      return Math.max(maxBottom, pos.y + size.height);
    }, 0);
    return Math.max(920, bottomEdge + CANVAS_PADDING);
  }, [widgets, widgetPositions, widgetSizes]);

  function getCardDimensions(widgetId: string, kind: WidgetKind) {
    const measuredHeight = cardRefs.current[widgetId]?.offsetHeight;
    const defaults = getDefaultCardSize(kind);
    const size = widgetSizes[widgetId] ?? defaults;
    return {
      width: size.width,
      height: Math.max(size.height, measuredHeight ?? size.height),
    };
  }

  const findOpenPosition = (width: number, height: number): Position => {
    const canvasWidth = canvasRef.current?.clientWidth ?? 1200;
    const maxX = Math.max(CANVAS_PADDING, canvasWidth - width - CANVAS_PADDING);
    const step = 24;
    const y = CANVAS_PADDING + Math.max(0, widgets.length - 1) * step;
    return { x: CANVAS_PADDING + ((widgets.length * step) % Math.max(step, maxX - CANVAS_PADDING + step)), y };
  };

  const addWidget = () => {
    const id = `w-${Date.now()}`;
    const size = getDefaultCardSize(nextWidget);
    const position = findOpenPosition(size.width, size.height);
    setWidgetSizes((prev) => ({ ...prev, [id]: size }));
    setWidgetPositions((prev) => ({ ...prev, [id]: position }));
    setWidgets((prev) => [...prev, { id, kind: nextWidget }]);
  };

  const addNote = () => {
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    setNotes((prev) => [trimmed, ...prev].slice(0, 8));
    setDraftNote("");
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((item) => item.id !== id));
    setWidgetSizes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setWidgetPositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete cardRefs.current[id];
  };

  const startMove = (
    event: React.MouseEvent<HTMLElement>,
    widgetId: string,
    kind: WidgetKind,
    options?: { force?: boolean },
  ) => {
    if (!isRearrangingLayout || isResizingCard) return;
    if (event.button !== 0) return;
    if (!options?.force) {
      const target = event.target as HTMLElement;
      if (target.closest("button,textarea,input,select,a")) return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPos = widgetPositions[widgetId] ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
    const size = getCardDimensions(widgetId, kind);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setDraggingWidgetId(widgetId);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const maxX = Math.max(CANVAS_PADDING, canvasRect.width - size.width - CANVAS_PADDING);
      const nextX = Math.min(maxX, Math.max(CANVAS_PADDING, Math.round(startPos.x + deltaX)));
      const nextY = Math.max(CANVAS_PADDING, Math.round(startPos.y + deltaY));
      setWidgetPositions((prev) => ({ ...prev, [widgetId]: { x: nextX, y: nextY } }));
    };

    const onMouseUp = () => {
      setDraggingWidgetId(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const startResize = (
    event: React.MouseEvent<HTMLButtonElement>,
    widgetId: string,
    direction: ResizeDirection,
  ) => {
    if (!isRearrangingLayout) return;
    event.preventDefault();
    event.stopPropagation();

    const cardElement = event.currentTarget.closest("article") as HTMLElement | null;
    if (!cardElement) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget) return;
    const startSize = getCardDimensions(widgetId, widget.kind);
    const startWidth = startSize.width;
    const startHeight = startSize.height;
    const startPos = widgetPositions[widgetId] ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setIsResizingCard(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const includesLeft = direction.includes("left");
      const includesRight = direction.includes("right") || direction === "right";
      const includesTop = direction.includes("top");
      const includesBottom = direction.includes("bottom") || direction === "bottom";

      let nextWidth = startWidth;
      let nextHeight = startHeight;
      let nextX = startPos.x;
      let nextY = startPos.y;

      if (includesLeft) {
        nextWidth = startWidth - deltaX;
        nextX = startPos.x + deltaX;
      }
      if (includesRight) nextWidth = startWidth + deltaX;
      if (includesTop) {
        nextHeight = startHeight - deltaY;
        nextY = startPos.y + deltaY;
      }
      if (includesBottom) nextHeight = startHeight + deltaY;

      if (includesLeft && nextWidth < MIN_CARD_WIDTH) {
        nextX -= MIN_CARD_WIDTH - nextWidth;
      }
      if (includesTop && nextHeight < MIN_CARD_HEIGHT) {
        nextY -= MIN_CARD_HEIGHT - nextHeight;
      }

      nextWidth = Math.max(MIN_CARD_WIDTH, Math.round(nextWidth));
      nextHeight = Math.max(MIN_CARD_HEIGHT, Math.round(nextHeight));

      const maxX = Math.max(CANVAS_PADDING, canvasRect.width - nextWidth - CANVAS_PADDING);
      nextX = Math.min(maxX, Math.max(CANVAS_PADDING, Math.round(nextX)));
      nextY = Math.max(CANVAS_PADDING, Math.round(nextY));

      setWidgetPositions((prev) => ({
        ...prev,
        [widgetId]: { x: nextX, y: nextY },
      }));

      setWidgetSizes((prev) => ({
        ...prev,
        [widgetId]: { width: nextWidth, height: nextHeight },
      }));
    };

    const onMouseUp = () => {
      setIsResizingCard(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Home</p>
              <h1 className="text-2xl font-semibold text-foreground">Canvas</h1>
              <p className="text-sm text-foreground-secondary">
                Welcome back, {userName}. Configure this page with the elements you want to see first.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsRearrangingLayout((prev) => !prev);
                  setDraggingWidgetId(null);
                }}
              >
                {isRearrangingLayout ? "Done Rearranging" : "Rearrange Layout"}
              </Button>
              <Button size="sm" onClick={onOpenChat}>Open Chat</Button>
            </div>
          </div>

          {isRearrangingLayout && (
            <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Drag cards anywhere on the canvas. Cards cannot overlap. Resize handles still work while rearranging.</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Add element</p>
            <select
              value={nextWidget}
              onChange={(event) => setNextWidget(event.target.value as WidgetKind)}
              className="h-9 min-w-52 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
            >
              {WIDGET_LIBRARY.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.title}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={addWidget}>Add to Canvas</Button>
          </div>
        </div>

        {widgets.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">No elements on your Canvas yet</p>
            <p className="mt-1 text-xs text-foreground-secondary">
              Add trackers, metrics, activation status, and dashboard widgets to shape your home view.
            </p>
          </div>
        ) : (
          <div
            ref={canvasRef}
            className="relative overflow-hidden rounded-xl border border-border bg-background"
            style={{ minHeight: `${canvasHeight}px` }}
          >
            {widgets.map((widget) => {
              const config = findConfig(widget.kind);
              const isDragging = draggingWidgetId === widget.id;
              const currentSize = widgetSizes[widget.id];
              const position = widgetPositions[widget.id] ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
              const defaultSize = getDefaultCardSize(widget.kind);
              return (
                <article
                  key={widget.id}
                  ref={(element) => {
                    cardRefs.current[widget.id] = element;
                  }}
                  onMouseDown={(event) => startMove(event, widget.id, widget.kind)}
                  className={`absolute rounded-xl border border-border bg-card p-4 shadow-sm transition ${
                    isDragging ? "z-30 cursor-grabbing opacity-75" : isRearrangingLayout ? "z-10 cursor-grab" : "z-0 opacity-100"
                  }`}
                  style={
                    {
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: `${currentSize?.width ?? defaultSize.width}px`,
                      minHeight: `${currentSize?.height ?? defaultSize.height}px`,
                    }
                  }
                >
                  <button
                    type="button"
                    aria-label={`Remove ${config.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingRemoveWidgetId(widget.id);
                    }}
                    className="absolute right-2 top-2 z-20 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    data-no-drag="true"
                  >
                    <RiCloseLine className="size-4" />
                  </button>

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{config.title}</h2>
                      <p className="mt-0.5 text-xs text-foreground-secondary">{config.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isRearrangingLayout && (
                        <button
                          type="button"
                          aria-label={`Drag ${config.title}`}
                          onMouseDown={(event) => startMove(event, widget.id, widget.kind, { force: true })}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                          data-no-drag="true"
                        >
                          <RiDragMove2Line className="size-3.5" />
                          Drag
                        </button>
                      )}
                    </div>
                  </div>

                  {widget.kind === "activation-status" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label="Live" value={activationCounts.live} />
                        <StatusPill label="Scheduled" value={activationCounts.scheduled} />
                        <StatusPill label="Awaiting" value={activationCounts.awaitingApproval} />
                        <StatusPill label="Sent" value={activationCounts.sent} />
                        <StatusPill label="Completed" value={activationCounts.completed} />
                      </div>
                      <p className="text-xs text-foreground-secondary">
                        Completion rate: <span className="font-semibold text-foreground">{activationCompletionRate}%</span>
                      </p>
                      <Button size="sm" variant="outline" onClick={() => onNavigate("activations")}>Open Activations</Button>
                    </div>
                  )}

                  {widget.kind === "campaign-spend" && (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <p className="text-xs text-muted-foreground">Total spend this cycle</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">${formatCount(totalSpend)}</p>
                      </div>
                      {CAMPAIGN_SPEND_ROWS.map((row) => (
                        <CampaignSpendRow key={row.id} row={row} />
                      ))}
                      <div className="pt-1">
                        <Button size="sm" variant="outline" onClick={() => onNavigate("activations")}>Open Activation Spend</Button>
                      </div>
                    </div>
                  )}

                  {widget.kind === "integration-health" && (
                    <div className="space-y-2">
                      {INTEGRATION_HEALTH.map((item) => (
                        <IntegrationRow key={item.id} item={item} onNavigate={onNavigate} />
                      ))}
                    </div>
                  )}

                  {widget.kind === "segment-opportunities" && (
                    <div className="space-y-2">
                      {SEGMENT_OPPORTUNITIES.map((item) => (
                        <SegmentOpportunityRow key={item.id} item={item} />
                      ))}
                      <div className="pt-1">
                        <Button size="sm" variant="outline" onClick={() => onNavigate("segments")}>Open Segments</Button>
                      </div>
                    </div>
                  )}

                  {widget.kind === "actionable-insights" && (
                    <div className="space-y-2">
                      {ACTIONABLE_INSIGHTS.map((item) => (
                        <InsightActionRow key={item.id} item={item} onNavigate={onNavigate} />
                      ))}
                    </div>
                  )}

                  {widget.kind === "calendar-reminders" && (
                    <div className="space-y-2">
                      {CALENDAR_REMINDERS.map((item) => (
                        <CalendarReminderRow key={item.id} item={item} />
                      ))}
                      <div className="pt-1">
                        <Button size="sm" variant="outline" onClick={() => onNavigate("activations")}>Open Activation Calendar</Button>
                      </div>
                    </div>
                  )}

                  {widget.kind === "benchmark-pulse" && (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border bg-background p-2">
                        <TrendChart
                          points={BENCHMARK_TREND}
                          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                          title="7-day benchmark trend"
                        />
                      </div>
                      <PulseRow label="Repeat rate" value="+2.4%" tone="positive" />
                      <PulseRow label="AOV" value="-0.8%" tone="neutral" />
                      <PulseRow label="Winback conversion" value="+3.1%" tone="positive" />
                      <div className="pt-1">
                        <Button size="sm" variant="outline" onClick={() => onNavigate("benchmarks")}>Open Benchmarks</Button>
                      </div>
                    </div>
                  )}

                  {widget.kind === "notes" && (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border bg-background p-2">
                        <textarea
                          value={draftNote}
                          onChange={(event) => setDraftNote(event.target.value)}
                          placeholder="Add a note for your team..."
                          className="min-h-20 w-full resize-y bg-transparent text-sm text-foreground outline-none"
                        />
                        <div className="mt-2 flex justify-end">
                          <Button size="xs" onClick={addNote}>Save Note</Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {notes.map((note, noteIndex) => (
                          <div key={`${note}-${noteIndex}`} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground-secondary">
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRearrangingLayout && (
                    <>
                      <button
                        type="button"
                        aria-label="Resize top"
                        onMouseDown={(event) => startResize(event, widget.id, "top")}
                        className="absolute left-6 right-6 top-0 h-1 cursor-ns-resize rounded"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize right"
                        onMouseDown={(event) => startResize(event, widget.id, "right")}
                        className="absolute bottom-6 right-0 top-6 w-1 cursor-ew-resize rounded"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize bottom"
                        onMouseDown={(event) => startResize(event, widget.id, "bottom")}
                        className="absolute bottom-0 left-6 right-6 h-1 cursor-ns-resize rounded"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize left"
                        onMouseDown={(event) => startResize(event, widget.id, "left")}
                        className="absolute bottom-6 left-0 top-6 w-1 cursor-ew-resize rounded"
                        data-no-drag="true"
                      />

                      <button
                        type="button"
                        aria-label="Resize top left"
                        onMouseDown={(event) => startResize(event, widget.id, "top-left")}
                        className="absolute left-0 top-0 h-3 w-3 cursor-nwse-resize rounded border border-border bg-background"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize top right"
                        onMouseDown={(event) => startResize(event, widget.id, "top-right")}
                        className="absolute right-0 top-0 h-3 w-3 cursor-nesw-resize rounded border border-border bg-background"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize bottom left"
                        onMouseDown={(event) => startResize(event, widget.id, "bottom-left")}
                        className="absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize rounded border border-border bg-background"
                        data-no-drag="true"
                      />
                      <button
                        type="button"
                        aria-label="Resize bottom right"
                        onMouseDown={(event) => startResize(event, widget.id, "bottom-right")}
                        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize rounded border border-border bg-background"
                        data-no-drag="true"
                      />
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={pendingRemoveWidgetId !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRemoveWidgetId(null);
          }}
          title="Remove card from Canvas?"
          description="This removes the card from your current Canvas layout. You can add it back anytime from Add element."
          confirmLabel="Remove card"
          cancelLabel="Keep card"
          variant="default"
          onConfirm={() => {
            if (pendingRemoveWidgetId) removeWidget(pendingRemoveWidgetId);
            setPendingRemoveWidgetId(null);
          }}
        />

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Experience inventory: <span className="font-semibold text-foreground">{formatCount(totalExperienceElements)}</span> total elements available across segments, activations, dashboards, metrics, and trackers.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="secondary" size="sm" className="gap-1">
      <span>{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </Badge>
  );
}

function CalendarReminderRow({ item }: {
  item: { day: string; time: string; task: string; owner: string };
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{item.task}</p>
          <p className="mt-0.5 text-xs text-foreground-secondary">{item.day} {item.time} · {item.owner}</p>
        </div>
        <Badge variant="secondary">Reminder</Badge>
      </div>
    </div>
  );
}

function PulseRow({ label, value, tone }: { label: string; value: string; tone: "positive" | "neutral" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-sm text-foreground">{label}</p>
      <span className={`text-sm font-semibold ${tone === "positive" ? "text-primary" : "text-foreground-secondary"}`}>
        {value}
      </span>
    </div>
  );
}

function CampaignSpendRow({ row }: {
  row: { campaign: string; status: string; spend: number; budget: number; roas: number };
}) {
  const spendPct = Math.min(100, Math.round((row.spend / row.budget) * 100));
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{row.campaign}</p>
        <Badge variant={row.status === "Live" ? "success" : row.status === "Awaiting approval" ? "warning" : "secondary"}>{row.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-foreground-secondary">
        Spend ${formatCount(row.spend)} / ${formatCount(row.budget)} · ROAS {row.roas === 0 ? "Pending" : row.roas.toFixed(1)}x
      </p>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${spendPct}%` }} />
      </div>
    </div>
  );
}

function IntegrationRow({ item, onNavigate }: {
  item: { source: string; status: string; impact: string; action: string };
  onNavigate: (page: NavPage) => void;
}) {
  const variant = item.status === "Disconnected" ? "danger" : item.status === "Warning" ? "warning" : "success";
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{item.source}</p>
        <Badge variant={variant}>{item.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-foreground-secondary">{item.impact}</p>
      <div className="mt-2">
        <Button size="xs" variant="outline" onClick={() => onNavigate("integrations")}>{item.action}</Button>
      </div>
    </div>
  );
}

function SegmentOpportunityRow({ item }: {
  item: { name: string; population: string; uplift: string; confidence: number };
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <span className="text-sm font-semibold text-primary">{item.uplift}</span>
      </div>
      <p className="mt-1 text-xs text-foreground-secondary">Population {item.population}</p>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.confidence}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Confidence {item.confidence}%</p>
    </div>
  );
}

function InsightActionRow({ item, onNavigate }: {
  item: { title: string; detail: string; action: string; priority: string };
  onNavigate: (page: NavPage) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <Badge variant={item.priority === "High" ? "danger" : "warning"}>{item.priority}</Badge>
      </div>
      <p className="mt-1 text-xs text-foreground-secondary">{item.detail}</p>
      <div className="mt-2">
        <Button size="xs" onClick={() => onNavigate("insights")}>{item.action}</Button>
      </div>
    </div>
  );
}

function TrendChart({
  points,
  labels,
  title,
}: {
  points: number[];
  labels: string[];
  title: string;
}) {
  const width = 520;
  const height = 140;
  const padX = 16;
  const padY = 12;

  if (points.length === 0) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((value, idx) => {
    const x = padX + idx * stepX;
    const y = height - padY - ((value - min) / range) * (height - padY * 2);
    return { x, y, value };
  });

  const path = coords.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label={title}>
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="stroke-border" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((pt, idx) => (
          <g key={`${pt.x}-${pt.y}`}>
            <circle cx={pt.x} cy={pt.y} r={3.5} className="fill-primary" />
            {labels[idx] && (
              <text x={pt.x} y={height - 2} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {labels[idx]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
