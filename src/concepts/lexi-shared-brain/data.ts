import { RiGroupLine, RiPriceTag3Line, RiShoppingBag2Line } from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";

export type OutputEntity = "customer" | "product" | "order";

export interface Usage {
  id: string;
  name: string;
}

export interface Criterion {
  id: string;
  mode: "include" | "exclude";
  detail: string;
  lead?: string;
  definitionId?: string;
  ruleId?: string;
  groupRefId?: string;
  operator?: string;
  value?: string;
}

export interface BrainRule {
  id: string;
  name: string;
  dateRange?: { start: string; end: string };
  threshold?: number;
}

export interface BrainGroup {
  id: string;
  name: string;
  outputEntity: OutputEntity;
  summary: string;
  criteria: Criterion[];
  population: number;
  status: "active" | "draft";
  scope: "personal" | "team";
  owner: string;
  updatedAt: string;
  folder: string;
  labels: string[];
  purpose?: string;
  usedBy?: Usage[];
}

export const ENTITY_META: Record<OutputEntity, { tab: string; noun: string; unit: string; icon: RemixiconComponentType }> = {
  customer: { tab: "Customers", noun: "customer", unit: "customers", icon: RiGroupLine },
  product: { tab: "Products", noun: "product", unit: "products", icon: RiShoppingBag2Line },
  order: { tab: "Orders", noun: "order", unit: "orders", icon: RiPriceTag3Line },
};

const RULES: BrainRule[] = [
  { id: "rule-bf-window", name: "Black Friday period", dateRange: { start: "2026-11-27", end: "2026-11-30" } },
  { id: "rule-contact-cooldown", name: "Contact cool-down", threshold: 7 },
];

function makeGroup(group: Omit<BrainGroup, "status" | "scope" | "owner" | "updatedAt" | "labels">): BrainGroup {
  return {
    status: "active",
    scope: "team",
    owner: "Lifecycle team",
    updatedAt: "2026-07-01",
    labels: [],
    ...group,
  };
}

