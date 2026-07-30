import type { DefRef } from "@/data/def-registry";

export type DummySegmentSpec = {
  id: string;
  name: string;
  summary: string;
  purpose: string;
  population: string;
  created: string;
  lastUsed: string;
  inActivations: number;
  validation: string[];
  recommendations: string[];
  customers: Array<{ id: string; name: string; meta: string }>;
  activations: Array<{ id: string; name: string; status: string }>;
};

export const DUMMY_SEGMENTS: DummySegmentSpec[] = [
  {
    id: "seg-early-access-dummy",
    name: "Early access customers",
    summary: "Chat-confirmed early access segment for Black Friday.",
    purpose: "Prioritise high-intent customers for an early Black Friday release before broader discounting.",
    population: "3,420",
    created: "16 Jul 2026",
    lastUsed: "Just now",
    inActivations: 2,
    validation: [
      "Last order date is within the past 180 days",
      "Total spend is greater than $500",
      "Marketing consent is Opted In",
    ],
    recommendations: [
      "Launch in a 48-hour priority wave before broad discount sends",
      "Pair premium bundles with early access messaging",
      "Suppress non-engagers from the final send",
    ],
    customers: [
      { id: "c-ea-1", name: "Ava Thompson", meta: "AOV $142 · Last purchase 34 days ago" },
      { id: "c-ea-2", name: "Liam Nguyen", meta: "AOV $129 · Last purchase 49 days ago" },
      { id: "c-ea-3", name: "Mia Rodriguez", meta: "AOV $151 · Last purchase 62 days ago" },
    ],
    activations: [
      { id: "act-ea-1", name: "Early Access - Meta Wave 1", status: "Completed" },
      { id: "act-ea-2", name: "Early Access - Email Priority", status: "Scheduled" },
    ],
  },
  {
    id: "seg-reactivation-dummy",
    name: "90-180 day reactivation",
    summary: "High-intent lapsed customers who are still reachable.",
    purpose: "Reconnect recent lapsed customers while purchase intent is still recoverable.",
    population: "5,180",
    created: "16 Jul 2026",
    lastUsed: "5 min ago",
    inActivations: 1,
    validation: [
      "Days since last order is between 90 and 180",
      "Email engagement is within 60 days",
    ],
    recommendations: [
      "Start with reminder creative and stronger offer in wave 2",
      "Measure conversion in first 72 hours before scaling",
    ],
    customers: [
      { id: "c-re-1", name: "Noah Patel", meta: "LTV $980 · Last purchase 121 days ago" },
      { id: "c-re-2", name: "Ethan Lee", meta: "LTV $870 · Last purchase 109 days ago" },
      { id: "c-re-3", name: "Sophie Chen", meta: "LTV $1,040 · Last purchase 136 days ago" },
    ],
    activations: [
      { id: "act-re-1", name: "Reactivation - Meta Core", status: "Live" },
    ],
  },
  {
    id: "seg-loyalists-dummy",
    name: "VIP loyalists",
    summary: "Top-value repeat shoppers with premium propensity.",
    purpose: "Protect and grow top-tier customers with premium messaging and loyalty offers.",
    population: "1,940",
    created: "16 Jul 2026",
    lastUsed: "12 min ago",
    inActivations: 3,
    validation: [
      "L12M spend is greater than $1,200",
      "Order count in L12M is greater than 3",
    ],
    recommendations: [
      "Use premium tier messaging and low-discount framing",
      "Prioritise evening send windows",
    ],
    customers: [
      { id: "c-vip-1", name: "Olivia Park", meta: "LTV $2,410 · 6 purchases in L12M" },
      { id: "c-vip-2", name: "Lucas Martin", meta: "LTV $2,130 · 5 purchases in L12M" },
      { id: "c-vip-3", name: "Emma Diaz", meta: "LTV $2,580 · 7 purchases in L12M" },
    ],
    activations: [
      { id: "act-vip-1", name: "VIP Loyalty - Email Exclusive", status: "Completed" },
      { id: "act-vip-2", name: "VIP Loyalty - Meta Lookalike", status: "Completed" },
      { id: "act-vip-3", name: "VIP Loyalty - SMS Reminder", status: "Scheduled" },
    ],
  },
];

export const DUMMY_SEGMENT_BY_ID: Record<string, DummySegmentSpec> = Object.fromEntries(
  DUMMY_SEGMENTS.map((segment) => [segment.id, segment]),
);

export function dummySegmentToDefRef(segment: DummySegmentSpec): DefRef {
  return {
    id: segment.id,
    kind: "segment",
    name: segment.name,
    entity: "customer",
    description: segment.summary,
    logic: segment.validation.join(" AND "),
    stat: { label: "customers", value: segment.population },
  };
}
