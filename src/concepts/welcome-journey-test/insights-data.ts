/**
 * Segment - V1 — Insights
 *
 * Saved findings the team keeps in the shared brain — each a markdown finding
 * (which can include tables and charts) plus its implication, traced back to the
 * chat or artifact that produced it. Knowledge › Insights lists these; the
 * drawer shows one in full and lets you edit the finding.
 */

/** Where an insight came from — a chat conversation or a saved artifact/segment. */
export interface SourceRef {
  kind: "chat" | "segment";
  id: string;
  label: string;
}

export interface Insight {
  id: string;
  title: string;
  finding: string;       // markdown — supports tables and ```chart blocks
  implication: string;
  space: string;
  source: SourceRef;
  metrics?: string[];
  owner: string;
  savedAt: string;
}

export const INSIGHTS: Insight[] = [
  {
    id: "ins-engagement",
    title: "The engagement filter drove the result",
    finding: [
      "The Lapsed VIPs Meta activation audience **converted at 17%** — roughly **3×** the usual lapsed baseline — at an **11.9× return on spend**.",
      "",
      "| Funnel step | Lapsed VIPs activation | Lapsed baseline |",
      "| --- | --- | --- |",
      "| Click rate | 19% | 6% |",
      "| Conversion | 17% | 6% |",
      "| ROAS | 11.9× | 3.8× |",
      "",
      "```chart",
      '{"kind":"bar","title":"Lapsed VIPs activation vs lapsed baseline","unit":"%","series":["Lapsed VIPs activation","Lapsed baseline"],"data":[{"label":"Click","values":[19,6]},{"label":"Conversion","values":[17,6]},{"label":"ROAS","values":[11.9,3.8]}]}',
      "```",
    ].join("\n"),
    implication:
      "Recent engagement and channel fit were the decisive levers. Keep this activation pattern as the default for Lapsed VIP reactivation.",
    space: "Retail season launch",
    source: { kind: "chat", id: "conv-winback-perf", label: "Lapsed VIPs activation performance" },
    metrics: ["Conversion rate", "Return on spend", "Email engaged"],
    owner: "You",
    savedAt: "2 weeks ago",
  },
  {
    id: "ins-frontloaded",
    title: "Revenue is front-loaded",
    finding: [
      "About **71%** of the **$268K** in attributed revenue landed in the first seven days after activation.",
      "",
      "```chart",
      '{"kind":"line","title":"Cumulative attributed revenue","unit":"$K","series":["Revenue"],"data":[{"label":"D1","values":[34]},{"label":"D3","values":[95]},{"label":"D5","values":[149]},{"label":"D7","values":[191]},{"label":"D10","values":[236]},{"label":"D14","values":[268]}]}',
      "```",
    ].join("\n"),
    implication:
      "A fast follow-up while attention is still high should capture more before the window closes.",
    space: "Retail season launch",
    source: { kind: "chat", id: "conv-winback-perf", label: "Lapsed VIPs activation performance" },
    metrics: ["Revenue", "Last order date"],
    owner: "Sarah Chen",
    savedAt: "2 weeks ago",
  },
  {
    id: "ins-recency",
    title: "Recency beats depth of lapse",
    finding: [
      "In the activation, the **90–180 day** cohort converted at **22%** and drove **70%** of revenue; the **180d+** cohort converted at **10%**.",
      "",
      "| Cohort | Customers | Conversion | Revenue |",
      "| --- | --- | --- | --- |",
      "| 90–180 days | 3,120 | 22% | $187K |",
      "| 180+ days | 2,410 | 10% | $81K |",
    ].join("\n"),
    implication:
      "Weight spend toward recently-lapsed customers and trim the long-lapsed tail in future activations.",
    space: "Retail season launch",
    source: { kind: "chat", id: "conv-winback-perf", label: "Lapsed VIPs activation performance" },
    metrics: ["Conversion rate", "Last order date"],
    owner: "You",
    savedAt: "2 weeks ago",
  },
  {
    id: "ins-second-touch",
    title: "A second email lifts conversion",
    finding:
      "Adding a **3-day reminder** to the win-back flow lifted conversion by **4 points** with almost no extra unsubscribes.",
    implication: "Standardise win-back as a two-touch flow rather than a single send.",
    space: "Win-back program",
    source: { kind: "chat", id: "conv-winback", label: "Holiday win-back" },
    metrics: ["Conversion rate", "Email open rate"],
    owner: "Marcus Lee",
    savedAt: "1 month ago",
  },
  {
    id: "ins-discount-cap",
    title: "Discounts beyond 20% don't pay back",
    finding: [
      "For lapsed buyers, **incremental margin turns negative** once the win-back incentive goes above **20% off**.",
      "",
      "- 10–20% off: positive contribution",
      "- Above 20%: orders rise, but margin goes negative",
    ].join("\n"),
    implication: "Cap the win-back incentive at 20% — deeper discounts buy orders but lose money.",
    space: "Win-back program",
    source: { kind: "segment", id: "g-bi-lapsed6", label: "Lapsed 6 months · subscribed" },
    metrics: ["Average discount level", "Order margin"],
    owner: "Marcus Lee",
    savedAt: "3 weeks ago",
  },
  {
    id: "ins-access-not-discount",
    title: "Pinnacles respond to access, not discounts",
    finding:
      "Early-access invites drove **2.3× the revenue per recipient** that a percentage-off offer did among Pinnacle members.",
    implication: "Lead VIP programs with access and perks; reserve discounting for lower tiers.",
    space: "VIP retention",
    source: { kind: "segment", id: "g-loyalty-gold", label: "Lifestyle Club · Pinnacles" },
    metrics: ["Revenue per recipient", "Lifestyle Club tier"],
    owner: "Sarah Chen",
    savedAt: "5 days ago",
  },
  {
    id: "ins-omnichannel",
    title: "Omnichannel VIPs churn half as often",
    finding:
      "VIPs who shop **both online and in-store** lapse at roughly **half the rate** of single-channel VIPs.",
    implication: "Nudge single-channel VIPs toward a second channel as a retention play.",
    space: "VIP retention",
    source: { kind: "segment", id: "g-bi-omni", label: "Omnichannel shoppers" },
    metrics: ["Channel mix", "Last order date"],
    owner: "Sarah Chen",
    savedAt: "1 week ago",
  },
  {
    id: "ins-second-purchase",
    title: "A 30-day second purchase predicts first-year LTV",
    finding:
      "Customers who place a **second order within 30 days** go on to a **2.1× higher** first-year lifetime value.",
    implication:
      "Prioritise the 30-day second-purchase nudge for new buyers — it's the biggest retention lever.",
    space: "New customer onboarding",
    source: { kind: "segment", id: "g-new-high-potential", label: "New high-potential" },
    metrics: ["Lifetime value", "Order count"],
    owner: "You",
    savedAt: "3 days ago",
  },
  {
    id: "ins-welcome-dropoff",
    title: "Welcome series drops off at email 3",
    finding:
      "Open rate **falls sharply on the third welcome email** — most of the series value is captured in the first two.",
    implication: "Shorten the welcome to two emails, or re-theme the third around a different hook.",
    space: "New customer onboarding",
    source: { kind: "segment", id: "g-bi-new", label: "New customers" },
    metrics: ["Email open rate"],
    owner: "Marcus Lee",
    savedAt: "6 days ago",
  },
  {
    id: "bfi1",
    title: "90-180 day lapsed is the sweet spot",
    finding: [
      "For Black Friday reactivation, the **90-180 day** lapsed cohort is delivering the strongest early performance.",
      "",
      "| Cohort | Conversion | Revenue share |",
      "| --- | --- | --- |",
      "| 90-180 days | 16% | 58% |",
      "| 180+ days | 7% | 24% |",
      "| 30-90 days | 12% | 18% |",
    ].join("\n"),
    implication:
      "Keep spend concentrated on 90-180 day lapsed audiences for warm-up and launch waves.",
    space: "Black Friday planning",
    source: { kind: "segment", id: "bfs1", label: "BF reactivation core (90-180d)" },
    metrics: ["Conversion rate", "Revenue share"],
    owner: "Amy",
    savedAt: "Jul 5, 2026",
  },
  {
    id: "bfi2",
    title: "Revenue is front-loaded in first 48h",
    finding: [
      "Most Black Friday campaign-attributed revenue lands in the first two days after activation.",
      "",
      "```chart",
      '{"kind":"line","title":"BF attributed revenue timing","unit":"%","series":["Revenue share"],"data":[{"label":"Day 1","values":[31]},{"label":"Day 2","values":[52]},{"label":"Day 3","values":[63]},{"label":"Day 5","values":[78]},{"label":"Day 7","values":[89]}]}',
      "```",
    ].join("\n"),
    implication:
      "Prioritise follow-up messages inside 48 hours while intent is highest.",
    space: "Black Friday planning",
    source: { kind: "chat", id: "conv-black-friday-planning", label: "Black Friday planning" },
    metrics: ["Revenue", "Time to convert"],
    owner: "Amy",
    savedAt: "Jul 2, 2026",
  },
  {
    id: "bfi3",
    title: "Repeat customers drive majority of value",
    finding:
      "Returning customers represent **61% of projected Black Friday revenue**, even though they are a minority of the reachable audience.",
    implication:
      "Weight launch spend and premium offers toward repeat customers to maximise value efficiency.",
    space: "Black Friday planning",
    source: { kind: "segment", id: "bfs2", label: "BF high-value reactivation" },
    metrics: ["Projected revenue", "Repeat share"],
    owner: "Amy",
    savedAt: "Jun 30, 2026",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface SpaceCount { name: string; count: number }

export function insightSpaces(): SpaceCount[] {
  const counts = new Map<string, number>();
  for (const i of INSIGHTS) counts.set(i.space, (counts.get(i.space) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

export function getInsight(id: string): Insight | undefined {
  return INSIGHTS.find((i) => i.id === id);
}

function stripInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_`]/g, "");
}

/** First line of plain text from a markdown finding — for list card previews. */
export function previewText(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let inFence = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("```")) { inFence = !inFence; continue; }
    if (inFence || !line || line.startsWith("|")) continue;
    return stripInline(
      line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+\.\s+/, "").replace(/^>\s?/, ""),
    );
  }
  return "";
}
