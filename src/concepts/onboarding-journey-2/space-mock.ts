import {
  RiBarChartLine, RiLineChartLine, RiGroupLine, RiBroadcastLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { ACTIVATIONS } from "./activations-mock";
import { BRAIN_GROUPS } from "../lexi-shared-brain/data";

// Shared mock content for the Space detail page + canvas. Sliced per space by
// the space's counts so different spaces show different amounts.

export interface KPI { label: string; value: string; delta?: { value: string; direction: "up" | "down" }; hint: string; icon: RemixiconComponentType }
export const KPIS: KPI[] = [
  { label: "Revenue (30d)", value: "$214K", delta: { value: "18%", direction: "up" }, hint: "attributed", icon: RiBarChartLine },
  { label: "Conversion rate", value: "18%", delta: { value: "3.0 pts", direction: "up" }, hint: "vs 6% lapsed baseline", icon: RiLineChartLine },
  { label: "Active audience", value: "3,400", delta: { value: "12%", direction: "up" }, hint: "reachable customers", icon: RiGroupLine },
  { label: "Campaigns live", value: "3", hint: "email · SMS · social", icon: RiBroadcastLine },
];

export interface Chat { id: string; title: string; updated: string }
export const RECENT_CHATS: Chat[] = [
  { id: "c1", title: "Win-back performance check", updated: "2 weeks ago" },
  { id: "c2", title: "Build holiday win-back segment", updated: "3 weeks ago" },
  { id: "c3", title: "VIP retention ideas", updated: "1 month ago" },
];

export interface SpaceSegment { id: string; name: string; meta: string }
export const SEGMENTS: SpaceSegment[] = [
  { id: "sg1", name: "Holiday win-back", meta: "3,400 customers" },
  { id: "sg2", name: "VIP loyalists", meta: "1,120 customers" },
  { id: "sg3", name: "First-time buyers (90d)", meta: "6,540 customers" },
];

export interface Activation { id: string; name: string; channel: string; status: string; updated?: string }
export interface Workflow { id: string; name: string; description?: string; status: string; activations: Activation[] }
export const WORKFLOWS: Workflow[] = [
  {
    id: "wf1",
    name: "Win-back follow-up plan",
    description: "Follow up with high-intent non-converters while performance is still warm.",
    status: "Awaiting approval",
    activations: [
      { id: "ac1", name: "Klaviyo — win-back email", channel: "Email", status: "Sent" },
      { id: "ac2", name: "Meta — lapsed lookalike", channel: "Paid social", status: "Live" },
    ],
  },
  {
    id: "wf2",
    name: "Season launch sequence",
    description: "Coordinate launch messaging across channels with urgency-based follow-ups.",
    status: "Active",
    activations: [
      { id: "ac3", name: "Welcome email", channel: "Email", status: "Live" },
      { id: "ac4", name: "SMS — last-chance reminder", channel: "SMS", status: "Scheduled" },
      { id: "ac5", name: "Meta — launch awareness", channel: "Paid social", status: "Live" },
    ],
  },
];

export interface Insight { id: string; name: string; meta: string; updated: string }
export const INSIGHTS: Insight[] = [
  { id: "i1", name: "The engagement filter drove the result", meta: "18% conversion · 11.4x ROI", updated: "2 weeks ago" },
  { id: "i2", name: "Revenue is front-loaded", meta: "~70% in the first 7 days", updated: "2 weeks ago" },
  { id: "i3", name: "Recency beats depth of lapse", meta: "90–180d drove 68% of revenue", updated: "2 weeks ago" },
];

export interface SpaceFile { id: string; name: string; updated?: string }
export const FILES: SpaceFile[] = [
  { id: "f1", name: "Season launch brief.pdf" },
  { id: "f2", name: "Brand guidelines 2026.pdf" },
  { id: "f3", name: "Q4 results.csv" },
];

export interface Update { id: string; kind: "approval" | "report"; title: string; desc: string }
export const INITIAL_UPDATES: Update[] = [
  { id: "u1", kind: "approval", title: "New insight: Recency beats depth of lapse", desc: "Approve to save it to this space." },
  { id: "u2", kind: "approval", title: "Suggested activation: SMS last-chance reminder", desc: "Review and approve to schedule." },
  { id: "u3", kind: "report", title: "14-day win-back performance report", desc: "Ready to view." },
];

export interface Scheduled { id: string; name: string; schedule: string; type: "Activation" | "Report" }
export const SCHEDULED: Scheduled[] = [
  { id: "s1", name: "Weekly win-back send", schedule: "Mondays · 9:00am", type: "Activation" },
  { id: "s2", name: "Monthly performance report", schedule: "1st of the month", type: "Report" },
];

const BF_KPIS: KPI[] = [
  { label: "Projected BF revenue", value: "$2.48M", delta: { value: "22%", direction: "up" }, hint: "vs last Black Friday", icon: RiBarChartLine },
  { label: "Target conversion", value: "14.8%", delta: { value: "3.0 pts", direction: "up" }, hint: "reactivation audiences", icon: RiLineChartLine },
  { label: "Addressable audience", value: "52,000", hint: "BF reactivation core", icon: RiGroupLine },
  { label: "Campaigns planned", value: "4", hint: "email · paid social · sms", icon: RiBroadcastLine },
];

const BF_RECENT_CHATS: Chat[] = [
  { id: "conv-black-friday-planning", title: "Black Friday planning", updated: "Jul 5, 2026" },
  { id: "conv-bf-activation-insights", title: "Build BF reactivation core segment", updated: "Jul 3, 2026" },
  { id: "conv-meta-activation", title: "Meta activation review", updated: "Jun 30, 2026" },
];

const BF_SEGMENTS: SpaceSegment[] = [
  { id: "bfs1", name: "BF reactivation core (90-180d)", meta: "52,000 customers · Updated Jul 2, 2026" },
  { id: "bfs2", name: "BF high-value reactivation", meta: "12,400 customers · Updated Jun 28, 2026" },
  { id: "bfs3", name: "BF mid-value reactivation", meta: "28,600 customers · Updated Jun 27, 2026" },
];

const BF_WORKFLOWS: Workflow[] = [
  {
    id: "bfwf1",
    name: "Black Friday warm-up sequence",
    description: "Prime high-propensity audiences before launch with early-access and reminder waves.",
    status: "Awaiting approval",
    activations: [
      { id: "bfac1", name: "Klaviyo — early access email", channel: "Email", status: "Scheduled", updated: "Jul 4, 2026" },
      { id: "bfac2", name: "Meta — BF reactivation audience", channel: "Paid social", status: "Live", updated: "Jul 1, 2026" },
    ],
  },
  {
    id: "bfwf2",
    name: "Black Friday launch wave",
    description: "Launch-day orchestration focused on high-value and mid-value reactivation cohorts.",
    status: "Active",
    activations: [
      { id: "bfac3", name: "SMS — launch day reminder", channel: "SMS", status: "Scheduled", updated: "Jul 4, 2026" },
      { id: "bfac4", name: "Meta — high-value refresh", channel: "Paid social", status: "Live", updated: "Jul 2, 2026" },
      { id: "bfac5", name: "Klaviyo — cart urgency follow-up", channel: "Email", status: "Draft", updated: "Jun 29, 2026" },
    ],
  },
];

const BF_INSIGHTS: Insight[] = [
  { id: "bfi1", name: "90-180 day lapsed is the sweet spot", meta: "16% conversion vs 7% long-lapsed", updated: "Jul 5, 2026" },
  { id: "bfi2", name: "Revenue is front-loaded in first 48h", meta: "52% of BF revenue", updated: "Jul 2, 2026" },
  { id: "bfi3", name: "Repeat customers drive majority of value", meta: "61% revenue share", updated: "Jun 30, 2026" },
];

const BF_FILES: SpaceFile[] = [
  { id: "bff1", name: "Black Friday brief 2026.pdf", updated: "Uploaded Jun 25, 2026" },
  { id: "bff2", name: "Promo calendar Q4.xlsx", updated: "Updated Jul 1, 2026" },
  { id: "bff3", name: "Channel budget split.csv", updated: "Updated Jul 3, 2026" },
];

const BF_UPDATES: Update[] = [
  { id: "bfu1", kind: "approval", title: "Approve BF reactivation core segment", desc: "Requested Jul 5, 2026 · Used by 3 planned activations." },
  { id: "bfu2", kind: "approval", title: "Approve Meta audience refresh schedule", desc: "Requested Jul 3, 2026 · Daily refresh from Nov 18 to Nov 29." },
  { id: "bfu3", kind: "report", title: "Black Friday daily pacing report", desc: "Generated Jul 2, 2026 · Draft is ready to review." },
];

const BF_SCHEDULED: Scheduled[] = [
  { id: "bfsch1", name: "BF warm-up email", schedule: "Nov 18 · 8:30am", type: "Activation" },
  { id: "bfsch2", name: "BF launch social refresh", schedule: "Daily · 6:00am", type: "Activation" },
  { id: "bfsch3", name: "BF daily performance digest", schedule: "Daily · 7:30pm", type: "Report" },
];

export interface SpaceContent {
  kpis: KPI[];
  recentChats: Chat[];
  segments: SpaceSegment[];
  workflows: Workflow[];
  insights: Insight[];
  files: SpaceFile[];
  updates: Update[];
  scheduled: Scheduled[];
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export const SEGMENT_LIBRARY: SpaceSegment[] = uniqueById([
  ...BRAIN_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    meta: `${group.population.toLocaleString()} customers`,
  })),
  ...SEGMENTS,
  ...BF_SEGMENTS,
  { id: "sg-lib-1", name: "High-intent browsers", meta: "9,850 customers" },
  { id: "sg-lib-2", name: "Promo-driven returners", meta: "4,210 customers" },
]);

