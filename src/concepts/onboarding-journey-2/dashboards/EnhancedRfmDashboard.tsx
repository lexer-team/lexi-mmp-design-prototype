import { ChevronDown, Hash, MoreVertical } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

type ChangeTone = "positive" | "negative" | "neutral";

type StatItem = {
  label: string;
  value: string;
  change: string;
  tone: ChangeTone;
};

type StatCardData = {
  id: string;
  title: string;
  subtitle: string;
  rows: StatItem[][];
};

type DefinitionItem = {
  label: string;
  description: string;
};

type DefinitionCardData = {
  id: string;
  title: string;
  items: DefinitionItem[];
  withMenu?: boolean;
};

type SegmentColorKey =
  | "New High Potential"
  | "New Needs Nurturing"
  | "Champions"
  | "Prime Potential"
  | "Steady Spenders"
  | "Fading Stars"
  | "Fresh Comers"
  | "Needs Attention"
  | "At Risk"
  | "Dormant"
  | "Cold Lapsed"
  | "Full Order Returners";

type BarItem = {
  label: string;
  colorKey: SegmentColorKey;
  value: number;
};

type BarCardData = {
  id: string;
  title: string;
  subtitle: string;
  bars: BarItem[];
};

const RFM_SEGMENT_COLORS: Record<SegmentColorKey, string> = {
  "New High Potential": "#2563eb",
  "New Needs Nurturing": "#d4a017",
  Champions: "#2563eb",
  "Prime Potential": "#d4a017",
  "Steady Spenders": "#db2777",
  "Fading Stars": "#0f766e",
  "Fresh Comers": "#ea580c",
  "Needs Attention": "#14b8a6",
  "At Risk": "#4f46e5",
  Dormant: "#1e3a8a",
  "Cold Lapsed": "#2563eb",
  "Full Order Returners": "#d4a017",
};

