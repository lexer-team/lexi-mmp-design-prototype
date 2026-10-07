import type { Artifact, ArtifactBody, Conversation } from "./types";
import type { DefRef } from "@/data/def-registry";

// Segment - V1 — chat-first segment creation. Lexi confirms its read, proposes a
// segment, the user refines it, then saves. Scoped to segments + the definitions
// they're built from. Forked from Shared brain v2.
//
// Conversations are scripted: the chat panel streams each turn back with an
// animated thinking trace (ChatThinking) + word-by-word text, mirroring Shared
// brain v1. Add more entries to CONVERSATIONS to grow the Recent list.

// ─── Segment refs for inline citations ──────────────────────────────────────

export const DEMO_SEGMENT_DEFS: DefRef[] = [
  {
    id: "seg-winback",
    kind: "segment",
    name: "Holiday win-back",
    entity: "customer",
    description:
      "Lapsed but valuable customers worth re-engaging before the holiday sale: no purchase in 90+ days, above-median lifetime value, and marketing-consented.",
    logic: "days_since_last_order > 90 AND ltv > median_ltv AND marketing_consent = true",
    stat: { label: "customers", value: "8,200" },
  },
];

// ─── Definition refs for inline citations ───────────────────────────────────

export const DEMO_DEFS: DefRef[] = [
  {
    id: "def-lapsed",
    kind: "term",
    name: "Lapsed customer",
    entity: "customer",
    description:
      "A customer whose most recent order was more than 90 days ago. The window is configurable per campaign.",
    logic: "days_since_last_order > 90",
  },
  {
    id: "def-ltv",
    kind: "metric",
    name: "Lifetime value (LTV)",
    entity: "customer",
    description: "Total revenue attributed to a customer across all orders, net of returns.",
    logic: "SUM(orders.revenue) - SUM(returns.value)",
    stat: { label: "median", value: "$310" },
  },
  {
    id: "def-email-eng",
    kind: "attribute",
    name: "Email engagement",
    entity: "customer",
    description:
      "Whether a customer has opened or clicked a marketing email within a given window.",
    logic: "email_open OR email_click WITHIN window",
  },
  {
    id: "def-consent",
    kind: "term",
    name: "Marketing consent",
    entity: "customer",
    description:
      "Customer has an active opt-in for marketing email and is not on a suppression list.",
    logic: "marketing_opt_in = true AND NOT suppressed",
  },
  {
    id: "def-conv-rate",
    kind: "metric",
    name: "Conversion rate",
    entity: "customer",
    description:
      "Share of targeted customers who placed at least one order within the campaign attribution window.",
    logic: "COUNT(DISTINCT customers_with_order) / COUNT(DISTINCT targeted_customers)",
    stat: { label: "lapsed-list baseline", value: "6%" },
  },
  {
    id: "def-roi",
    kind: "metric",
    name: "Return on campaign spend",
    entity: "customer",
    description:
      "Attributed revenue divided by total campaign cost (creative, send, and incentive).",
    logic: "attributed_revenue / campaign_cost",
    stat: { label: "program target", value: "4x" },
  },
  {
    id: "def-rev-per",
    kind: "metric",
    name: "Revenue per recipient",
    entity: "customer",
    description:
      "Attributed campaign revenue divided by the number of customers the campaign reached.",
    logic: "attributed_revenue / recipients",
    stat: { label: "lapsed-list baseline", value: "$18" },
  },
];

// ─── Artifacts ──────────────────────────────────────────────────────────────

