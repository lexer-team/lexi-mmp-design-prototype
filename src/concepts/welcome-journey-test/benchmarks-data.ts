import type { EntityType } from "@/data/definitions-mock";

export type BenchmarkDirection = "higher" | "lower";

export interface BenchmarkItem {
  id: string;
  name: string;
  entity: EntityType;
  metricId: string;
  definitionId: string;
  direction: BenchmarkDirection;
  targetValue: string;
  currentValue: string;
  period: string;
  owner: string;
  updatedAt: string;
  note: string;
  tracking: Array<{ label: string; value: string }>;
  examples: string[];
}

export const BENCHMARKS: BenchmarkItem[] = [
  {
    id: "bm-customer-ltv-pinnacle",
    name: "Pinnacle value floor",
    entity: "customer",
    metricId: "met-2",
    definitionId: "def-5",
    direction: "higher",
    targetValue: "$1,500",
    currentValue: "$1,420",
    period: "Last 12 months",
    owner: "Lifecycle",
    updatedAt: "2 days ago",
    note: "Tracks whether top-tier loyalty customers maintain expected annual value.",
    tracking: [
      { label: "Source", value: "Weekly warehouse sync" },
      { label: "Cadence", value: "Weekly" },
      { label: "Dashboard", value: "Loyalty Performance Board" },
    ],
    examples: [
      "Used in monthly retention review to decide VIP offer thresholds.",
      "Referenced before approving premium bundle discounts.",
    ],
  },
  {
    id: "bm-customer-engagement-winback",
    name: "Win-back engagement baseline",
    entity: "customer",
    metricId: "met-10",
    definitionId: "def-bi-email-engaged",
    direction: "higher",
    targetValue: "35%",
    currentValue: "31%",
    period: "Rolling 60 days",
    owner: "CRM",
    updatedAt: "4 days ago",
    note: "Measures engaged subscriber quality before launching reactivation campaigns.",
    tracking: [
      { label: "Source", value: "ESP events pipeline" },
      { label: "Cadence", value: "Daily" },
      { label: "Dashboard", value: "Engagement Health Monitor" },
    ],
    examples: [
      "Checked before each Black Friday warm-up send.",
      "Used to suppress low-intent audiences from high-cost channels.",
    ],
  },
  {
    id: "bm-customer-return-pressure",
    name: "Return pressure guardrail",
    entity: "customer",
    metricId: "met-8",
    definitionId: "def-bi-returning",
    direction: "lower",
    targetValue: "12%",
    currentValue: "14.8%",
    period: "Last 90 days",
    owner: "Merchandise",
    updatedAt: "Yesterday",
    note: "Used to flag quality drift in returning-customer cohorts.",
    tracking: [
      { label: "Source", value: "Returns + order facts" },
      { label: "Cadence", value: "Daily" },
      { label: "Dashboard", value: "Returns Risk Tracker" },
    ],
    examples: [
      "Triggers SKU-level quality review when benchmark drifts for 2 consecutive weeks.",
      "Used in post-campaign analysis for loyalty cohorts.",
    ],
  },
  {
    id: "bm-product-hero-sellthrough",
    name: "Hero SKU sell-through",
    entity: "product",
    metricId: "met-9",
    definitionId: "def-10",
    direction: "higher",
    targetValue: "72%",
    currentValue: "68%",
    period: "Current season",
    owner: "Buying",
    updatedAt: "1 week ago",
    note: "Validates hero products are moving at expected velocity during seasonal launch windows.",
    tracking: [
      { label: "Source", value: "Inventory and sales mart" },
      { label: "Cadence", value: "Twice weekly" },
      { label: "Dashboard", value: "Hero Product Pulse" },
    ],
    examples: [
      "Used to trigger replenishment decisions during launch week.",
      "Guides paid amplification for top-performing hero SKUs.",
    ],
  },
  {
    id: "bm-product-margin-floor",
    name: "High-margin order contribution",
    entity: "product",
    metricId: "met-9",
    definitionId: "def-21",
    direction: "higher",
    targetValue: "65%",
    currentValue: "61%",
    period: "Quarter to date",
    owner: "Finance",
    updatedAt: "3 days ago",
    note: "Ensures markdown strategy does not materially erode high-margin contribution.",
    tracking: [
      { label: "Source", value: "Margin ledger model" },
      { label: "Cadence", value: "Weekly" },
      { label: "Dashboard", value: "Margin Guardrails" },
    ],
    examples: [
      "Used before approving markdown depth for seasonal clearance.",
      "Flags campaigns that over-index on low-margin products.",
    ],
  },
];