const ENHANCED_RFM_DATA = {
  cutoffDate: "June 15, 2026",
  dateRangeLabel: "Last 7 days",
  viewLabel: "Default",
  definitions: [
    {
      id: "rising-engagement",
      title: "DEFINITIONS: RISING ENGAGEMENT",
      withMenu: true,
      items: [
        {
          label: "Champions",
          description: "The very best customers. Very recent, frequent, and high spenders",
        },
        {
          label: "Prime Potential",
          description: "Recent, high AOV infrequent buyers. High recency, monetary value and lower orders.",
        },
        {
          label: "Steady Spenders",
          description: "Recent, frequent low spenders. High recency, frequency and lower monetary value.",
        },
        {
          label: "Fading Stars",
          description: "Excellent customers that are becoming inactive. High monetary value, good frequency, moderate recency.",
        },
        {
          label: "Fresh Comers",
          description: "Recently new customers. High recency, lower frequency and monetary value.",
        },
      ],
    },
    {
      id: "declining-engagement",
      title: "DEFINITIONS: DECLINING ENGAGEMENT",
      items: [
        {
          label: "Needs Attention",
          description: "Haven't ordered in a while, but engage with us.",
        },
        {
          label: "At Risk",
          description: "Haven't ordered in a while and have low engagement.",
        },
        {
          label: "Dormant",
          description: "Haven't ordered in a very long time with varied engagement.",
        },
        {
          label: "Cold Lapsed",
          description: "Haven't ordered in a very long time with no engagement.",
        },
        {
          label: "Full Order Returners",
          description: "Customers with 100% return rate.",
        },
      ],
    },
  ] as DefinitionCardData[],
  existingAndNewCustomerGroups: {
    title: "EXISTING & NEW CUSTOMER RFM GROUPS",
    newCustomerStats: {
      id: "new-customer-volumes-stats",
      title: "NEW CUSTOMER VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      rows: [
        [
          { label: "New High Potential", value: "271", change: "+35", tone: "positive" },
          { label: "New Needs Nurturing", value: "289", change: "+53", tone: "positive" },
        ],
      ],
    } as StatCardData,
    newCustomerBars: {
      id: "new-customer-volumes-bars",
      title: "NEW CUSTOMER VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      bars: [
        { label: "New High Potential", value: 271, colorKey: "New High Potential" },
        { label: "New Needs Nurturing", value: 289, colorKey: "New Needs Nurturing" },
      ],
    } as BarCardData,
    existingCustomerStats: {
      id: "existing-customer-volumes-stats",
      title: "EXISTING CUSTOMER VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      rows: [
        [
          { label: "Champions", value: "1,539", change: "-57", tone: "negative" },
          { label: "Prime Potential", value: "1,906", change: "-18", tone: "negative" },
          { label: "Steady Spenders", value: "1,347", change: "-5", tone: "negative" },
          { label: "Fading Stars", value: "3,128", change: "+67", tone: "positive" },
          { label: "Fresh Comers", value: "2,957", change: "-43", tone: "negative" },
          { label: "Needs Attention", value: "1,665", change: "-7", tone: "negative" },
        ],
        [
          { label: "At Risk", value: "5,746", change: "+30", tone: "positive" },
          { label: "Dormant", value: "1,859", change: "-", tone: "neutral" },
          { label: "Cold Lapsed", value: "5,777", change: "+32", tone: "positive" },
          { label: "Full Order Returners", value: "83", change: "-", tone: "neutral" },
        ],
      ],
    } as StatCardData,
    existingCustomerBars: {
      id: "existing-customer-volumes-bars",
      title: "EXISTING CUSTOMER VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      bars: [
        { label: "Champions", value: 1539, colorKey: "Champions" },
        { label: "Prime Potential", value: 1906, colorKey: "Prime Potential" },
        { label: "Steady Spenders", value: 1347, colorKey: "Steady Spenders" },
        { label: "Fading Stars", value: 3128, colorKey: "Fading Stars" },
        { label: "Fresh Comers", value: 2957, colorKey: "Fresh Comers" },
        { label: "Needs Attention", value: 1665, colorKey: "Needs Attention" },
        { label: "At Risk", value: 5746, colorKey: "At Risk" },
        { label: "Dormant", value: 1859, colorKey: "Dormant" },
        { label: "Cold Lapsed", value: 5777, colorKey: "Cold Lapsed" },
        { label: "Full Order Returners", value: 83, colorKey: "Full Order Returners" },
      ],
    } as BarCardData,
  },
  priorGroups: {
    title: "EXISTING CUSTOMER PRIOR RFM GROUPS",
    priorStats: {
      id: "prior-customer-volumes-stats",
      title: "EXISTING CUSTOMER PRIOR VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      rows: [
        [
          { label: "Prior Champions", value: "527", change: "+112", tone: "positive" },
          { label: "Prior Prime Potential", value: "540", change: "+20", tone: "positive" },
          { label: "Prior Steady Spenders", value: "139", change: "+17", tone: "positive" },
          { label: "Prior Fading Stars", value: "322", change: "+45", tone: "positive" },
          { label: "Prior Fresh Comers", value: "521", change: "+40", tone: "positive" },
          { label: "Prior Needs Attention", value: "284", change: "+46", tone: "positive" },
        ],
        [
          { label: "Prior At Risk", value: "466", change: "+55", tone: "positive" },
          { label: "Prior Dormant", value: "103", change: "+15", tone: "positive" },
          { label: "Prior Cold Lapsed", value: "64", change: "+12", tone: "positive" },
        ],
      ],
    } as StatCardData,
    priorBars: {
      id: "prior-customer-volumes-bars",
      title: "EXISTING CUSTOMER PRIOR VOLUMES",
      subtitle: "Metrics, Latest value within Last 7 days",
      bars: [
        { label: "Prior Champions", value: 527, colorKey: "Champions" },
        { label: "Prior Prime Potential", value: 540, colorKey: "Prime Potential" },
        { label: "Prior Steady Spenders", value: 139, colorKey: "Steady Spenders" },
        { label: "Prior Fading Stars", value: 322, colorKey: "Fading Stars" },
        { label: "Prior Fresh Comers", value: 521, colorKey: "Fresh Comers" },
        { label: "Prior Needs Attention", value: 284, colorKey: "Needs Attention" },
        { label: "Prior At Risk", value: 466, colorKey: "At Risk" },
        { label: "Prior Dormant", value: 103, colorKey: "Dormant" },
        { label: "Prior Cold Lapsed", value: 64, colorKey: "Cold Lapsed" },
      ],
    } as BarCardData,
  },
};