// One segment, iterated. Turn 1 proposes the first cut; turn 2 refines this same
// artifact in place (REFINE_SEGMENT) — so only one "Holiday win-back" ever exists
// and lands in the Artifacts panel.
export const DEMO_ARTIFACTS: Record<string, Artifact> = {
  "seg-winback": {
    id: "seg-winback",
    type: "segment",
    name: "Holiday win-back",
    status: "proposed",
    body: {
      kind: "segment",
      purpose: "Re-engage lapsed but valuable customers before the holiday sale.",
      criteria: [
        "No purchase in the last 90 days",
        "Lifetime value above the median ($310)",
        "Opted In and not surpressed",
      ],
      population: "8,200",
      metrics: [
        { label: "Population", value: "8,200", hint: "customers" },
        { label: "Median lifetime value", value: "$420", hint: "per customer" },
        { label: "Avg. days since order", value: "142", hint: "days lapsed" },
      ],
    },
    def: {
      id: "seg-winback",
      kind: "segment",
      name: "Holiday win-back",
      entity: "customer",
      description:
        "Lapsed but valuable customers worth re-engaging before the holiday sale.",
      logic: "days_since_last_order > 90 AND ltv > median_ltv AND marketing_consent = true",
      stat: { label: "customers", value: "8,200" },
    },
  },

  // ── Insight artifacts woven through the performance read-out ──
  // Saveable to the shared brain (finding + implication, with Save / Reject).
  "perf-insight-engagement": {
    id: "perf-insight-engagement",
    type: "insight",
    name: "The engagement filter drove the result",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "The email-engaged win-back audience converted at 18% — roughly 3x a usual lapsed-list campaign — at an 11.4x return on spend.",
      implication:
        "Recent email engagement was the decisive lever. Worth making the 60-day engagement filter the default for win-back from here on.",
    },
  },
  "perf-insight-revenue": {
    id: "perf-insight-revenue",
    type: "insight",
    name: "Revenue is front-loaded",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "About 70% of the $214K in attributed revenue landed in the first seven days after send.",
      implication:
        "A fast follow-up while attention is still high should capture more before the window closes.",
    },
  },
  "perf-insight-recency": {
    id: "perf-insight-recency",
    type: "insight",
    name: "Recency beats depth of lapse",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "The 90–180 day cohort converted at 23% and drove 68% of revenue; the 180d+ cohort converted at just 12%.",
      implication:
        "Weight spend toward recently-lapsed customers and trim the long-lapsed tail in future win-back sends.",
    },
  },

  // ── Black Friday planning insights (last-year customer read-out) ──
  "bf-insight-repeat-strength": {
    id: "bf-insight-repeat-strength",
    type: "insight",
    name: "Repeat customers drove most BF revenue",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "Last Black Friday, repeat customers were 34% of buyers but generated 61% of revenue, with 2.4x higher revenue per recipient than first-time buyers.",
      implication:
        "Recommendation\n\nProtect this group with early-access sequencing and premium bundles before broad discount sends. This means customers with 2+ purchases in the past 12 months who've bought within the last 6-9 months, so you're reaching people who are still active, not those already in a win-back flow.\n\nA few directions worth exploring from here:\n\n- How concentrated repeat-customer value really is, and who's in that group\n- The 90-180 day reactivation window that seems to convert best\n- Why the first 48 hours saw a timing spike worth planning around\n\nPick one and I'll break it down with numbers.",
    },
  },
  "bf-insight-reactivation-window": {
    id: "bf-insight-reactivation-window",
    type: "insight",
    name: "90-180 day lapsed customers are the sweet spot",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "Customers lapsed 90-180 days converted at 16% during BF week, versus 7% for 180+ day lapsed customers.",
      implication:
        "Prioritise the 90-180 day cohort in week -2 warm-up flows and cap spend on deeper-lapsed tails.",
    },
  },
  "bf-insight-timing": {
    id: "bf-insight-timing",
    type: "insight",
    name: "Revenue concentrated in first 48 hours",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "52% of attributed BF revenue landed in the first 48 hours, with strongest response in the first evening send window.",
      implication:
        "Front-load hero offers and send priority audience waves before BF day to capture peak intent.",
    },
  },
  "bf-insight-repeat-drivers-deepdive": {
    id: "bf-insight-repeat-drivers-deepdive",
    type: "insight",
    name: "What drove repeat-customer value last BF",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "Repeat-customer revenue was concentrated in two clusters: premium apparel loyalists and replenishment shoppers. Together they represented 38% of repeat buyers but 67% of repeat-customer revenue.",
      implication:
        "Recommendation\n\nPrioritise these high-value repeat clusters in the early-access window with premium bundles and inventory-first messaging before broad discount sends.\n\nA few directions worth exploring from here:\n\n- Which VIP repeat customers are at risk of missing BF if not reached in week -2\n- How much uplift we can expect by splitting early-access messaging by cluster\n- Where first-time shoppers overlap with repeat-like behaviour and should be promoted\n\nPick one and I'll break it down with numbers.",
    },
  },
  "bf-activation-insight-roas": {
    id: "bf-activation-insight-roas",
    type: "insight",
    name: "Meta activation delivered profitable scale",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "The Meta activation reached 48.2K matched profiles and generated a 4.6x return on ad spend over 10 days, with strongest conversion in day 1-3.",
      implication:
        "Keep this audience active through peak BF week and prioritise budget in the first 72 hours after refresh.",
    },
  },
  "bf-activation-insight-quality": {
    id: "bf-activation-insight-quality",
    type: "insight",
    name: "Audience quality outperformed broader prospecting",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "BF reactivation core (90-180d) delivered 2.1x higher conversion rate than broad lookalike prospecting at similar CPM.",
      implication:
        "Retain this segment as a core paid-social retargeting audience and reduce spend on weaker broad pools.",
    },
  },
  "bf-activation-insight-creative": {
    id: "bf-activation-insight-creative",
    type: "insight",
    name: "Urgency creative won on repeat impressions",
    status: "proposed",
    body: {
      kind: "insight",
      finding:
        "Urgency-led creative variant (countdown + limited stock framing) lifted click-through by 28% vs value-only creative on this activation.",
      implication:
        "Use urgency creative as default for the final 5 days before BF and reserve value-led creative for warm-up.",
    },
  },
  "seg-bf-reactivation-core": {
    id: "seg-bf-reactivation-core",
    type: "segment",
    name: "BF reactivation core (90-180d)",
    status: "proposed",
    body: {
      kind: "segment",
      purpose: "Target last year's high-propensity lapsed window for Black Friday reactivation.",
      criteria: [
        "Last purchase was 90-180 days ago",
        "Opted In and not surpressed",
        "At least one order in the last 12 months",
        "Not purchased in the last 30 days",
      ],
      population: "52,000",
      metrics: [
        { label: "Population", value: "52,000", hint: "customers" },
        { label: "Projected conversion", value: "14-16%", hint: "BF week" },
        { label: "Projected revenue / recipient", value: "$29", hint: "vs $26.40 baseline" },
      ],
    },
    def: {
      id: "seg-bf-reactivation-core",
      kind: "segment",
      name: "BF reactivation core (90-180d)",
      entity: "customer",
      description:
        "Lapsed customers in the 90-180 day window with consent, tuned for Black Friday reactivation.",
      logic:
        "days_since_last_order BETWEEN 90 AND 180 AND marketing_consent = true AND orders_last_12m >= 1 AND days_since_last_order > 30",
      stat: { label: "customers", value: "52,000" },
    },
  },

  // ── Recommendation artifact (used by the "2-weeks-later" conversation) ──
  // The performance read-out itself is rendered inline (markdown + charts);
  // insights and the follow-up plan are saveable artifacts.
  "perf-reco": {
    id: "perf-reco",
    type: "recommendation",
    name: "Next move: convert the openers, then scale",
    status: "proposed",
    body: {
      kind: "recommendation",
      steps: [
        {
          id: "reco-1",
          week: 1,
          label: "Re-target openers who didn't buy",
          segment: "Engaged non-converters",
          channel: "email",
          offer: "Time-boxed 15% incentive to the ~470 who opened or clicked but placed no order.",
          projectedRevenue: "$48K",
          approvalGate: false,
        },
        {
          id: "reco-2",
          week: 2,
          label: "Scale the winning recipe to recently-lapsed in other categories",
          segment: "Recently lapsed (90–180d), all categories",
          channel: "email",
          offer: "Replicate the win-back creative for the 90–180 day tier outside the holiday range.",
          projectedRevenue: "$60K",
          approvalGate: true,
          conditional: "open rate holds above 35% on the step-1 send",
        },
      ],
      scorecard: [
        { label: "Incremental revenue", target: "$108K" },
        { label: "Target conversion", target: "15%+" },
        { label: "Window", target: "4 weeks" },
      ],
      inputs: ["seg-winback", "def-conv-rate", "def-roi"],
    },
  },
};