export const INSIGHT_LIBRARY: Insight[] = uniqueById([
  ...INSIGHTS,
  ...BF_INSIGHTS,
  { id: "i-lib-1", name: "Email + social overlap boosts ROI", meta: "28% higher incremental revenue", updated: "3 days ago" },
  { id: "i-lib-2", name: "Second-touch SMS drives urgency", meta: "41% of conversions happen after SMS", updated: "1 week ago" },
]);

const ACTIVATION_STATUS_LABEL: Record<string, string> = {
  live: "Live",
  scheduled: "Scheduled",
  "awaiting-approval": "Awaiting approval",
  sent: "Sent",
  completed: "Completed",
  failed: "Failed",
};

export const ACTIVATION_LIBRARY: Activation[] = uniqueById([
  ...ACTIVATIONS.map((activation) => ({
    id: activation.id,
    name: activation.name,
    channel: activation.channel,
    status: ACTIVATION_STATUS_LABEL[activation.status] ?? activation.status,
  })),
  ...WORKFLOWS.flatMap((workflow) => workflow.activations),
  ...BF_WORKFLOWS.flatMap((workflow) => workflow.activations),
  { id: "ac-lib-1", name: "Klaviyo — VIP loyalty nurture", channel: "Email", status: "Draft" },
  { id: "ac-lib-2", name: "SMS — flash sale countdown", channel: "SMS", status: "Scheduled" },
]);

export function getSpaceContent(spaceId: string): SpaceContent {
  if (spaceId === "sp-black-friday") {
    return {
      kpis: BF_KPIS,
      recentChats: BF_RECENT_CHATS,
      segments: BF_SEGMENTS,
      workflows: BF_WORKFLOWS,
      insights: BF_INSIGHTS,
      files: BF_FILES,
      updates: BF_UPDATES,
      scheduled: BF_SCHEDULED,
    };
  }

  return {
    kpis: KPIS,
    recentChats: RECENT_CHATS,
    segments: SEGMENTS,
    workflows: WORKFLOWS,
    insights: INSIGHTS,
    files: FILES,
    updates: INITIAL_UPDATES,
    scheduled: SCHEDULED,
  };
}
