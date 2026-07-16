// ─── User ───────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  firstName: "Izac",
  lastName: "Ho",
  initials: "IH",
  email: "izac.ho@lexer.io",
  org: "Fitness Co.",
};

// ─── Recent Chats ────────────────────────────────────────────────────────────
export const MOCK_CHATS = [
  { id: 1, title: "Top customers by revenue last quarter" },
  { id: 2, title: "Churn risk segments in ANZ" },
  { id: 3, title: "Campaign performance by channel" },
  { id: 4, title: "High-value members not reactivated" },
  { id: 5, title: "Email vs SMS engagement rate" },
  { id: 6, title: "RFM segmentation for Black Friday" },
  { id: 7, title: "Lapsed customers in last 90 days" },
];

// ─── Bar Chart Data ───────────────────────────────────────────────────────────
export type BarChartDatum = { label: string; value: number };

export const TOP_CUSTOMERS_BAR: BarChartDatum[] = [
  { label: "Emma Johnson", value: 89420 },
  { label: "Marcus Chen", value: 74310 },
  { label: "Sarah Williams", value: 68900 },
  { label: "David Park", value: 61200 },
  { label: "Olivia Brown", value: 55800 },
  { label: "James Liu", value: 49100 },
  { label: "Amara Osei", value: 43700 },
  { label: "Tyler Ross", value: 38200 },
];

export const CHANNEL_REVENUE_BAR: BarChartDatum[] = [
  { label: "Email", value: 412000 },
  { label: "SMS", value: 289000 },
  { label: "Push", value: 156000 },
  { label: "Paid Social", value: 98000 },
  { label: "Direct Mail", value: 47000 },
];

// ─── Line Chart Data ──────────────────────────────────────────────────────────
export type LineChartDatum = { date: string; value: number };

export const REVENUE_TREND: LineChartDatum[] = [
  { date: "Jan", value: 380000 },
  { date: "Feb", value: 410000 },
  { date: "Mar", value: 395000 },
  { date: "Apr", value: 440000 },
  { date: "May", value: 468000 },
  { date: "Jun", value: 502000 },
  { date: "Jul", value: 488000 },
  { date: "Aug", value: 531000 },
  { date: "Sep", value: 519000 },
  { date: "Oct", value: 574000 },
  { date: "Nov", value: 612000 },
  { date: "Dec", value: 589000 },
];

// ─── Data Table ───────────────────────────────────────────────────────────────
export type TableRow = Record<string, string | number>;

export const SEGMENT_TABLE_COLS = [
  "Segment",
  "Customers",
  "Revenue Share",
  "Avg. Order Value",
  "Reactivation Rate",
];

export const SEGMENT_TABLE_ROWS: TableRow[] = [
  { Segment: "Loyalty Gold", Customers: 4821, "Revenue Share": "38%", "Avg. Order Value": "$186", "Reactivation Rate": "72%" },
  { Segment: "Loyalty Silver", Customers: 9340, "Revenue Share": "24%", "Avg. Order Value": "$124", "Reactivation Rate": "58%" },
  { Segment: "High Value", Customers: 2105, "Revenue Share": "19%", "Avg. Order Value": "$231", "Reactivation Rate": "61%" },
  { Segment: "At-Risk", Customers: 6782, "Revenue Share": "11%", "Avg. Order Value": "$89", "Reactivation Rate": "29%" },
  { Segment: "Lapsed", Customers: 12400, "Revenue Share": "5%", "Avg. Order Value": "$67", "Reactivation Rate": "14%" },
  { Segment: "New", Customers: 3190, "Revenue Share": "3%", "Avg. Order Value": "$72", "Reactivation Rate": "—" },
];

// ─── Conversations ────────────────────────────────────────────────────────────
export type MessageRole = "user" | "lexi";