// The refined definition Lexi narrows `seg-winback` to in turn 2 (applied via
// REFINE_SEGMENT). Same segment, same name — just tighter.
const WINBACK_REFINED_BODY: ArtifactBody = {
  kind: "segment",
  purpose: "Win-back audience narrowed to customers who are still reachable.",
  criteria: [
    "No purchase in the last 90 days",
    "Lifetime value above the median ($310)",
    "Opted In and not surpressed",
    "Opened or clicked an email in the last 60 days",
  ],
  population: "3,400",
  metrics: [
    { label: "Population", value: "3,400", hint: "customers" },
    { label: "Median lifetime value", value: "$440", hint: "per customer" },
    { label: "Email-engaged (60d)", value: "100%", hint: "reachable" },
  ],
};

const WINBACK_REFINED_DEF: DefRef = {
  id: "seg-winback",
  kind: "segment",
  name: "Holiday win-back",
  entity: "customer",
  description:
    "Lapsed but valuable customers who are still reachable — recent email engagement signals they'll see the campaign.",
  logic:
    "days_since_last_order > 90 AND ltv > median_ltv AND marketing_consent = true AND email_engaged_60d = true",
  stat: { label: "customers", value: "3,400" },
};

// ─── Conversations (scripted, animated playback) ────────────────────────────

