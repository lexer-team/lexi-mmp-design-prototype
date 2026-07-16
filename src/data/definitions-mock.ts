// ─── Types ───────────────────────────────────────────────────────────────────

export type EntityType = "customer" | "product" | "order";
export type Status = "confirmed" | "inferred" | "gap";
export type Scope = "org" | "team" | "personal";

export type DefinitionType = "attribute" | "metric";
export type PreferenceType = "calendar" | "rule" | "guideline" | "freetext";
export type MappingType = "direct" | "aggregation" | "derived" | "platform";

export interface Definition {
  id: string;
  name: string;
  type: DefinitionType;
  entity: EntityType;
  description: string;
  status: Status;
  scope: Scope;
  source?: string;
  logic?: string;
  count?: number;
  updatedAt?: string;
  sql?: string;
  dataType?: "boolean" | "numeric" | "categorical" | "date" | "text";
  possibleValues?: string[];
  category?: string;
  athenaColumn?: string;
  mappingType?: MappingType;
}

export interface FilterRow {
  field: string;
  fieldType: "metric" | "attribute";
  operator: string;
  value: string;
}

export interface FilterGroup {
  connector: "AND" | "OR";
  rows: FilterRow[];
}

export interface Activation {
  id: string;
  name: string;
  channel: "email" | "sms" | "push" | "paid-social";
  lastSent?: string;
  status: "active" | "paused" | "completed";
}

export interface SampleUser {
  id: string;
  name: string;
  email: string;
  ltv: number;
  lastPurchase: string;
  tier: string;
}

export interface SampleProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  sellThrough?: number;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  category: string;
  filters: FilterGroup;
  sql: string;
  population: number;
  populationGrowth: number;
  status: "active" | "draft" | "archived";
  owner: string;
  createdAt: string;
  updatedAt: string;
  activations: Activation[];
  sampleUsers: SampleUser[];
  usedMetrics: string[];
  usedAttributes: string[];
}

export interface ProductGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  filters: FilterGroup;
  sql: string;
  productCount: number;
  status: "active" | "draft";
  owner: string;
  createdAt: string;
  updatedAt: string;
  sampleProducts: SampleProduct[];
  usedMetrics: string[];
  usedAttributes: string[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  definitionIds: string[];
  preferenceIds: string[];
  logic?: string;
  outputEntity: EntityType;
  count?: number;
  lastUsed?: string;
}

export interface PlaybookEntry {
  id: string;
  name: string;
  type: PreferenceType;
  description: string;
  scope: Scope;
  status: Status;
  value?: string;
  dateRange?: { start: string; end: string };
  threshold?: number;
  source?: string;
  updatedAt?: string;
}