export type TextBlock = { type: "text"; content: string };
export type ToolBlock = { type: "tool"; label: string; status: "thinking" | "done" };
export type BarArtifact = { type: "bar_chart"; name: string; description?: string; data: BarChartDatum[] };
export type LineArtifact = { type: "line_chart"; name: string; description?: string; data: LineChartDatum[] };
export type TableArtifact = { type: "data_table"; name: string; description?: string; cols: string[]; rows: TableRow[] };

export type ArtifactBlock = { type: "artifact"; artifact: BarArtifact | LineArtifact | TableArtifact };
export type MessageBlock = TextBlock | ToolBlock | ArtifactBlock;

export interface Message {
  id: number;
  role: MessageRole;
  prompt?: string;
  blocks?: MessageBlock[];
}

export const MOCK_CONVERSATION: Message[] = [
  {
    id: 1,
    role: "user",
    prompt: "Who are my top customers by revenue in the last 30 days?",
  },
  {
    id: 2,
    role: "lexi",
    blocks: [
      { type: "tool", label: "Querying customer revenue data", status: "done" },
      {
        type: "artifact",
        artifact: {
          type: "bar_chart",
          name: "Top Customers by Revenue (Last 30 Days)",
          description: "Revenue generated per customer, sorted descending.",
          data: TOP_CUSTOMERS_BAR,
        },
      },
      {
        type: "text",
        content: `Your top 8 customers generated **$480,730** combined in the last 30 days. **Emma Johnson** leads at $89,420 — nearly 20% above the next highest. A few patterns worth noting:\n\n- The top 3 customers account for **48%** of this cohort's revenue\n- All 8 are active loyalty members\n- Marcus Chen's spend is up 34% month-over-month\n\nWould you like to see their segment breakdowns or identify any at-risk customers in this group?`,
      },
    ],
  },
  {
    id: 3,
    role: "user",
    prompt: "Show me a breakdown by segment and their reactivation rates",
  },
  {
    id: 4,
    role: "lexi",
    blocks: [
      { type: "tool", label: "Joining segment and reactivation data", status: "done" },
      {
        type: "artifact",
        artifact: {
          type: "data_table",
          name: "Segment Performance Overview",
          description: "Revenue share, average order value and reactivation rate by segment.",
          cols: SEGMENT_TABLE_COLS,
          rows: SEGMENT_TABLE_ROWS,
        },
      },
      {
        type: "text",
        content: `Loyalty Gold is doing the heavy lifting — **38% of revenue** from just 4,800 customers. A few things stand out:\n\n- **At-Risk customers** have a 29% reactivation rate. A targeted win-back campaign here could move the needle significantly\n- The **Lapsed** cohort (12,400 customers) is large but low-value. Worth segmenting by recency before investing in activation\n- **High Value** non-loyalty members ($231 AOV) are strong candidates for a loyalty upgrade push\n\nWant me to draft a segment strategy or build an audience for a win-back campaign?`,
      },
    ],
  },
  {
    id: 5,
    role: "user",
    prompt: "Show me revenue trend over the past year",
  },
  {
    id: 6,
    role: "lexi",
    blocks: [
      { type: "tool", label: "Fetching annual revenue metrics", status: "done" },
      {
        type: "artifact",
        artifact: {
          type: "line_chart",
          name: "Revenue Trend — Last 12 Months",
          description: "Total revenue by month, all channels.",
          data: REVENUE_TREND,
        },
      },
      {
        type: "text",
        content: `Revenue has grown **55% year-over-year**, from $380K in January to a peak of $612K in November. The slight December dip is expected post-peak season. Growth has been consistent with no major drops — a strong signal on retention.\n\nThe Q3 acceleration (Aug–Nov) aligns with your loyalty re-engagement campaign launched in July. That's a strong attribution signal worth capturing.`,
      },
    ],
  },
];

// Thinking state — used for the "streaming" demo
export const MOCK_THINKING_MESSAGE: Message = {
  id: 99,
  role: "lexi",
  blocks: [
    { type: "tool", label: "Analysing customer data…", status: "thinking" },
  ],
};