const BLACK_FRIDAY_PLANNING: Conversation = {
  id: "conv-black-friday-planning",
  title: "Black Friday planning",
  preview: "What last year tells us about this year's customer plan",
  updatedLabel: "Just now",
  seedPrompt:
    "Black Friday is in a few weeks and I would like to know about my customers from last year.",
  turns: [
    {
      user: {
        text: "Black Friday is in a few weeks and I would like to know about my customers from last year.",
      },
      effects: [
        { type: "SURFACE_DEFINITIONS", ids: ["def-rev-per", "def-conv-rate", "def-lapsed"] },
      ],
      thinking: [
        {
          icon: "message-square",
          label: "Reading your planning question",
          completedLabel: "Read your planning question",
          durationMs: 550,
        },
        {
          icon: "database",
          label: "Pulling last Black Friday cohort performance",
          completedLabel: "Pulled last Black Friday cohort performance",
          durationMs: 900,
          sql: "SELECT cohort, COUNT(DISTINCT customer_id) AS buyers,\n       SUM(revenue) AS revenue,\n       SUM(revenue) / NULLIF(COUNT(DISTINCT recipients),0) AS rev_per_recipient\nFROM bf_2025_customer_performance\nGROUP BY cohort;",
        },
        {
          icon: "filter",
          label: "Comparing recency and response windows",
          completedLabel: "Compared recency and response windows",
          durationMs: 700,
        },
      ],
      thinkingLabel: "Analysed last year's Black Friday customers",
      blocks: [
        {
          type: "text",
          content:
            "Last Black Friday, your best customers weren't who you'd expect. Repeat customers were only a third of your buyers, but they brought in 61% of the revenue, at nearly 2.5x the value per person of first-time shoppers.",
        },
        {
          type: "text",
          content:
            "Worth knowing with BF only a few weeks out: that early-access window before the discounts go broad is where the money is.",
        },
        {
          type: "text",
          content:
            "##### Last year at a glance\n- **Total BF buyers:** 18,420\n- **Attributed revenue:** $1.84M\n- **Overall conversion:** 11.8%\n- **Revenue per recipient:** $26.40",
        },
        {
          type: "chart",
          chart: {
            kind: "bar",
            title: "Black Friday 2025 by customer cohort",
            unit: "%",
            series: ["Share of buyers", "Share of revenue"],
            data: [
              { label: "Repeat", values: [34, 61] },
              { label: "First-time", values: [46, 27] },
              { label: "Reactivated", values: [20, 12] },
            ],
            caption: "Repeat customers were a smaller share of buyers but a much larger share of revenue.",
          },
        },
        { type: "proposed", artifactId: "bf-insight-repeat-strength" },
        {
          type: "actions",
          actions: [
            { id: "bf-dive-repeat-value", label: "Explore repeat-customer value drivers from last year" },
            { id: "bf-dive-reactivation-window", label: "Break down the 90-180 day window" },
            { id: "bf-dive-timing-window", label: "Explore last year's first-48-hour timing pattern" },
            { id: "bf-build-segment-from-cohort", label: "Build the early access segment" },
          ],
        },
      ],
    },
    {
      user: {
        text: "Yes, let's build a segment for early access customers for Black Friday",
      },
      effects: [
        { type: "SURFACE_DEFINITIONS", ids: ["def-lapsed", "def-consent", "def-conv-rate"] },
      ],
      thinking: [
        {
          icon: "message-square",
          label: "Converting insight into a targetable audience",
          completedLabel: "Converted insight into a targetable audience",
          durationMs: 550,
        },
        {
          icon: "filter",
          label: "Applying the 90-180 day lapse window",
          completedLabel: "Applied the 90-180 day lapse window",
          durationMs: 700,
          sql: "SELECT customer_id\nFROM customers\nWHERE days_since_last_order BETWEEN 90 AND 180\n  AND marketing_opt_in = true\n  AND NOT suppressed\n  AND orders_last_12m >= 1\n  AND days_since_last_order > 30;",
        },
        {
          icon: "users",
          label: "Sizing and quality-checking the audience",
          completedLabel: "Sized and quality-checked the audience",
          durationMs: 700,
        },
      ],
      thinkingLabel: "Started Black Friday segment workflow from the recency insight",
      blocks: [
        {
          type: "text",
          content:
            "Before I build the segment, verify these assumptions. You can click and edit each one inline.",
        },
        {
          type: "reasoning",
          goal: "Build the Early Access card view segment for Black Friday repeat customers.",
          assumptions: [
            { id: "bf-total-orders", label: "Total Orders", value: "2+" },
            { id: "bf-order-date", label: "Order Date", value: "in the past 12 months" },
            { id: "bf-last-order-date", label: "Last Order Date", value: "within the last 6-9 month" },
          ],
        },
      ],
    },
  ],
};

