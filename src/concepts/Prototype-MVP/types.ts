import type { DefRef } from "@/data/def-registry";
import type { Usage } from "../lexi-shared-brain/data";
import type { SessionAction } from "./store";

// ─── Artifact types ─────────────────────────────────────────────────────────

export type ArtifactType =
  | "segment"
  | "activation"
  | "insight"
  | "recommendation"
  | "workflow"
  | "scorecard"
  | "dashboard";

export type ArtifactStatus = "proposed" | "saved" | "dismissed";

export type PlanStatus = "draft" | "confirmed";

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  status: ArtifactStatus;
  /** ISO timestamp when the artifact was saved/captured. */
  savedAt?: string;
  planStatus?: PlanStatus;
  body?: ArtifactBody;
  def?: DefRef;
  usedBy?: Usage[];
  /** Set when the segment has been refined in place; snapshots the first-cut numbers. */
  refinedFrom?: { population: string };
}

export interface RecommendationStep {
  id: string;
  week: number;
  label: string;
  segment: string;
  channel: string;
  offer: string;
  projectedRevenue?: string;
  approvalGate: boolean;
  conditional?: string;
}

/** A headline metric shown on the segment card (e.g. Population, Median LTV). */
export interface SegmentMetric {
  label: string;
  value: string;
  hint?: string;
}

/** One bar in a scorecard comparison chart (e.g. "Campaign" vs "Baseline"). */
export interface ScorecardBar {
  label: string;
  value: number;
}

/** A single scorecard line. May be a headline stat, a comparison chart, or both. */
export interface ScorecardMetric {
  label: string;
  /** Big display value, e.g. "$214K", "18%". */
  value?: string;
  hint?: string;
  /** Surface this metric as a large number in the summary row. */
  headline?: boolean;
  /** Comparison bars rendered as a mini chart (current vs baseline, cohort vs cohort…). */
  chart?: { unit?: "%" | "$" | "$K" | "x" | "count"; bars: ScorecardBar[] };
}

export type ArtifactBody =
  | {
      kind: "segment";
      criteria: string[];
      population?: string;
      purpose?: string;
      metrics?: SegmentMetric[];
      recommendations?: string[];
    }
  | { kind: "activation"; segmentId: string; segmentName: string; sourceMessageId: string; conversationId?: string }
  | { kind: "insight"; finding: string; implication: string }
  | { kind: "recommendation"; steps: RecommendationStep[]; scorecard: { label: string; target: string }[]; inputs: string[] }
  | { kind: "workflow"; description: string }
  | { kind: "scorecard"; summary?: string; metrics: ScorecardMetric[] }
  | { kind: "dashboard"; description: string };

// ─── Message content blocks ─────────────────────────────────────────────────

/** A single editable assumption inside a ReasoningBlock. */
export interface ReasoningAssumption {
  id: string;
  /** Short label for what this assumption is about, e.g. "Success metric". */
  label: string;
  /** The editable value — what Lexi is currently assuming. */
  value: string;
}

// ─── Inline chart spec (rendered inside a Lexi response) ─────────────────────

export type ChartUnit = "%" | "$" | "$K" | "x" | "count";

/** A bar (grouped) or line chart. `series` names the legend; each data point's
 *  `values` align positionally to `series`. */
export interface ChartSpec {
  kind: "bar" | "line";
  title?: string;
  unit?: ChartUnit;
  series: string[];
  data: { label: string; values: number[] }[];
  caption?: string;
}

export interface FlowFieldRow {
  id: string;
  label: string;
  selected: string;
  coverage: number;
  candidates: string[];
  primary: boolean;
  canPrimary: boolean;
  removable: boolean;
  note?: string;
}

export interface FlowFieldMapping {
  rows: FlowFieldRow[];
  searchRowId?: string;
  searchQuery?: string;
}

export type FlowAction = "one-off" | "update-definition" | "add-definition";
export type FlowStep =
  | "resolve"
  | "playbookPrompt"
  | "destination"
  | "fieldMapping"
  | "schedule"
  | "confirmation"
  | "segmentOffer";

export interface FlowSchedule {
  mode: "one-off" | "recurring";
  sendNow: boolean;
  sendLaterDate: string;
  sendLaterTime: string;
  recurringStartDate: string;
  recurringTime: string;
  recurringEndType: "none" | "onDate";
  recurringEndDate: string;
  listAction?: "append" | "maintain" | "update";
}

export interface SegmentResolveFields {
  lastPurchaseOperator: "between" | "greater than" | "less than" | "is";
  lastPurchaseValueA: number;
  lastPurchaseValueB: number;
  marketingConsent: "Opted In" | "Opted Out";
  minOrders: number;
  ordersMonths: number;
  notPurchasedDays: number;
}