export interface KnowledgeStore {
  definitions: Definition[];
  groups: Group[];
  playbook: PlaybookEntry[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const MOCK_DEFINITIONS: Definition[] = [
  // Customer attributes
  {
    id: "def-1",
    name: "High-value",
    type: "attribute",
    entity: "customer",
    description: "Lifetime value greater than $500",
    status: "confirmed",
    scope: "org",
    source: "Mapped from CDP attribute: customer_ltv",
    logic: "LTV > $500",
    count: 12340,
    updatedAt: "2025-06-05",
  },
  {
    id: "def-2",
    name: "Active",
    type: "attribute",
    entity: "customer",
    description: "Ordered within the last 12 months (Blue Illusion 'active' definition)",
    status: "confirmed",
    scope: "org",
    source: "Query-interpretation rule: 'active' always means ordered in the last 12 months",
    logic: "last_order_date > now() - 12 months",
    count: 52100,
    updatedAt: "2026-06-22",
  },
  {
    id: "def-3",
    name: "Churned",
    type: "attribute",
    entity: "customer",
    description: "No purchase in 180 days",
    status: "inferred",
    scope: "org",
    source: "Inferred from segment usage patterns",
    logic: "last_purchase_date < now() - 180d",
    count: 8920,
    updatedAt: "2025-06-01",
  },
  {
    id: "def-4",
    name: "VIP",
    type: "attribute",
    entity: "customer",
    description: "",
    status: "gap",
    scope: "org",
  },
  {
    id: "def-5",
    name: "Lifestyle Club Tier",
    type: "attribute",
    entity: "customer",
    description: "Five loyalty tiers based on last-12-month spend: Normals, Value, Vitals, High Vitals, Pinnacles",
    status: "confirmed",
    scope: "org",
    source: "Blue Illusion loyalty program; tiers always computed on L12M spend",
    logic: "Normals $0.10–99, Value $100–499, Vitals $500–999, High Vitals $1000–1499, Pinnacles $1500+ (L12M spend)",
    count: 28400,
    updatedAt: "2026-06-22",
    dataType: "categorical",
    possibleValues: ["Normals", "Value", "Vitals", "High Vitals", "Pinnacles"],
  },
  // Customer metrics
  {
    id: "def-6",
    name: "LTV",
    type: "metric",
    entity: "customer",
    description: "Total order value across customer lifetime",
    status: "confirmed",
    scope: "org",
    source: "Mapped from CDP attribute: customer_ltv",
    updatedAt: "2025-05-20",
  },
  {
    id: "def-7",
    name: "AOV",
    type: "metric",
    entity: "customer",
    description: "Average order value across all transactions",
    status: "confirmed",
    scope: "org",
    source: "Mapped from CDP attribute: avg_order_value",
    updatedAt: "2025-05-20",
  },
  // Product attributes
  {
    id: "def-10",
    name: "Hero SKU",
    type: "attribute",
    entity: "product",
    description: "Top 5% of products by revenue contribution",
    status: "confirmed",
    scope: "org",
    source: "Confirmed during onboarding",
    logic: "revenue_rank <= percentile(5)",
    count: 34,
    updatedAt: "2025-05-20",
  },
  {
    id: "def-11",
    name: "Seasonal",
    type: "attribute",
    entity: "product",
    description: "Available for less than 6 months per year",
    status: "inferred",
    scope: "org",
    source: "Inferred from product availability data",
    logic: "availability_months < 6",
    count: 89,
    updatedAt: "2025-06-02",
  },
  // Product metrics
  {
    id: "def-12",
    name: "Sell-through rate",
    type: "metric",
    entity: "product",
    description: "Units sold divided by units received",
    status: "confirmed",
    scope: "org",
    source: "Mapped from inventory data",
    updatedAt: "2025-05-22",
  },
  // Order attributes
  {
    id: "def-20",
    name: "First purchase",
    type: "attribute",
    entity: "order",
    description: "Order is the customer's first ever transaction",
    status: "confirmed",
    scope: "org",
    source: "Derived from order sequence",
    logic: "order_number = 1",
    count: 31200,
    updatedAt: "2025-05-20",
  },
  {
    id: "def-21",
    name: "High-margin",
    type: "attribute",
    entity: "order",
    description: "Order margin exceeds 60%",
    status: "inferred",
    scope: "org",
    source: "Inferred from margin distribution",
    logic: "margin > 60%",
    count: 5600,
    updatedAt: "2025-06-03",
  },

  // ─── Blue Illusion semantic layer ─────────────────────────────────────────
  // Imported from the Blue Illusion context layer. Metrics + attributes the
  // BI segments compose from, plus the lifecycle/value/behaviour terms Lexi
  // reasons over. See segment-v1/BLUE-ILLUSION-MAPPING.md.

  // Value / spend metrics
  {
    id: "def-bi-l12m-spend", name: "L12M spend", type: "metric", entity: "customer",
    description: "Revenue across all orders in the last 12 months. Drives Lifestyle Club tiers.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "SUM(line_revenue) WHERE is_purchase AND action_at >= now() - 12 months",
    count: 61200, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-spend-decile", name: "Spend decile", type: "metric", entity: "customer",
    description: "Customer rank 1–10 by total spend. Decile 10 = top 10%.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "NTILE(10) OVER (ORDER BY total_spend)", updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-avg-discount", name: "Average discount level", type: "metric", entity: "customer",
    description: "Average discount % across a customer's purchase line items. Basis for discount-behaviour tiers.",
    status: "confirmed", scope: "org", source: "Derived from price_paid vs full_price",
    logic: "AVG(1 - price_paid / full_price) * 100", updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-return-rate", name: "Return rate", type: "metric", entity: "customer",
    description: "Items returned / items purchased, as a percentage.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "items_returned / items_purchased * 100", updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-l12m-orders", name: "L12M order count", type: "metric", entity: "customer",
    description: "Distinct orders in the last 12 months. 2+ = frequent purchaser.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "COUNT(DISTINCT order_id) WHERE action_at >= now() - 12 months", updatedAt: "2026-06-22",
  },

  // Lifecycle / recency terms
  {
    id: "def-bi-new", name: "New customer", type: "attribute", entity: "customer",
    description: "First-ever order was within the last 12 months.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "first_order_date >= now() - 12 months", count: 18400, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-returning", name: "Returning customer", type: "attribute", entity: "customer",
    description: "Ordered in the last 12 months but first order was more than 12 months ago.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "last_order_date >= now() - 12 months AND first_order_date < now() - 12 months",
    count: 33700, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-lapsed-6m", name: "Lapsed 6 months", type: "attribute", entity: "customer",
    description: "Most recent purchase was more than 6 months ago.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "last_order_date < now() - 6 months", count: 41200, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-lapsed-24m", name: "Lapsed 24 months", type: "attribute", entity: "customer",
    description: "Most recent purchase was more than 24 months ago. Deep lapse / reactivation window.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "last_order_date < now() - 24 months", count: 22900, updatedAt: "2026-06-22",
  },

  // Channel / engagement / behaviour attributes
  {
    id: "def-bi-channel-mix", name: "Channel mix", type: "attribute", entity: "customer",
    description: "Whether a customer has bought online only, in-store only, or both (omnichannel).",
    status: "confirmed", scope: "org", source: "Derived from per-order channel",
    logic: "rollup of order channels per customer", updatedAt: "2026-06-22",
    dataType: "categorical", possibleValues: ["Online only", "Offline only", "Omnichannel"],
  },
  {
    id: "def-bi-store-type", name: "Store type", type: "attribute", entity: "order",
    description: "Whether an order was placed at own retail, a David Jones concession (dj …), or online.",
    status: "confirmed", scope: "org", source: "Derived from store_name prefix",
    logic: "CASE WHEN store_name LIKE 'dj %' THEN 'DJ Concession' WHEN store_name IN (online stores) THEN 'Online' ELSE 'Own Retail' END",
    updatedAt: "2026-06-22",
    dataType: "categorical", possibleValues: ["Own Retail", "DJ Concession", "Online"],
  },
  {
    id: "def-bi-email-engaged", name: "Email engaged", type: "attribute", entity: "customer",
    description: "Opened or clicked a marketing email within a window (default 60 days).",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "email_open OR email_click WITHIN 60 days", count: 29800, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-subscribed", name: "Email subscribed", type: "attribute", entity: "customer",
    description: "Active email subscription (opted in, not suppressed).",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    logic: "subscription_status = 'Subscribed'", count: 88600, updatedAt: "2026-06-22",
  },
  {
    id: "def-bi-country", name: "Country", type: "attribute", entity: "customer",
    description: "Customer market — Australia (primary), New Zealand, or United States.",
    status: "confirmed", scope: "org", source: "Blue Illusion context layer",
    updatedAt: "2026-06-22",
    dataType: "categorical", possibleValues: ["Australia", "New Zealand", "United States"],
  },
  {
    id: "def-bi-employee", name: "Employee", type: "attribute", entity: "customer",
    description: "Staff profile. Suppressed from all marketing segments by the exclude-employees common filter.",
    status: "confirmed", scope: "org", source: "Blue Illusion common filter",
    logic: "employee_flag = true", count: 320, updatedAt: "2026-06-22",
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: "grp-1",
    name: "VIP At-Risk",
    description: "High-value customers who haven't purchased recently",
    definitionIds: ["def-1", "def-3"],
    preferenceIds: ["pb-1"],
    logic: "High-value AND Churned",
    outputEntity: "customer",
    count: 890,
    lastUsed: "Today",
  },
  {
    id: "grp-2",
    name: "Loyalty Gold",
    description: "Top-tier loyalty members",
    definitionIds: ["def-5"],
    preferenceIds: [],
    logic: "Loyalty Tier = Gold",
    outputEntity: "customer",
    count: 4821,
    lastUsed: "Yesterday",
  },
  {
    id: "grp-3",
    name: "New High-Potential",
    description: "Recent customers with above-average spend",
    definitionIds: ["def-2", "def-7"],
    preferenceIds: [],
    logic: "Active AND AOV > $150 AND first_purchase < 30 days",
    outputEntity: "customer",
    count: 156,
    lastUsed: "Jun 3",
  },
  {
    id: "grp-4",
    name: "Upsell Candidates",
    description: "Hero SKUs with high margin potential",
    definitionIds: ["def-10", "def-21"],
    preferenceIds: [],
    logic: "Hero SKU AND margin > 60%",
    outputEntity: "product",
    count: 34,
    lastUsed: "Jun 1",
  },
  {
    id: "grp-5",
    name: "Re-engagement pool",
    description: "Churned customers with high prior AOV",
    definitionIds: ["def-3", "def-7"],
    preferenceIds: ["pb-2"],
    logic: "Churned AND AOV > $120 AND NOT campaign_cooldown",
    outputEntity: "customer",
    count: 2340,
    lastUsed: "Jun 4",
  },
];

export const MOCK_PLAYBOOK: PlaybookEntry[] = [
  // Org-wide
  {
    id: "pb-1",
    name: "Churn window",
    type: "rule",
    description: "180 days with no purchase triggers churn classification",
    scope: "org",
    status: "confirmed",
    threshold: 180,
    source: "Confirmed during onboarding",
    updatedAt: "2025-05-20",
  },
  {
    id: "pb-3",
    name: "EOFY Sale",
    type: "calendar",
    description: "End of financial year sale event",
    scope: "org",
    status: "confirmed",
    dateRange: { start: "2025-06-20", end: "2025-06-30" },
    source: "Added by Marketing team",
    updatedAt: "2025-05-15",
  },
  {
    id: "pb-4",
    name: "Black Friday",
    type: "calendar",
    description: "Annual promotional event",
    scope: "org",
    status: "confirmed",
    dateRange: { start: "2025-11-28", end: "2025-12-02" },
    source: "Added by Marketing team",
    updatedAt: "2025-05-15",
  },
  {
    id: "pb-5",
    name: "Peak buying days",
    type: "rule",
    description: "Friday to Sunday accounts for 62% of weekly revenue",
    scope: "org",
    status: "confirmed",
    value: "Fri–Sun",
    source: "Derived from transaction data analysis",
    updatedAt: "2025-05-25",
  },
  {
    id: "pb-8",
    name: "Full-price threshold",
    type: "rule",
    description: "",
    scope: "org",
    status: "gap",
  },
  {
    id: "pb-9",
    name: "Markdown trigger",
    type: "calendar",
    description: "",
    scope: "org",
    status: "gap",
  },
  // Team
  {
    id: "pb-2",
    name: "Email fatigue threshold",
    type: "rule",
    description: "Maximum 3 email sends per customer per week",
    scope: "team",
    status: "confirmed",
    threshold: 3,
    source: "Set by Marketing team",
    updatedAt: "2025-05-28",
  },
  {
    id: "pb-6",
    name: "Campaign cool-down",
    type: "rule",
    description: "Minimum 7 days between major campaigns to same audience",
    scope: "team",
    status: "inferred",
    threshold: 7,
    source: "Inferred from historical campaign spacing",
    updatedAt: "2025-06-03",
  },
  {
    id: "pb-7",
    name: "ROAS target",
    type: "guideline",
    description: "Target return on ad spend of 4.0x",
    scope: "team",
    status: "confirmed",
    value: "4.0x",
    source: "Set by Performance team",
    updatedAt: "2025-05-30",
  },
  // Personal
  {
    id: "pb-10",
    name: "My campaign notes",
    type: "freetext",
    description: "Q3 focus is win-back for churned high-value. Avoid discounting hero SKUs unless sell-through drops below 40%.",
    scope: "personal",
    status: "confirmed",
    updatedAt: "2025-06-04",
  },

  // ─── Blue Illusion interpretation rules & common filters ───────────────────
  // How Lexi should *read* a request before building anything. These govern the
  // meaning of many segments at once rather than defining one audience.
  {
    id: "pb-bi-lifetime", name: "Default to lifetime metrics", type: "guideline",
    description: "When no time window is given, default to lifetime (all-time) totals. Only apply a time filter when the user explicitly names a period.",
    scope: "org", status: "confirmed", source: "Blue Illusion query-interpretation rules", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-active", name: "Active = last 12 months", type: "rule",
    description: "'Active customers' always means ordered in the last 12 months — overrides the default lifetime window.",
    scope: "org", status: "confirmed", value: "12 months", source: "Blue Illusion query-interpretation rules", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-tier", name: "Tiers use last-12-month spend", type: "rule",
    description: "Lifestyle Club tiers (Normals, Value, Vitals, High Vitals, Pinnacles) are always calculated on last-12-month spend, not lifetime.",
    scope: "org", status: "confirmed", value: "L12M spend", source: "Blue Illusion loyalty program", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-exclude-employees", name: "Exclude employees", type: "rule",
    description: "Employee profiles are suppressed from every marketing segment unless the user explicitly asks about employees.",
    scope: "org", status: "confirmed", source: "Blue Illusion common filter", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-customer-exists", name: "Customer must exist", type: "rule",
    description: "Apply to every query: a profile must have at least one event or purchase to be included.",
    scope: "org", status: "confirmed", source: "Blue Illusion common filter", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-key-sale", name: "Key sale period", type: "calendar",
    description: "November–December is the key sale period; 'Key Sales Customers' are top-half spenders who ordered during it.",
    scope: "org", status: "confirmed", dateRange: { start: "2025-11-01", end: "2025-12-31" }, source: "Blue Illusion trade calendar", updatedAt: "2026-06-22",
  },
  {
    id: "pb-bi-trade-week", name: "Trade week", type: "rule",
    description: "A rolling 7-day window (Mon–Sun) used for weekly trade reporting of new vs returning customers.",
    scope: "org", status: "confirmed", value: "Mon–Sun", source: "Blue Illusion trade reporting", updatedAt: "2026-06-22",
  },
];

export const MOCK_STORE: KnowledgeStore = {
  definitions: MOCK_DEFINITIONS,
  groups: MOCK_GROUPS,
  playbook: MOCK_PLAYBOOK,
};

// ─── Segments ───────────────────────────────────────────────────────────────

export const MOCK_SEGMENTS: Segment[] = [
  {
    id: "seg-1",
    name: "Pinnacle",
    description: "Customers who spent $1,500+ in the last 12 months",
    category: "Loyalty Tiers",
    filters: { connector: "AND", rows: [
      { field: "L12M Spend", fieldType: "metric", operator: "is greater than", value: "$1,500" },
      { field: "Country", fieldType: "attribute", operator: "equals", value: "Australia" },
      { field: "Employee Flag", fieldType: "attribute", operator: "is not set", value: "" },
    ]},
    sql: `SELECT c.unified_link_value, c.email, c.first_name\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value, SUM(line_revenue) as l12m_spend\n FROM fact_event_v1\n WHERE is_purchase = true\n    AND action_at >= DATE_ADD('month', -12, CURRENT_DATE)\n GROUP BY unified_link_value\n HAVING SUM(line_revenue) >= 1500\n) s ON c.unified_link_value = s.unified_link_value\nWHERE c.country = 'australia'\n AND c.employee_flag IS NULL`,
    population: 1240,
    populationGrowth: 3.2,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-01-15",
    updatedAt: "2025-06-01",
    activations: [
      { id: "act-1", name: "Pinnacle Welcome", channel: "email", lastSent: "Jun 3", status: "active" },
      { id: "act-2", name: "VIP Early Access", channel: "sms", lastSent: "May 28", status: "active" },
    ],
    sampleUsers: [
      { id: "u1", name: "Emma Wilson", email: "emma.w@gmail.com", ltv: 4200, lastPurchase: "2025-05-28", tier: "Pinnacle" },
      { id: "u2", name: "James Liu", email: "j.liu@outlook.com", ltv: 3100, lastPurchase: "2025-06-01", tier: "Pinnacle" },
      { id: "u3", name: "Sophie Adams", email: "sophie.a@yahoo.com", ltv: 2800, lastPurchase: "2025-05-15", tier: "Pinnacle" },
      { id: "u4", name: "Oliver Park", email: "o.park@gmail.com", ltv: 2450, lastPurchase: "2025-05-20", tier: "Pinnacle" },
      { id: "u5", name: "Mia Torres", email: "mia.t@icloud.com", ltv: 1890, lastPurchase: "2025-06-04", tier: "Pinnacle" },
    ],
    usedMetrics: ["met-2"],
    usedAttributes: ["attr-1", "attr-5"],
  },
  {
    id: "seg-2",
    name: "High Vitals",
    description: "Customers who spent $1,000–$1,499 in L12M",
    category: "Loyalty Tiers",
    filters: { connector: "AND", rows: [
      { field: "L12M Spend", fieldType: "metric", operator: "is between", value: "$1,000 – $1,499" },
      { field: "Country", fieldType: "attribute", operator: "equals", value: "Australia" },
    ]},
    sql: `SELECT c.unified_link_value, c.email\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value, SUM(line_revenue) as l12m_spend\n FROM fact_event_v1\n WHERE is_purchase = true AND action_at >= DATE_ADD('month', -12, CURRENT_DATE)\n GROUP BY unified_link_value\n HAVING SUM(line_revenue) BETWEEN 1000 AND 1499\n) s ON c.unified_link_value = s.unified_link_value\nWHERE c.country = 'australia'`,
    population: 3420,
    populationGrowth: 1.8,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-01-15",
    updatedAt: "2025-05-28",
    activations: [
      { id: "act-3", name: "Tier Upgrade Nudge", channel: "email", lastSent: "Jun 1", status: "active" },
    ],
    sampleUsers: [
      { id: "u6", name: "Liam Carter", email: "liam.c@gmail.com", ltv: 1420, lastPurchase: "2025-05-22", tier: "High Vitals" },
      { id: "u7", name: "Ava Nguyen", email: "ava.n@outlook.com", ltv: 1280, lastPurchase: "2025-06-02", tier: "High Vitals" },
    ],
    usedMetrics: ["met-2"],
    usedAttributes: ["attr-1"],
  },
  {
    id: "seg-3",
    name: "New Customers L12M",
    description: "First-ever order within last 12 months",
    category: "Lifecycle",
    filters: { connector: "AND", rows: [
      { field: "First Order Date", fieldType: "metric", operator: "is within last", value: "12 months" },
      { field: "Order Count", fieldType: "metric", operator: "equals", value: "1" },
    ]},
    sql: `SELECT c.unified_link_value, c.email\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value, MIN(action_at) as first_order, COUNT(DISTINCT order_id) as orders\n FROM fact_event_v1 WHERE is_purchase = true\n GROUP BY unified_link_value\n HAVING MIN(action_at) >= DATE_ADD('month', -12, CURRENT_DATE) AND COUNT(DISTINCT order_id) = 1\n) o ON c.unified_link_value = o.unified_link_value`,
    population: 8930,
    populationGrowth: 12.4,
    status: "active",
    owner: "Marcus Lee",
    createdAt: "2025-02-10",
    updatedAt: "2025-06-04",
    activations: [
      { id: "act-4", name: "Welcome Series", channel: "email", lastSent: "Jun 4", status: "active" },
      { id: "act-5", name: "Second Purchase Push", channel: "push", lastSent: "Jun 2", status: "active" },
    ],
    sampleUsers: [
      { id: "u8", name: "Zara Mitchell", email: "zara.m@gmail.com", ltv: 189, lastPurchase: "2025-06-01", tier: "New" },
      { id: "u9", name: "Noah Brown", email: "noah.b@yahoo.com", ltv: 245, lastPurchase: "2025-05-30", tier: "New" },
    ],
    usedMetrics: ["met-7", "met-3"],
    usedAttributes: [],
  },
  {
    id: "seg-4",
    name: "Lapsed 6 Months",
    description: "Email-subscribed customers whose last purchase > 6 months ago",
    category: "Lifecycle",
    filters: { connector: "AND", rows: [
      { field: "Last Order Date", fieldType: "metric", operator: "is more than", value: "6 months ago" },
      { field: "Communication Opt-in", fieldType: "attribute", operator: "equals", value: "true" },
    ]},
    sql: `SELECT c.unified_link_value, c.email\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value, MAX(action_at) as last_order\n FROM fact_event_v1 WHERE is_purchase = true\n GROUP BY unified_link_value\n HAVING MAX(action_at) < DATE_ADD('month', -6, CURRENT_DATE)\n) o ON c.unified_link_value = o.unified_link_value\nWHERE c.communication_opt_in = true`,
    population: 5620,
    populationGrowth: -2.1,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-01-20",
    updatedAt: "2025-06-03",
    activations: [
      { id: "act-6", name: "Win-back Flow", channel: "email", lastSent: "Jun 3", status: "active" },
    ],
    sampleUsers: [
      { id: "u10", name: "Isabella Rossi", email: "isa.r@gmail.com", ltv: 890, lastPurchase: "2024-11-12", tier: "Vitals" },
    ],
    usedMetrics: ["met-6"],
    usedAttributes: ["attr-16"],
  },
  {
    id: "seg-5",
    name: "High Value Lapsed",
    description: "Spend decile 6-10, no order in 24+ months",
    category: "Value",
    filters: { connector: "AND", rows: [
      { field: "Spend Decile", fieldType: "metric", operator: "is between", value: "6 – 10" },
      { field: "Last Order Date", fieldType: "metric", operator: "is more than", value: "24 months ago" },
    ]},
    sql: `SELECT c.unified_link_value, c.email\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value,\n    NTILE(10) OVER (ORDER BY SUM(line_revenue)) as spend_decile,\n    MAX(action_at) as last_order\n FROM fact_event_v1 WHERE is_purchase = true\n GROUP BY unified_link_value\n) s ON c.unified_link_value = s.unified_link_value\nWHERE s.spend_decile >= 6\n AND s.last_order < DATE_ADD('month', -24, CURRENT_DATE)`,
    population: 2340,
    populationGrowth: -0.8,
    status: "active",
    owner: "Marcus Lee",
    createdAt: "2025-03-01",
    updatedAt: "2025-05-15",
    activations: [],
    sampleUsers: [
      { id: "u11", name: "Daniel Kim", email: "d.kim@outlook.com", ltv: 3200, lastPurchase: "2023-08-14", tier: "Pinnacle" },
    ],
    usedMetrics: ["met-5", "met-6"],
    usedAttributes: [],
  },
  {
    id: "seg-6",
    name: "Top 10% Active",
    description: "Top spend decile, purchased in L12M. Seed for lookalike audiences.",
    category: "Value",
    filters: { connector: "AND", rows: [
      { field: "Spend Decile", fieldType: "metric", operator: "equals", value: "10" },
      { field: "Last Order Date", fieldType: "metric", operator: "is within last", value: "12 months" },
    ]},
    sql: `SELECT c.unified_link_value, c.email\nFROM dim_customer_v1 c\nJOIN (\n SELECT unified_link_value,\n    NTILE(10) OVER (ORDER BY SUM(line_revenue)) as spend_decile,\n    MAX(action_at) as last_order\n FROM fact_event_v1 WHERE is_purchase = true\n GROUP BY unified_link_value\n) s ON c.unified_link_value = s.unified_link_value\nWHERE s.spend_decile = 10\n AND s.last_order >= DATE_ADD('month', -12, CURRENT_DATE)`,
    population: 980,
    populationGrowth: 5.1,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-02-20",
    updatedAt: "2025-06-01",
    activations: [
      { id: "act-7", name: "Meta Lookalike Seed", channel: "paid-social", status: "active" },
    ],
    sampleUsers: [],
    usedMetrics: ["met-5", "met-6"],
    usedAttributes: [],
  },
];

// ─── Product Groups ─────────────────────────────────────────────────────────

export const MOCK_PRODUCT_GROUPS: ProductGroup[] = [
  {
    id: "pg-1",
    name: "Hero SKUs",
    description: "Top 5% revenue products with sell-through > 80%",
    category: "Performance",
    filters: { connector: "AND", rows: [
      { field: "Revenue Rank", fieldType: "metric", operator: "is in top", value: "5%" },
      { field: "Sell-through Rate", fieldType: "metric", operator: "is greater than", value: "80%" },
    ]},
    sql: `SELECT p.sku, p.product_name, p.category\nFROM dim_product_v1 p\nJOIN (\n SELECT sku, SUM(line_revenue) as revenue,\n    PERCENT_RANK() OVER (ORDER BY SUM(line_revenue) DESC) as rev_rank\n FROM fact_event_v1 WHERE is_purchase = true\n GROUP BY sku\n) s ON p.sku = s.sku\nWHERE s.rev_rank <= 0.05`,
    productCount: 34,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-02-01",
    updatedAt: "2025-06-02",
    sampleProducts: [
      { id: "p1", name: "Cashmere Wrap Coat", sku: "LUM-OW-4501", price: 489, category: "Outerwear" },
      { id: "p2", name: "Silk Midi Dress", sku: "LUM-DR-2201", price: 329, category: "Dresses" },
      { id: "p3", name: "Merino Knit Set", sku: "LUM-KN-1102", price: 269, category: "Knitwear" },
    ],
    usedMetrics: ["met-9"],
    usedAttributes: ["attr-14"],
  },
  {
    id: "pg-2",
    name: "Markdown Candidates",
    description: "Sell-through < 40% after 60 days on shelf",
    category: "Performance",
    filters: { connector: "AND", rows: [
      { field: "Sell-through Rate", fieldType: "metric", operator: "is less than", value: "40%" },
      { field: "Days on Shelf", fieldType: "metric", operator: "is greater than", value: "60" },
    ]},
    sql: `SELECT p.sku, p.product_name, p.category\nFROM dim_product_v1 p\nJOIN product_inventory pi ON p.sku = pi.sku\nWHERE pi.sell_through_rate < 0.4\n AND pi.days_on_shelf > 60`,
    productCount: 89,
    status: "active",
    owner: "Marcus Lee",
    createdAt: "2025-03-15",
    updatedAt: "2025-06-04",
    sampleProducts: [
      { id: "p4", name: "Linen Blazer - Navy", sku: "LUM-BL-3301", price: 399, category: "Jackets", sellThrough: 28 },
      { id: "p5", name: "Wide Leg Trouser", sku: "LUM-BT-1205", price: 229, category: "Bottoms", sellThrough: 35 },
    ],
    usedMetrics: ["met-9"],
    usedAttributes: [],
  },
  {
    id: "pg-3",
    name: "New Arrivals",
    description: "Products added in last 14 days",
    category: "Lifecycle",
    filters: { connector: "AND", rows: [
      { field: "Date Added", fieldType: "attribute", operator: "is within last", value: "14 days" },
    ]},
    sql: `SELECT sku, product_name, category, price\nFROM dim_product_v1\nWHERE created_at >= DATE_ADD('day', -14, CURRENT_DATE)`,
    productCount: 23,
    status: "active",
    owner: "Sarah Chen",
    createdAt: "2025-04-01",
    updatedAt: "2025-06-05",
    sampleProducts: [
      { id: "p6", name: "Cotton Poplin Shirt", sku: "LUM-TP-5501", price: 179, category: "Tops" },
    ],
    usedMetrics: [],
    usedAttributes: [],
  },
];

// ─── Metrics ────────────────────────────────────────────────────────────────

export const MOCK_METRICS: Definition[] = [
  { id: "met-1", name: "Total Spend", type: "metric", entity: "customer", description: "Total order value across customer lifetime", status: "confirmed", scope: "org", category: "Customer Value", sql: "SUM(fact_event.line_revenue) WHERE is_purchase = true", athenaColumn: "fact_event_v1.line_revenue", mappingType: "aggregation", dataType: "numeric" },
  { id: "met-2", name: "L12M Spend", type: "metric", entity: "customer", description: "Revenue in last 12 months", status: "confirmed", scope: "org", category: "Customer Value", sql: "SUM(line_revenue) WHERE is_purchase = true AND action_at >= DATE_ADD('month', -12, CURRENT_DATE)", athenaColumn: "fact_event_v1.line_revenue", mappingType: "aggregation", dataType: "numeric" },
  { id: "met-3", name: "Order Count", type: "metric", entity: "customer", description: "Total distinct orders", status: "confirmed", scope: "org", category: "Purchase Frequency", sql: "COUNT(DISTINCT fact_event.order_id) WHERE is_purchase = true", athenaColumn: "fact_event_v1.order_id", mappingType: "aggregation", dataType: "numeric" },
  { id: "met-4", name: "Average Order Value", type: "metric", entity: "customer", description: "Average spend per order", status: "confirmed", scope: "org", category: "Customer Value", sql: "SUM(line_revenue) / COUNT(DISTINCT order_id)", athenaColumn: "fact_event_v1.line_revenue", mappingType: "derived", dataType: "numeric" },
  { id: "met-5", name: "Spend Decile", type: "metric", entity: "customer", description: "Customer ranked 1-10 by total spend", status: "confirmed", scope: "org", category: "Customer Value", sql: "NTILE(10) OVER (ORDER BY SUM(line_revenue))", athenaColumn: "fact_event_v1.line_revenue", mappingType: "derived", dataType: "numeric" },
  { id: "met-6", name: "Last Order Date", type: "metric", entity: "customer", description: "Most recent purchase date", status: "confirmed", scope: "org", category: "Recency", sql: "MAX(fact_event.action_at) WHERE is_purchase = true", athenaColumn: "fact_event_v1.action_at", mappingType: "aggregation", dataType: "date" },
  { id: "met-7", name: "First Order Date", type: "metric", entity: "customer", description: "First ever purchase date", status: "confirmed", scope: "org", category: "Acquisition", sql: "MIN(fact_event.action_at) WHERE is_purchase = true", athenaColumn: "fact_event_v1.action_at", mappingType: "aggregation", dataType: "date" },
  { id: "met-8", name: "Return Rate", type: "metric", entity: "customer", description: "Percentage of items returned", status: "confirmed", scope: "org", category: "Returns", sql: "SUM(qty WHERE is_return) / SUM(qty WHERE is_purchase) * 100", athenaColumn: "fact_event_v1.quantity", mappingType: "derived", dataType: "numeric" },
  { id: "met-9", name: "Sell-through Rate", type: "metric", entity: "product", description: "Units sold / units received", status: "confirmed", scope: "org", category: "Product Performance", sql: "units_sold / units_received * 100", athenaColumn: "product_inventory.sell_through", mappingType: "derived", dataType: "numeric" },
  { id: "met-10", name: "Email Open Rate", type: "metric", entity: "customer", description: "Percentage of emails opened", status: "confirmed", scope: "org", category: "Engagement", sql: "COUNT(email_open) / COUNT(email_send) * 100", athenaColumn: "email_events", mappingType: "derived", dataType: "numeric" },
];

// ─── Attributes ─────────────────────────────────────────────────────────────

export const MOCK_ATTRIBUTES: Definition[] = [
  { id: "attr-1", name: "Country", type: "attribute", entity: "customer", description: "Customer country", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.country", mappingType: "direct", dataType: "categorical", possibleValues: ["Australia", "New Zealand", "United Kingdom"] },
  { id: "attr-2", name: "State", type: "attribute", entity: "customer", description: "Customer state/province", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.state", mappingType: "direct", dataType: "categorical", possibleValues: ["NSW", "VIC", "QLD", "WA", "SA", "TAS"] },
  { id: "attr-3", name: "Postcode", type: "attribute", entity: "customer", description: "Customer postcode", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.postcode", mappingType: "direct", dataType: "text" },
  { id: "attr-4", name: "Birth Month", type: "attribute", entity: "customer", description: "Month of birth", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.birth_month", mappingType: "direct", dataType: "numeric" },
  { id: "attr-5", name: "Gender", type: "attribute", entity: "customer", description: "Customer gender", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.gender", mappingType: "direct", dataType: "categorical", possibleValues: ["Female", "Male", "Non-binary", "Prefer not to say"] },
  { id: "attr-6", name: "Email", type: "attribute", entity: "customer", description: "Email address", status: "confirmed", scope: "org", category: "Personal", athenaColumn: "dim_customer_v1.email", mappingType: "direct", dataType: "text" },
  { id: "attr-7", name: "Store Name", type: "attribute", entity: "order", description: "Store where transaction occurred", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.store_name", mappingType: "direct", dataType: "categorical", possibleValues: ["Melbourne CBD", "Sydney Bondi", "Brisbane QV", "Online"] },
  { id: "attr-8", name: "Channel", type: "attribute", entity: "order", description: "Purchase channel", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.channel", mappingType: "direct", dataType: "categorical", possibleValues: ["Online", "In-store", "Phone"] },
  { id: "attr-9", name: "Is Purchase", type: "attribute", entity: "order", description: "Event is a purchase", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.is_purchase", mappingType: "direct", dataType: "boolean" },
  { id: "attr-10", name: "Is Return", type: "attribute", entity: "order", description: "Event is a return", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.is_return", mappingType: "direct", dataType: "boolean" },
  { id: "attr-11", name: "Line Revenue", type: "attribute", entity: "order", description: "Revenue for line item", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.line_revenue", mappingType: "direct", dataType: "numeric" },
  { id: "attr-12", name: "Price Paid", type: "attribute", entity: "order", description: "Actual price customer paid", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.price_paid", mappingType: "direct", dataType: "numeric" },
  { id: "attr-13", name: "Full Price", type: "attribute", entity: "order", description: "Original full price", status: "confirmed", scope: "org", category: "Transaction", athenaColumn: "fact_event_v1.full_price", mappingType: "direct", dataType: "numeric" },
  { id: "attr-14", name: "SKU", type: "attribute", entity: "product", description: "Product stock keeping unit", status: "confirmed", scope: "org", category: "Product", athenaColumn: "fact_event_v1.sku", mappingType: "direct", dataType: "text" },
  { id: "attr-15", name: "Product Name", type: "attribute", entity: "product", description: "Product display name", status: "confirmed", scope: "org", category: "Product", athenaColumn: "fact_event_v1.product_name", mappingType: "direct", dataType: "text" },
  { id: "attr-16", name: "Communication Opt-in", type: "attribute", entity: "customer", description: "Email marketing consent", status: "confirmed", scope: "org", category: "Email", athenaColumn: "dim_customer_v1.communication_opt_in", mappingType: "direct", dataType: "boolean" },
  { id: "attr-17", name: "Subscription Status", type: "attribute", entity: "customer", description: "Email subscription status via Klaviyo", status: "confirmed", scope: "org", category: "Email", athenaColumn: "klaviyo_events.subscription_status", mappingType: "platform", dataType: "categorical", possibleValues: ["Subscribed", "Unsubscribed", "Never subscribed"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getDefinitionsByEntity(definitions: Definition[], entity: EntityType) {
  return definitions.filter((d) => d.entity === entity);
}

export function getPlaybookByScope(playbook: PlaybookEntry[], scope: Scope) {
  return playbook.filter((p) => p.scope === scope);
}

export function getStoreStats(store: KnowledgeStore) {
  const allItems = [...store.definitions, ...store.playbook];
  return {
    total: allItems.length,
    confirmed: allItems.filter((d) => d.status === "confirmed").length,
    inferred: allItems.filter((d) => d.status === "inferred").length,
    gaps: allItems.filter((d) => d.status === "gap").length,
    definitions: store.definitions.length,
    groups: store.groups.length,
    playbook: store.playbook.length,
  };
}