const HOLIDAY_WINBACK: Conversation = {
  id: "conv-winback",
  title: "Holiday win-back",
  preview: "Lapsed-but-valuable customers to re-engage before the sale",
  updatedLabel: "Just now",
  seedPrompt:
    "I want to build a segment of customers worth re-engaging before the holiday sale.",
  turns: [
    // ── Turn 1 — Verify assumptions (gated): Lexi shows its read and waits ──
    {
      user: {
        text: "I want to build a segment of customers worth re-engaging before the holiday sale.",
      },
      // Surface the definitions this turn leans on into the Definitions panel.
      effects: [
        { type: "SURFACE_DEFINITIONS", ids: ["def-lapsed", "def-ltv", "def-consent"] },
      ],
      thinking: [
        {
          icon: "message-square",
          label: "Reading your request",
          completedLabel: "Read your request",
          durationMs: 600,
        },
        {
          icon: "database",
          label: "Scanning the customer base",
          completedLabel: "Scanned the customer base",
          durationMs: 750,
          sql: "SELECT COUNT(*) AS customers\nFROM customers\nWHERE marketing_opt_in = true\n  AND NOT suppressed;",
        },
        {
          icon: "sparkles",
          label: "Resolving definitions",
          completedLabel: "Resolved definitions",
          durationMs: 550,
        },
      ],
      thinkingLabel: "Read your request & resolved definitions",
      sources: ["def-lapsed", "def-ltv", "def-consent"],
      blocks: [
        {
          type: "text",
          content:
            "Before I build anything, here's how I'm reading this. Check the assumptions and I'll build the segment.",
        },
        {
          type: "reasoning",
          goal: "Find lapsed-but-valuable customers who are still reachable.",
          assumptions: [
            { id: "a-lapsed", label: "Lapsed means", value: "no purchase in the last 90 days" },
            { id: "a-valuable", label: "Valuable means", value: "lifetime value above the median ($310)" },
            { id: "a-reachable", label: "Reachable means", value: "Opted In and not surpressed" },
          ],
        },
        {
          type: "text",
          content:
            "Correct any of these before I build — the definitions drive who's included.",
        },
      ],
    },
    // ── Turn 2 — Build the segment (after the user confirms the assumptions) ──
    {
      user: {
        text: "Build the segment.",
      },
      thinking: [
        {
          icon: "users",
          label: "Sizing lapsed & valuable customers",
          completedLabel: "Sized lapsed & valuable customers",
          durationMs: 800,
          sql: "SELECT COUNT(DISTINCT c.id) AS lapsed_valuable\nFROM customers c\nJOIN customer_ltv l ON l.customer_id = c.id\nWHERE c.days_since_last_order > 90\n  AND l.ltv > (SELECT median_ltv FROM ltv_benchmarks)\n  AND c.marketing_opt_in = true;",
        },
        {
          icon: "sparkles",
          label: "Assembling the segment",
          completedLabel: "Assembled the segment",
          durationMs: 600,
        },
      ],
      thinkingLabel: "Built & sized the segment",
      sources: ["def-lapsed", "def-ltv", "def-consent"],
      blocks: [
        {
          type: "text",
          content:
            "On that basis, here's a first cut. It leans on your [[def-lapsed]] and [[def-ltv]] definitions.",
        },
        // Collapses to a compact "first cut" note once the next turn refines the segment.
        { type: "proposed", artifactId: "seg-winback", collapseWhenRefined: true },
      ],
    },
    // ── Turn 3 — Refine the same segment in place ──
    {
      user: {
        text: "Tighten it — only include people who've opened an email in the last 60 days.",
      },
      // Narrow the same segment in place (no second artifact is created), and
      // surface the engagement definition it now relies on.
      effects: [
        {
          type: "REFINE_SEGMENT",
          id: "seg-winback",
          body: WINBACK_REFINED_BODY,
          def: WINBACK_REFINED_DEF,
          firstCutPopulation: "8,200",
        },
        { type: "SURFACE_DEFINITIONS", ids: ["def-email-eng"] },
      ],
      thinking: [
        {
          icon: "filter",
          label: "Applying email-engagement filter",
          completedLabel: "Applied email-engagement filter",
          durationMs: 700,
          sql: "-- keep only customers engaged in the last 60 days\nSELECT customer_id\nFROM candidate_audience\nWHERE customer_id IN (\n  SELECT customer_id FROM email_events\n  WHERE event IN ('open','click')\n    AND occurred_at >= CURRENT_DATE - INTERVAL '60 days'\n);",
        },
        {
          icon: "users",
          label: "Re-sizing the audience",
          completedLabel: "Re-sized the audience",
          durationMs: 700,
          sql: "SELECT COUNT(DISTINCT customer_id) AS reachable\nFROM filtered_audience;",
        },
      ],
      thinkingLabel: "Applied the engagement filter & re-sized",
      sources: ["def-lapsed", "def-ltv", "def-consent", "def-email-eng"],
      blocks: [
        {
          type: "text",
          content:
            "Done — I've tightened the same segment rather than spinning up a new one. Adding [[def-email-eng]] in the last 60 days narrows it from 8,200 to 3,400, but everyone left is someone who'll actually see the campaign.",
        },
        { type: "proposed", artifactId: "seg-winback" },
        {
          type: "text",
          content: "Want me to save this segment so you can use it in a campaign?",
        },
      ],
    },
  ],
};