export type FlowBlock = {
  type: "flow";
  flowId: string;
  blockId?: string;
  step: FlowStep;
  windowDays: number;
  confirmed?: boolean;
  confirmedText?: string;
  selectedAction?: FlowAction;
  pendingName?: string;
  savedName?: string;
  segmentId?: string;
  fieldMapping?: FlowFieldMapping;
  schedule?: FlowSchedule;
  segmentCreated?: boolean;
  destination?: "Klaviyo" | "Meta" | "Braze";
  subscriptionStatus?: "Subscribed" | "Unsubscribed";
  correctionOpen?: boolean;
  correctionText?: string;
  correctionMessage?: string;
  dismissedResolveFields?: string[];
  segmentResolve?: SegmentResolveFields;
  /** UI state for adding extra natural-language filters inline */
  addingMore?: boolean;
  addingMoreText?: string;
  /** per-field numeric windows (e.g. order date last N days) keyed by field row id
   *  Value may be a single number or a range {min,max} when the user supplied one.
   */
  extraWindows?: Record<string, number | { min: number; max: number }>;
};

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "actions"; actions: { id: string; label: string }[]; disabledActionIds?: string[] }
  | {
      type: "activationBuild";
      segmentId: string;
      segmentName: string;
      population: string;
      rules: string[];
      activationName: string;
      activationDescription: string;
    }
  | {
      type: "activationEdit";
      activationId: string;
    }
  | {
      type: "activationSummary";
      activationId: string;
    }
  | {
      type: "activationConnect";
      activationName: string;
      segmentName: string;
      sources: { id: string; name: string }[];
      accountsBySource: Record<string, { id: string; name: string; region: "AU" | "NZ" | "USA" }[]>;
    }
  // When `collapseWhenRefined` is set, this card collapses to a compact
  // "first cut" note once the referenced segment is refined in place.
  | { type: "proposed"; artifactId: string; collapseWhenRefined?: boolean }
  | { type: "summary"; artifactId: string }
  | { type: "tool"; label: string; status: "thinking" | "done" }
  // An inline bar or line chart.
  | { type: "chart"; chart: ChartSpec }
  | FlowBlock
  // Lexi's read of the goal/constraints, shown before it builds anything.
  // Inline, non-blocking, editable — accountability over assumed escalation.
  | {
      type: "reasoning";
      goal: string;
      assumptions: ReasoningAssumption[];
      mode?: "verify" | "confirmation";
      confidence?: "high" | "medium" | "low";
      /** Optional closing note, e.g. "Correct any of these before I build." */
      note?: string;
    };

export interface ChatMessage {
  id: string;
  role: "user" | "lexi";
  text?: string;
  blocks?: ContentBlock[];
}

// ─── Conversation scripts (animated playback) ───────────────────────────────
// A conversation is a scripted sequence of turns the player streams back, one
// at a time: the user's message, an animated thinking trace, then Lexi's blocks.

/** A single thinking step, authored without runtime state (id/status added by the player). */
export interface StepSpec {
  /** Icon key understood by ChatThinking's iconMap (e.g. "database", "filter"). */
  icon: string;
  /** Label shown while the step is active. */
  label: string;
  /** Label shown once the step is complete. */
  completedLabel: string;
  /** Dwell time before the next step starts (ms). */
  durationMs?: number;
  /** Optional SQL revealed inline in the collapsed trace. */
  sql?: string;
}

export interface ConversationTurn {
  /** The user's prompt that opens this turn. */
  user: { text: string };
  /** Animated thinking steps streamed before Lexi answers. */
  thinking: StepSpec[];
  /** Summary shown on the collapsed trace, e.g. "Scanned customer base". */
  thinkingLabel: string;
  /** Lexi's response blocks, streamed after the thinking trace. */
  blocks: ContentBlock[];
  /** Store actions dispatched when this turn begins (e.g. refining a segment in place). */
  effects?: SessionAction[];
  /** Definition ids this response drew on — shown as a "Sources" bar under the reply. */
  sources?: string[];
}

export interface Conversation {
  id: string;
  /** Title shown in the Recent list and chat header. */
  title: string;
  /** One-line preview shown under the title in the Recent list. */
  preview: string;
  /** Relative timestamp label, e.g. "2h ago". */
  updatedLabel: string;
  /** Prompt offered on the empty "New chat" start screen. */
  seedPrompt: string;
  turns: ConversationTurn[];
}

// ─── Pin (from crystallisation) ─────────────────────────────────────────────

export interface Pin {
  id: string;
  text: string;
  sourceMessageId: string;
  sentenceStartOffset?: number;
}