function rowColumnsClass(itemsCount: number): string {
  if (itemsCount === 2) return "grid-cols-1 sm:grid-cols-2";
  if (itemsCount === 3) return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
  if (itemsCount === 4) return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  if (itemsCount === 5) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
  if (itemsCount >= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";
  return "grid-cols-1";
}

function changeBadgeClasses(tone: ChangeTone): string {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "negative") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted text-muted-foreground";
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-bold text-foreground">{title}</h2>;
}

function CardHeader({ title }: { title: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <Hash className="size-3.5 text-foreground-secondary" />
      <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{title}</h3>
    </div>
  );
}

function DefinitionCard({ card }: { card: DefinitionCardData }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{card.title}</h3>
        {card.withMenu ? <MoreVertical className="size-4 text-foreground-secondary" /> : null}
      </div>
      <div className="space-y-2.5">
        {card.items.map((item) => (
          <p key={`${card.id}-${item.label}`} className="text-sm text-foreground-secondary">
            <span className="font-semibold text-foreground">{item.label}:</span> {item.description}
          </p>
        ))}
      </div>
    </article>
  );
}

function StatCard({ card }: { card: StatCardData }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <CardHeader title={card.title} />
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>
      <div className="space-y-3">
        {card.rows.map((row, rowIndex) => (
          <div
            key={`${card.id}-row-${rowIndex}`}
            className={cn(
              "grid divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 sm:divide-y-0",
              rowColumnsClass(row.length),
            )}
          >
            {row.map((item) => (
              <div
                key={`${card.id}-${item.label}`}
                className="flex min-h-28 flex-col items-center justify-center gap-1.5 px-3 py-3 text-center sm:border-l sm:border-border/60 first:sm:border-l-0"
              >
                <p className="text-xs text-foreground-secondary">{item.label}</p>
                <p className="text-3xl font-bold leading-none text-foreground">{item.value}</p>
                <span
                  className={cn(
                    "inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    changeBadgeClasses(item.tone),
                  )}
                >
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function RfmHorizontalBarCard({ card }: { card: BarCardData }) {
  const data = card.bars.map((bar) => ({
    label: bar.label,
    value: bar.value,
    fill: RFM_SEGMENT_COLORS[bar.colorKey],
  }));
  const chartHeight = Math.max(180, data.length * 34 + 32);

  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <CardHeader title={card.title} />
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>
      <div className="rounded-lg border border-border/60 bg-background/70 p-2" style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground-secondary))" }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={`${card.id}-${entry.label}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value: number) => value.toLocaleString("en-US")}
                style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function EnhancedRfmDashboard() {
  const { cutoffDate, dateRangeLabel, viewLabel, definitions, existingAndNewCustomerGroups, priorGroups } = ENHANCED_RFM_DATA;

  return (
    <div
      className="h-full overflow-y-auto rounded-xl border border-border/70 bg-background p-4 md:p-6"
      style={{ fontFamily: "Rubik, 'Nunito Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-[0.02em] text-foreground">ENHANCED RFM</h1>
          <p className="mt-1 text-sm text-foreground-secondary">Cutoff Date: {cutoffDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          >
            {dateRangeLabel}
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          >
            {viewLabel}
            <ChevronDown className="size-3.5 text-foreground-secondary" />
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-9 items-center rounded-full border border-border bg-muted px-3 text-sm text-muted-foreground"
          >
            Saved
          </button>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground-secondary"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {definitions.map((definitionCard) => (
              <DefinitionCard key={definitionCard.id} card={definitionCard} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title={existingAndNewCustomerGroups.title} />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <StatCard card={existingAndNewCustomerGroups.newCustomerStats} />
            <RfmHorizontalBarCard card={existingAndNewCustomerGroups.newCustomerBars} />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <StatCard card={existingAndNewCustomerGroups.existingCustomerStats} />
            <RfmHorizontalBarCard card={existingAndNewCustomerGroups.existingCustomerBars} />
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title={priorGroups.title} />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <StatCard card={priorGroups.priorStats} />
            <RfmHorizontalBarCard card={priorGroups.priorBars} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default EnhancedRfmDashboard;