// ── "Two weeks later" — the user comes back to check how the segment did ──
// They @mention the saved Holiday win-back segment and ask how it performed.
// Lexi answers with one structured, report-style response: markdown sections,
// a bar chart and a line chart, and insight callouts woven through. A follow-up
// turn then proposes the next move (the only saveable artifact here).
const META_ACTIVATION: Conversation = {
  id: "conv-meta-activation",
  title: "Meta custom audience activation",
  preview: "Send an activation to Meta of my Lapsed VIPs",
  updatedLabel: "Just now",
  seedPrompt: "Send an activation to Meta of my Lapsed VIPs.",
  turns: [
    {
      user: {
        text: "Send an activation to Meta of my Lapsed VIPs.",
      },
      thinking: [
        {
          icon: "message-square",
          label: "Reading your request",
          completedLabel: "Read your request",
          durationMs: 500,
        },
        {
          icon: "database",
          label: "Checking audience definitions",
          completedLabel: "Checked definitions",
          durationMs: 650,
        },
        {
          icon: "sparkles",
          label: "Preparing the activation flow",
          completedLabel: "Ready to activate",
          durationMs: 550,
        },
      ],
      thinkingLabel: "Interpreting the activation request",
      blocks: [
        {
          type: "text",
          content: "Both terms are in the playbook; the lapsed window is adjustable.",
        },
        {
          type: "flow",
          flowId: "meta-activation-1",
          step: "resolve",
          windowDays: 180,
          confirmed: false,
        },
      ],
    },
  ],
};