export const BRAIN_GROUPS: BrainGroup[] = [
  makeGroup({
    id: "g-vip-at-risk",
    name: "VIP at risk",
    outputEntity: "customer",
    summary: "High-value customers with no recent purchase.",
    folder: "Lifecycle",
    population: 1820,
    criteria: [
      { id: "c1", mode: "include", detail: "No purchase in last 90 days", definitionId: "def-3" },
      { id: "c2", mode: "include", detail: "High lifetime value", definitionId: "def-1" },
    ],
  }),
  makeGroup({
    id: "g-hero-winback",
    name: "Hero win-back",
    outputEntity: "customer",
    summary: "Lapsed but high-intent audience for reactivation.",
    folder: "Lifecycle",
    population: 6400,
    criteria: [
      { id: "c3", mode: "include", detail: "Last order more than 120 days ago", definitionId: "def-bi-lapsed-6m" },
      { id: "c4", mode: "include", detail: "Email subscribed", definitionId: "def-bi-subscribed" },
    ],
  }),
  makeGroup({
    id: "g-loyalty-gold",
    name: "Loyalty gold",
    outputEntity: "customer",
    summary: "Top-tier loyalty customers.",
    folder: "Loyalty",
    population: 1120,
    criteria: [
      { id: "c5", mode: "include", detail: "Lifestyle Club tier = High Vitals", definitionId: "def-5" },
    ],
  }),
  makeGroup({
    id: "g-new-high-potential",
    name: "New high potential",
    outputEntity: "customer",
    summary: "New customers with strong first-order signals.",
    folder: "Acquisition",
    population: 2560,
    criteria: [
      { id: "c6", mode: "include", detail: "First order within last 30 days", definitionId: "def-20" },
      { id: "c7", mode: "include", detail: "Order margin above threshold", definitionId: "def-21" },
    ],
  }),
  makeGroup({
    id: "g-reengagement",
    name: "Re-engagement",
    outputEntity: "customer",
    summary: "Dormant users suited for reminder campaigns.",
    folder: "Lifecycle",
    population: 4210,
    criteria: [
      { id: "c8", mode: "include", detail: "No purchase in 180+ days", definitionId: "def-3" },
      { id: "c9", mode: "include", detail: "Email engaged in last 60 days", definitionId: "def-bi-email-engaged" },
    ],
  }),
  makeGroup({
    id: "g-eofy-vip",
    name: "EOFY VIP",
    outputEntity: "customer",
    summary: "VIP audience for EOFY campaigns.",
    folder: "Seasonal",
    population: 980,
    criteria: [
      { id: "c10", mode: "include", detail: "In top spend decile", definitionId: "def-bi-spend-decile" },
      { id: "c11", mode: "include", detail: "Purchased in EOFY window", ruleId: "rule-bf-window" },
    ],
  }),
  makeGroup({
    id: "g-bfcm",
    name: "BFCM core",
    outputEntity: "customer",
    summary: "Core Black Friday/Cyber Monday audience.",
    folder: "Seasonal",
    population: 52000,
    criteria: [
      { id: "c12", mode: "include", detail: "Lapsed 90-180 days", definitionId: "def-2" },
      { id: "c13", mode: "include", detail: "Consent available", definitionId: "def-bi-subscribed" },
    ],
  }),
  makeGroup({
    id: "g-upsell",
    name: "Upsell candidates",
    outputEntity: "customer",
    summary: "Customers likely to buy adjacent products.",
    folder: "Value",
    population: 3420,
    criteria: [
      { id: "c14", mode: "include", detail: "Average order value above $150", definitionId: "def-7", operator: "is greater than", value: "$150" },
    ],
  }),
  makeGroup({
    id: "g-markdown",
    name: "Markdown seekers",
    outputEntity: "customer",
    summary: "Customers responsive to discount-led campaigns.",
    folder: "Value",
    population: 2780,
    criteria: [
      { id: "c15", mode: "include", detail: "Average discount above 20%", definitionId: "def-bi-avg-discount", operator: "is greater than", value: "20%" },
    ],
  }),
  makeGroup({
    id: "g-eofy-first",
    name: "EOFY first buyers",
    outputEntity: "customer",
    summary: "First-purchase customers during EOFY period.",
    folder: "Seasonal",
    population: 1650,
    criteria: [
      { id: "c16", mode: "include", detail: "First order in EOFY window", definitionId: "def-20" },
    ],
  }),
  makeGroup({
    id: "g-high-margin",
    name: "High margin",
    outputEntity: "order",
    summary: "Orders with strong margin performance.",
    folder: "Performance",
    population: 930,
    criteria: [
      { id: "c17", mode: "include", detail: "Order margin > 60%", definitionId: "def-21" },
    ],
  }),
  makeGroup({
    id: "g-bi-fullprice",
    name: "Full price loyalists",
    outputEntity: "customer",
    summary: "Loyal shoppers with low discount dependence.",
    folder: "Loyalty",
    population: 3310,
    criteria: [
      { id: "c18", mode: "include", detail: "Average discount below 5%", definitionId: "def-bi-avg-discount", operator: "is less than", value: "5%" },
    ],
  }),
  makeGroup({
    id: "g-bi-email-eng",
    name: "Email engaged",
    outputEntity: "customer",
    summary: "Recently engaged email audience.",
    folder: "Engagement",
    population: 6040,
    criteria: [
      { id: "c19", mode: "include", detail: "Opened or clicked in last 60 days", definitionId: "def-bi-email-engaged" },
    ],
  }),
  makeGroup({
    id: "g-bi-high-disc",
    name: "High discount affinity",
    outputEntity: "customer",
    summary: "Customers who respond to strong discounting.",
    folder: "Value",
    population: 2890,
    criteria: [
      { id: "c20", mode: "include", detail: "Average discount above 30%", definitionId: "def-bi-avg-discount", operator: "is greater than", value: "30%" },
    ],
  }),
  makeGroup({
    id: "g-bi-hv-lapsed",
    name: "High-value lapsed",
    outputEntity: "customer",
    summary: "Top-value audience that has lapsed.",
    folder: "Lifecycle",
    population: 1450,
    criteria: [
      { id: "c21", mode: "include", detail: "No purchase in 180+ days", definitionId: "def-3" },
      { id: "c22", mode: "include", detail: "Top spend decile", definitionId: "def-bi-spend-decile" },
    ],
  }),
  makeGroup({
    id: "g-bi-new",
    name: "New customers",
    outputEntity: "customer",
    summary: "Customers within first 12 months.",
    folder: "Acquisition",
    population: 6540,
    criteria: [
      { id: "c23", mode: "include", detail: "First order within 12 months", definitionId: "def-bi-new" },
    ],
  }),
  makeGroup({
    id: "g-bi-lapsed6",
    name: "Lapsed subscribed",
    outputEntity: "customer",
    summary: "Lapsed audience still opted into email.",
    folder: "Lifecycle",
    population: 3328,
    criteria: [
      { id: "c24", mode: "include", detail: "No order in last 6 months", definitionId: "def-bi-lapsed-6m" },
      { id: "c25", mode: "include", detail: "Email subscription status = Subscribed", definitionId: "def-bi-subscribed" },
    ],
  }),
  makeGroup({
    id: "bfs1",
    name: "BF reactivation core (90-180d)",
    outputEntity: "customer",
    summary: "Core BF reactivation audience.",
    folder: "Seasonal",
    population: 52000,
    criteria: [
      { id: "c26", mode: "include", detail: "Last purchase between 90 and 180 days", definitionId: "def-2" },
    ],
  }),
  makeGroup({
    id: "bfs2",
    name: "BF high-value reactivation",
    outputEntity: "customer",
    summary: "High-value BF reactivation audience.",
    folder: "Seasonal",
    population: 12400,
    criteria: [
      { id: "c27", mode: "include", detail: "Top value and lapsed", definitionId: "def-1" },
    ],
  }),
  makeGroup({
    id: "bfs3",
    name: "BF mid-value reactivation",
    outputEntity: "customer",
    summary: "Mid-value BF reactivation audience.",
    folder: "Seasonal",
    population: 28600,
    criteria: [
      { id: "c28", mode: "include", detail: "Mid value and lapsed", definitionId: "def-7" },
    ],
  }),
];

export function getRule(id: string): BrainRule | undefined {
  return RULES.find((rule) => rule.id === id);
}

export function getBrainGroup(id: string): BrainGroup | undefined {
  return BRAIN_GROUPS.find((group) => group.id === id);
}

export function foldersForEntity(entity: OutputEntity): string[] {
  const groups = BRAIN_GROUPS.filter((group) => group.outputEntity === entity);
  return Array.from(new Set(groups.map((group) => group.folder)));
}

export function groupsForEntity(entity: OutputEntity): BrainGroup[] {
  return BRAIN_GROUPS.filter((group) => group.outputEntity === entity);
}
