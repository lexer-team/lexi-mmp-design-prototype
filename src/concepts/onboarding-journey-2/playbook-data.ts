/**
 * Segment - V1 — Playbook data
 *
 * The Playbook is the curated knowledge layer that governs how Lexi interprets
 * a request. It is organised by *kind of knowledge* (Glossary, Rules, Calendar,
 * Documents) rather than by team access. Mock data for the prototype.
 */

// ─── Glossary ────────────────────────────────────────────────────────────────
// Plain-language business terms. The shared vocabulary Lexi and the team use so
// a word like "active" or "lapsed" always means the same thing.

export interface GlossaryTerm {
  id: string;
  term: string;
  /** Plain-language meaning. */
  definition: string;
  category: "Lifecycle" | "Value" | "Engagement" | "Trade";
  /** Other names people use for the same thing. */
  aka?: string[];
  /** Related glossary term ids. */
  related?: string[];
  updatedAt: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "gl-active",
    term: "Active customer",
    definition:
      "Someone who has ordered in the last 12 months. Unless a request names a different window, “active” always means the last 12 months.",
    category: "Lifecycle",
    aka: ["Active", "Recently purchased"],
    related: ["gl-lapsed", "gl-new"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-new",
    term: "New customer",
    definition: "A customer whose first-ever order was within the last 12 months.",
    category: "Lifecycle",
    aka: ["First-timer"],
    related: ["gl-active", "gl-returning"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-returning",
    term: "Returning customer",
    definition:
      "Ordered in the last 12 months, but their first order was more than 12 months ago.",
    category: "Lifecycle",
    related: ["gl-new", "gl-active"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-lapsed",
    term: "Lapsed customer",
    definition:
      "No purchase for more than 6 months. “Deep lapsed” means no purchase for more than 24 months — the reactivation window.",
    category: "Lifecycle",
    aka: ["Dormant", "Churn risk"],
    related: ["gl-active"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-tier",
    term: "Lifestyle Club tier",
    definition:
      "Five loyalty tiers based on last-12-month spend: Normals, Value, Vitals, High Vitals, Pinnacles.",
    category: "Value",
    aka: ["Loyalty tier", "Pinnacle / Vitals"],
    related: ["gl-l12m"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-l12m",
    term: "L12M spend",
    definition:
      "Total revenue across all orders in the last 12 months. The basis for loyalty tiers.",
    category: "Value",
    aka: ["Last-12-month spend"],
    related: ["gl-tier", "gl-decile"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-decile",
    term: "Spend decile",
    definition: "A customer's rank from 1–10 by total spend. Decile 10 is the top 10%.",
    category: "Value",
    related: ["gl-l12m"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-email-engaged",
    term: "Email engaged",
    definition: "Opened or clicked a marketing email within the last 60 days.",
    category: "Engagement",
    aka: ["Engaged"],
    related: ["gl-subscribed"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-subscribed",
    term: "Email subscribed",
    definition: "Has an active email subscription — opted in and not suppressed.",
    category: "Engagement",
    aka: ["Opted in", "Marketable"],
    related: ["gl-email-engaged"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-omnichannel",
    term: "Omnichannel",
    definition: "Has purchased both online and in-store, rather than through one channel only.",
    category: "Engagement",
    related: [],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-key-sale",
    term: "Key sale period",
    definition:
      "November–December — the peak trading window. “Key Sales Customers” are top-half spenders who ordered during it.",
    category: "Trade",
    related: ["gl-trade-week"],
    updatedAt: "2026-06-22",
  },
  {
    id: "gl-trade-week",
    term: "Trade week",
    definition: "A rolling 7-day window (Monday–Sunday) used for weekly trade reporting.",
    category: "Trade",
    related: ["gl-key-sale"],
    updatedAt: "2026-06-22",
  },
];

export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.id === id);
}

// ─── Rules ───────────────────────────────────────────────────────────────────
// Plain-text rules and guardrails. How Lexi should read and build a request.

export interface PlaybookRule {
  id: string;
  name: string;
  /** The rule itself, in plain text. */
  statement: string;
  /** Why the rule exists / extra context. */
  rationale?: string;
  source?: string;
  updatedAt: string;
}

export const RULES: PlaybookRule[] = [
  {
    id: "rl-lifetime",
    name: "Default to lifetime metrics",
    statement:
      "When no time window is given, use lifetime (all-time) totals. Only apply a time filter when the request explicitly names a period.",
    rationale: "Keeps ambiguous asks consistent and avoids silently narrowing an audience.",
    source: "Query-interpretation rules",
    updatedAt: "2026-06-22",
  },
  {
    id: "rl-active",
    name: "Active means the last 12 months",
    statement:
      "“Active customers” always means customers who ordered in the last 12 months. This overrides the default lifetime window.",
    source: "Query-interpretation rules",
    updatedAt: "2026-06-22",
  },
  {
    id: "rl-tier",
    name: "Tiers use last-12-month spend",
    statement:
      "Lifestyle Club tiers (Normals, Value, Vitals, High Vitals, Pinnacles) are always calculated on last-12-month spend, never lifetime spend.",
    source: "Loyalty program",
    updatedAt: "2026-06-22",
  },
  {
    id: "rl-exclude-employees",
    name: "Exclude employees",
    statement:
      "Suppress employee profiles from every marketing segment, unless the request is explicitly about employees.",
    rationale: "Staff purchases distort marketing audiences and reporting.",
    source: "Common filter",
    updatedAt: "2026-06-22",
  },
  {
    id: "rl-customer-exists",
    name: "Customer must exist",
    statement:
      "Apply to every query: a profile must have at least one event or purchase to be included.",
    source: "Common filter",
    updatedAt: "2026-06-22",
  },
  {
    id: "rl-churn",
    name: "Churn window",
    statement: "Treat 180 days with no purchase as the trigger for churn classification.",
    source: "Confirmed during onboarding",
    updatedAt: "2026-05-20",
  },
  {
    id: "rl-email-fatigue",
    name: "Email fatigue threshold",
    statement: "Send a customer no more than 3 marketing emails per week.",
    rationale: "Protects deliverability and reduces unsubscribes.",
    source: "Set by Marketing team",
    updatedAt: "2026-05-28",
  },
  {
    id: "rl-cooldown",
    name: "Campaign cool-down",
    statement: "Leave at least 7 days between major campaigns to the same audience.",
    source: "Inferred from historical campaign spacing",
    updatedAt: "2026-06-03",
  },
  {
    id: "rl-roas",
    name: "ROAS target",
    statement: "Aim for a return on ad spend of at least 4.0x on paid campaigns.",
    source: "Set by Performance team",
    updatedAt: "2026-05-30",
  },
];

export function getRule(id: string): PlaybookRule | undefined {
  return RULES.find((r) => r.id === id);
}

// ─── Calendar ──────────────────────────────────────────────────────────────
// Upcoming trade and campaign events Lexi factors in when reasoning about timing.

export type EventCategory = "Sale" | "Campaign" | "Seasonal" | "Trade";

export interface CalendarEvent {
  id: string;
  name: string;
  /** Inclusive ISO start date (YYYY-MM-DD). */
  start: string;
  /** Inclusive ISO end date (YYYY-MM-DD). */
  end: string;
  category: EventCategory;
  description: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "ev-eofy",
    name: "EOFY Sale",
    start: "2026-06-20",
    end: "2026-06-30",
    category: "Sale",
    description: "End-of-financial-year clearance across full-price and markdown stock.",
  },
  {
    id: "ev-stocktake",
    name: "Winter stocktake",
    start: "2026-07-13",
    end: "2026-07-19",
    category: "Trade",
    description: "Inventory count week — limited markdown activity and paused new drops.",
  },
  {
    id: "ev-spring",
    name: "Spring collection launch",
    start: "2026-09-01",
    end: "2026-09-13",
    category: "Seasonal",
    description: "New season range goes live online and in store with a supporting campaign.",
  },
  {
    id: "ev-loyalty",
    name: "Pinnacle early access",
    start: "2026-10-15",
    end: "2026-10-18",
    category: "Campaign",
    description: "Top-tier loyalty members get first access to the season sale.",
  },
  {
    id: "ev-key-sale",
    name: "Key sale period",
    start: "2026-11-01",
    end: "2026-12-31",
    category: "Trade",
    description: "Peak trading window. Key Sales Customers are top-half spenders who order in it.",
  },
  {
    id: "ev-bfcm",
    name: "Black Friday / Cyber Monday",
    start: "2026-11-27",
    end: "2026-11-30",
    category: "Sale",
    description: "Largest promotional event of the year across all channels.",
  },
  {
    id: "ev-boxing",
    name: "Boxing Day sale",
    start: "2026-12-26",
    end: "2027-01-05",
    category: "Sale",
    description: "Post-Christmas clearance running into the new year.",
  },
];

export function getCalendarEvent(id: string): CalendarEvent | undefined {
  return CALENDAR_EVENTS.find((e) => e.id === id);
}

// ─── Documents ─────────────────────────────────────────────────────────────
// Company documents, briefs and templates the team uploads for Lexi to ground in.

export type DocKind = "Brief" | "Guideline" | "Template" | "Policy" | "Report";
export type DocFileType = "PDF" | "DOCX" | "XLSX" | "PPTX" | "Figma";

export interface PlaybookDoc {
  id: string;
  name: string;
  kind: DocKind;
  fileType: DocFileType;
  size: string;
  uploadedBy: string;
  updatedAt: string;
  description: string;
}

export const DOCUMENTS: PlaybookDoc[] = [
  {
    id: "doc-brand",
    name: "Brand guidelines 2026",
    kind: "Guideline",
    fileType: "PDF",
    size: "8.4 MB",
    uploadedBy: "Sarah Chen",
    updatedAt: "2026-05-02",
    description: "Voice, tone, logo usage and colour palette for all customer-facing work.",
  },
  {
    id: "doc-winback-brief",
    name: "Holiday win-back brief",
    kind: "Brief",
    fileType: "DOCX",
    size: "240 KB",
    uploadedBy: "Marcus Lee",
    updatedAt: "2026-06-10",
    description: "Objectives, audience and offer strategy for the holiday win-back campaign.",
  },
  {
    id: "doc-email-template",
    name: "Email campaign template",
    kind: "Template",
    fileType: "Figma",
    size: "—",
    uploadedBy: "Priya Nair",
    updatedAt: "2026-04-18",
    description: "Master Figma layout for promotional emails, with modular content blocks.",
  },
  {
    id: "doc-discount-policy",
    name: "Discount & markdown policy",
    kind: "Policy",
    fileType: "PDF",
    size: "1.1 MB",
    uploadedBy: "Sarah Chen",
    updatedAt: "2026-03-29",
    description: "Approval thresholds and guardrails for discounting hero and full-price SKUs.",
  },
  {
    id: "doc-season-plan",
    name: "Season trade plan",
    kind: "Report",
    fileType: "XLSX",
    size: "620 KB",
    uploadedBy: "Marcus Lee",
    updatedAt: "2026-06-05",
    description: "Week-by-week trade and campaign calendar with revenue targets.",
  },
  {
    id: "doc-launch-deck",
    name: "Spring launch deck",
    kind: "Brief",
    fileType: "PPTX",
    size: "5.2 MB",
    uploadedBy: "Priya Nair",
    updatedAt: "2026-06-19",
    description: "Creative direction and channel plan for the spring collection launch.",
  },
];