const WINBACK_PERFORMANCE: Conversation = {
  id: "conv-winback-perf",
  title: "Lapsed VIPs activation performance",
  preview: "Two weeks on — how did the Lapsed VIPs Meta activation perform?",
  updatedLabel: "2 weeks later",
  seedPrompt:
    "@Lapsed VIPs Meta activation — it's been two weeks since this activation went out. How did this activation actually perform?",
  turns: [
    // ── Turn 1 — The full performance read-out (markdown + charts + insights) ──
    {
      user: {
        text: "@Lapsed VIPs Meta activation — it's been two weeks since this activation went out. How did this activation actually perform?",
      },
      effects: [
        { type: "SURFACE_DEFINITIONS", ids: ["g-vip-at-risk", "def-conv-rate", "def-roi", "def-rev-per", "def-email-eng"] },
      ],
      thinking: [
        {
          icon: "message-square",
          label: "Reading your request",
          completedLabel: "Read your request",
          durationMs: 500,
        },
        {
          icon: "database",
          label: "Pulling delivery, clicks & orders for the activation",
          completedLabel: "Pulled activation delivery, clicks & orders",
          durationMs: 900,
          sql: "SELECT a.destination, a.reach, a.clicks,\n       COUNT(DISTINCT o.customer_id) AS converters,\n       SUM(o.revenue)               AS revenue\nFROM activation_events a\nLEFT JOIN orders o\n  ON o.customer_id = a.customer_id\n AND o.created_at BETWEEN a.sent_at AND a.sent_at + INTERVAL '14 days'\nWHERE a.activation_id = 'conv-meta-activation'\n  AND a.destination = 'Meta';",
        },
        {
          icon: "filter",
          label: "Splitting results by lapse recency",
          completedLabel: "Split results by lapse recency",
          durationMs: 700,
        },
        {
          icon: "bar-chart",
          label: "Comparing against the lapsed-list baseline",
          completedLabel: "Compared against baseline",
          durationMs: 700,
        },
      ],
      thinkingLabel: "Pulled 14-day activation results and compared against baseline",
      sources: ["g-vip-at-risk", "def-conv-rate", "def-roi", "def-rev-per", "def-email-eng"],
      blocks: [
        {
          type: "text",
          content:
            "## Headline\nTwo weeks in, the **Lapsed VIPs Meta activation** clearly beat the usual lapsed-audience benchmark. It reached **5,530** customers, drove **742 orders**, and brought in **$268K** in attributed revenue — an **11.9x** [[def-roi]].",
        },
        { type: "proposed", artifactId: "perf-insight-engagement" },
        {
          type: "text",
          content:
            "## Activation funnel vs. your lapsed baseline\nEvery step beat the benchmark — click-through and conversion ran ~3x ahead, showing the activation targeted the right cohort.",
        },
        {
          type: "chart",
          chart: {
            kind: "bar",
            title: "Lapsed VIPs Meta activation vs lapsed baseline",
            unit: "%",
            series: ["Lapsed VIPs activation", "Lapsed baseline"],
            data: [
              { label: "Click rate", values: [19, 6] },
              { label: "Conversion", values: [17, 6] },
              { label: "ROAS", values: [11.9, 3.8] },
            ],
            caption: "Click, conversion and return on ad spend over the first 14 days.",
          },
        },
        {
          type: "text",
          content:
            "## Revenue momentum\nRevenue landed quickly in the first week, then tapered as the high-intent portion of the activated audience exhausted.",
        },
        {
          type: "chart",
          chart: {
            kind: "line",
            title: "Cumulative attributed revenue",
            unit: "$K",
            series: ["Cumulative revenue"],
            data: [
              { label: "D1", values: [34] },
              { label: "D2", values: [66] },
              { label: "D3", values: [95] },
              { label: "D4", values: [124] },
              { label: "D5", values: [149] },
              { label: "D6", values: [171] },
              { label: "D7", values: [191] },
              { label: "D8", values: [208] },
              { label: "D9", values: [223] },
              { label: "D10", values: [236] },
              { label: "D11", values: [247] },
              { label: "D12", values: [255] },
              { label: "D13", values: [262] },
              { label: "D14", values: [268] },
            ],
            caption: "Roughly 71% of the $268K landed in the first seven days.",
          },
        },
        { type: "proposed", artifactId: "perf-insight-revenue" },
        {
          type: "text",
          content:
            "## Where it's coming from\nBreaking the activation by lapse recency still shows the same pattern:\n- **Recently lapsed (90–180d):** 3,120 customers · 22% conversion · $187K\n- **Long lapsed (180d+):** 2,410 customers · 10% conversion · $81K",
        },
        {
          type: "chart",
          chart: {
            kind: "bar",
            title: "Conversion by lapse recency",
            unit: "%",
            series: ["Conversion"],
            data: [
              { label: "90–180d", values: [22] },
              { label: "180d+", values: [10] },
            ],
            caption: "Recently-lapsed customers convert at more than double the long-lapsed rate.",
          },
        },
        { type: "proposed", artifactId: "perf-insight-recency" },
        {
          type: "text",
          content:
            "## Bottom line\nThis **Lapsed VIPs → Meta activation** is a strong, repeatable win — recency and subscription quality are doing the heavy lifting. Want me to suggest the next move to build on it?",
        },
      ],
    },
    // ── Turn 2 — Recommended next move (the saveable artifact) ──
    {
      user: {
        text: "Yes — what should we do next to build on this?",
      },
      thinking: [
        {
          icon: "sparkles",
          label: "Modelling next-step options",
          completedLabel: "Modelled next-step options",
          durationMs: 750,
        },
        {
          icon: "file-text",
          label: "Drafting a follow-up plan",
          completedLabel: "Drafted a follow-up plan",
          durationMs: 600,
        },
      ],
      thinkingLabel: "Drafted a two-step follow-up plan",
      sources: ["g-vip-at-risk", "def-conv-rate", "def-roi"],
      blocks: [
        {
          type: "text",
          content: "Two moves, in order — both reuse exactly what just worked:",
        },
        { type: "proposed", artifactId: "perf-reco" },
        {
          type: "text",
          content: "Want me to set up the step-1 follow-up campaign?",
        },
      ],
    },
  ],
};

const BF_ACTIVATION_INSIGHTS: Conversation = {
  id: "conv-bf-activation-insights",
  title: "BF activation insights",
  preview: "Inspect campaign performance for Meta activation — BF reactivation core",
  updatedLabel: "Just now",
  seedPrompt: "@Meta activation — BF reactivation core (90-180d)",
  turns: [
    {
      user: {
        text: "@Meta activation — BF reactivation core (90-180d)",
      },
      thinking: [
        {
          icon: "message-square",
          label: "Reading the selected activation",
          completedLabel: "Read the selected activation",
          durationMs: 450,
        },
      ],
      thinkingLabel: "Activation selected",
      blocks: [
        {
          type: "flow",
          flowId: "bf-meta-reactivation-core",
          step: "confirmation",
          windowDays: 180,
          confirmed: true,
          confirmedText: "Activation sent to Meta",
          savedName: "BF reactivation core (90-180d)",
          destination: "Meta",
          fieldMapping: {
            rows: [
              {
                id: "row-email",
                label: "Email",
                selected: "email_address",
                coverage: 99,
                candidates: ["email_address"],
                primary: true,
                canPrimary: true,
                removable: false,
              },
            ],
          },
          schedule: {
            mode: "one-off",
            sendNow: true,
            sendLaterDate: "2026-11-18",
            sendLaterTime: "08:30",
            recurringStartDate: "2026-11-18",
            recurringTime: "08:30",
            recurringEndType: "none",
            recurringEndDate: "2026-11-29",
          },
        },
        {
          type: "text",
          content: "What would you like to know?",
        },
      ],
    },
    {
      user: {
        text: "Tell me about this activation.",
      },
      thinking: [
        {
          icon: "database",
          label: "Pulling delivery and conversion metrics",
          completedLabel: "Pulled delivery and conversion metrics",
          durationMs: 750,
          sql: "SELECT date, spend, impressions, clicks, conversions, revenue\nFROM activation_daily_metrics\nWHERE activation_name = 'Meta activation — BF reactivation core (90-180d)'\nORDER BY date;",
        },
        {
          icon: "bar-chart-2",
          label: "Comparing against baseline prospecting",
          completedLabel: "Compared against baseline prospecting",
          durationMs: 650,
        },
      ],
      thinkingLabel: "Analysed activation performance",
      blocks: [
        {
          type: "text",
          content:
            "This activation was sent **10 days ago**, let's see how it's performed.",
        },
        {
          type: "text",
          content:
            "Here are **potential performance insights** this activation could return once reporting data comes back.",
        },
        {
          type: "chart",
          chart: {
            kind: "line",
            title: "Meta activation performance over 10 days",
            unit: "$K",
            series: ["Spend", "Revenue"],
            data: [
              { label: "D1", values: [7, 19] },
              { label: "D2", values: [8, 24] },
              { label: "D3", values: [9, 29] },
              { label: "D4", values: [8, 23] },
              { label: "D5", values: [7, 21] },
              { label: "D6", values: [6, 16] },
              { label: "D7", values: [6, 15] },
              { label: "D8", values: [5, 12] },
              { label: "D9", values: [5, 11] },
              { label: "D10", values: [4, 9] },
            ],
            caption: "Revenue stayed above spend each day, with strongest returns in the first 3 days.",
          },
        },
        {
          type: "chart",
          chart: {
            kind: "bar",
            title: "Audience efficiency comparison",
            unit: "%",
            series: ["Conversion rate", "CTR"],
            data: [
              { label: "BF core (90-180d)", values: [7.8, 2.9] },
              { label: "Broad lookalike", values: [3.7, 1.9] },
            ],
            caption: "The reactivation core delivered stronger intent and efficiency than broader targeting.",
          },
        },
        { type: "proposed", artifactId: "bf-activation-insight-roas" },
        { type: "proposed", artifactId: "bf-activation-insight-quality" },
        { type: "proposed", artifactId: "bf-activation-insight-creative" },
        {
          type: "text",
          content:
            "If you want, I can also generate a channel-by-channel breakdown (Meta placements, creative variants, and frequency fatigue signals) using the same dummy data shape.",
        },
      ],
    },
  ],
};

/** All scripted conversations, newest first. Add entries to grow the Recent list. */
export const CONVERSATIONS: Conversation[] = [
  BLACK_FRIDAY_PLANNING,
];

export const DEFAULT_CONVERSATION_ID = BLACK_FRIDAY_PLANNING.id;

// @-mention → conversation routing. When the user @mentions one of these saved
// segments from the empty start screen, that mention *is* the prompt: it starts
// the matching scripted conversation (e.g. mentioning the saved "Holiday win-back"
// segment kicks off its performance review).
export const SEGMENT_TRIGGERS: Record<string, string> = {
};

// Pins start empty and accumulate as the user highlights Lexi's replies
// (crystallisation) — see ContextPanel + CrystallisationPopover.
