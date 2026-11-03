import { CalendarDays, ChevronDown, Hash, MoreVertical, Plus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type ChangeTone = "positive" | "negative" | "neutral";

type StatItem = {
  label: string;
  value: string;
  change: string;
  tone: ChangeTone;
};

type TrendPoint = {
  day: number;
  value: number;
};

type StatCardModel = {
  id: string;
  kind: "events" | "metrics";
  title: string;
  subtitle: string;
  stats: StatItem[];
};

type TrendCardModel = {
  id: string;
  kind: "events";
  title: string;
  subtitle: string;
  legendLabel: string;
  yMin: number;
  yMax: number;
  data: TrendPoint[];
};

const MASTER_KPIS_DATA = {
  dateRangeLabel: "01/06/2025 - 01/07/2025",
  viewLabel: "Default",
  sectionOne: {
    title: "ALL TIME - CUSTOMER METRICS",
    allCustomers: {
      id: "all-customers",
      kind: "metrics",
      title: "ALL CUSTOMERS",
      subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
      stats: [
        { label: "Total Customers", value: "19,278", change: "+1.79%", tone: "positive" },
        { label: "Avg Days Between All Orders", value: "64", change: "+2.3%", tone: "positive" },
      ],
    } as StatCardModel,
    recencyCards: [
      {
        id: "customer-recency-active",
        kind: "metrics",
        title: "CUSTOMER RECENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "Active Customers", value: "9,283", change: "+1.49%", tone: "positive" }],
      },
      {
        id: "customer-recency-inactive",
        kind: "metrics",
        title: "CUSTOMER RECENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "Inactive Customers", value: "4,705", change: "+1.01%", tone: "positive" }],
      },
      {
        id: "customer-recency-lapsed",
        kind: "metrics",
        title: "CUSTOMER RECENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "Lapsed Customers", value: "5,670", change: "+3.2%", tone: "positive" }],
      },
    ] as StatCardModel[],
    frequencyCards: [
      {
        id: "low-frequency",
        kind: "metrics",
        title: "LOW FREQUENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "1x Order Customers", value: "3,323", change: "+8.35%", tone: "positive" }],
      },
      {
        id: "medium-frequency",
        kind: "metrics",
        title: "MEDIUM FREQUENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "2x Order Customers", value: "8,652", change: "-", tone: "neutral" }],
      },
      {
        id: "high-frequency",
        kind: "metrics",
        title: "HIGH FREQUENCY",
        subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
        stats: [{ label: "3+ Order Customers", value: "7,683", change: "+1.36%", tone: "positive" }],
      },
    ] as StatCardModel[],
  },
  sectionTwo: {
    title: "SALES PERFORMANCE",
    allCustomersStats: {
      id: "sales-all-customers",
      kind: "events",
      title: "ALL CUSTOMERS",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      stats: [
        { label: "Event Count", value: "1,029", change: "-40.69%", tone: "negative" },
        { label: "Profile Count", value: "839", change: "-38.67%", tone: "negative" },
        { label: "Average Total Price Paid", value: "$5,190", change: "+5.92%", tone: "positive" },
        { label: "Sum Total Price Paid", value: "$5.34m", change: "-37.18%", tone: "negative" },
      ],
    } as StatCardModel,
    allCustomersTrend: {
      id: "sales-all-customers-trend",
      kind: "events",
      title: "ALL CUSTOMERS",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      legendLabel: "All Order Events",
      yMin: 0,
      yMax: 60,
      data: [
        { day: 1, value: 14 },
        { day: 2, value: 52 },
        { day: 3, value: 38 },
        { day: 4, value: 22 },
        { day: 5, value: 27 },
        { day: 6, value: 19 },
        { day: 7, value: 16 },
        { day: 8, value: 24 },
        { day: 9, value: 20 },
        { day: 10, value: 28 },
        { day: 11, value: 31 },
        { day: 12, value: 23 },
        { day: 13, value: 35 },
        { day: 14, value: 26 },
        { day: 15, value: 30 },
        { day: 16, value: 21 },
        { day: 17, value: 33 },
        { day: 18, value: 17 },
        { day: 19, value: 29 },
        { day: 20, value: 24 },
        { day: 21, value: 32 },
        { day: 22, value: 18 },
        { day: 23, value: 27 },
        { day: 24, value: 34 },
        { day: 25, value: 25 },
        { day: 26, value: 19 },
        { day: 27, value: 22 },
        { day: 28, value: 36 },
        { day: 29, value: 31 },
        { day: 30, value: 20 },
      ],
    } as TrendCardModel,
    newCustomers: {
      id: "sales-new-customers",
      kind: "events",
      title: "NEW CUSTOMERS",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      stats: [
        { label: "Event Count", value: "219", change: "-17.36%", tone: "negative" },
        { label: "Profile Count", value: "217", change: "-17.18%", tone: "negative" },
        { label: "Average Total Price Paid", value: "$8.02k", change: "+16.61%", tone: "positive" },
        { label: "Sum Total Price Paid", value: "$1.76m", change: "-3.63%", tone: "negative" },
      ],
    } as StatCardModel,
    returningCustomers: {
      id: "sales-returning-customers",
      kind: "events",
      title: "RETURNING CUSTOMERS",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      stats: [
        { label: "Event Count", value: "658", change: "-40.83%", tone: "negative" },
        { label: "Profile Count", value: "514", change: "-38.3%", tone: "negative" },
        { label: "Average Total Price Paid", value: "$4,211", change: "-7.65%", tone: "negative" },
        { label: "Sum Total Price Paid", value: "$2.77m", change: "-45.35%", tone: "negative" },
      ],
    } as StatCardModel,
  },
  sectionThree: {
    title: "EMAIL ENGAGEMENT",
    subscribers: {
      id: "email-subscribers",
      kind: "metrics",
      title: "EMAIL SUBSCRIBERS",
      subtitle: "Metrics, Latest value within 1st June, 2025 - 1st July, 2025",
      stats: [
        { label: "Email Opted In", value: "29,816", change: "+1.35%", tone: "positive" },
        { label: "Email Opted Out", value: "12,927", change: "+2.32%", tone: "positive" },
      ],
    } as StatCardModel,
    engagementStats: {
      id: "email-engagement-stats",
      kind: "events",
      title: "EMAIL ENGAGEMENT L7D",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      stats: [
        { label: "Event Count", value: "535", change: "-37.79%", tone: "negative" },
        { label: "Profile Count", value: "418", change: "-37.24%", tone: "negative" },
        { label: "Average Total Price Paid", value: "$4,939", change: "-4.9%", tone: "negative" },
        { label: "Sum Total Price Paid", value: "$2.64m", change: "-40.84%", tone: "negative" },
      ],
    } as StatCardModel,
    engagementTrend: {
      id: "email-engagement-trend",
      kind: "events",
      title: "EMAIL ENGAGEMENT L7D",
      subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
      legendLabel: "All Order Events",
      yMin: 0,
      yMax: 25,
      data: [
        { day: 1, value: 4 },
        { day: 2, value: 20 },
        { day: 3, value: 15 },
        { day: 4, value: 9 },
        { day: 5, value: 13 },
        { day: 6, value: 8 },
        { day: 7, value: 7 },
        { day: 8, value: 11 },
        { day: 9, value: 9 },
        { day: 10, value: 14 },
        { day: 11, value: 16 },
        { day: 12, value: 10 },
        { day: 13, value: 17 },
        { day: 14, value: 12 },
        { day: 15, value: 14 },
        { day: 16, value: 9 },
        { day: 17, value: 15 },
        { day: 18, value: 7 },
        { day: 19, value: 13 },
        { day: 20, value: 11 },
        { day: 21, value: 14 },
        { day: 22, value: 8 },
        { day: 23, value: 12 },
        { day: 24, value: 16 },
        { day: 25, value: 12 },
        { day: 26, value: 7 },
        { day: 27, value: 10 },
        { day: 28, value: 17 },
        { day: 29, value: 14 },
        { day: 30, value: 9 },
      ],
    } as TrendCardModel,
  },
  sectionFour: {
    title: "SEGMENT - CHANNEL PERFORMANCE",
    cards: [
      {
        id: "sent-to-google",
        kind: "events",
        title: "SENT TO GOOGLE",
        subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
        stats: [
          { label: "Event Count", value: "12", change: "-33.33%", tone: "negative" },
          { label: "Profile Count", value: "9", change: "-40%", tone: "negative" },
          { label: "Average Total Price Paid", value: "$8.35k", change: "+18.75%", tone: "positive" },
          { label: "Sum Total Price Paid", value: "$100k", change: "-20.83%", tone: "negative" },
        ],
      },
      {
        id: "sent-to-klaviyo",
        kind: "events",
        title: "SENT TO KLAVIYO",
        subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
        stats: [
          { label: "Event Count", value: "1,026", change: "-40.66%", tone: "negative" },
          { label: "Profile Count", value: "836", change: "-38.62%", tone: "negative" },
          { label: "Average Total Price Paid", value: "$5,200", change: "+5.91%", tone: "positive" },
          { label: "Sum Total Price Paid", value: "$5.33m", change: "-37.15%", tone: "negative" },
        ],
      },
      {
        id: "sent-to-meta",
        kind: "events",
        title: "SENT TO META",
        subtitle: "Events, 1st June, 2025 - 1st July, 2025 comparing to Previous Period",
        stats: [
          { label: "Event Count", value: "351", change: "-41.6%", tone: "negative" },
          { label: "Profile Count", value: "294", change: "-38.88%", tone: "negative" },
          { label: "Average Total Price Paid", value: "$5,141", change: "+9.73%", tone: "positive" },
          { label: "Sum Total Price Paid", value: "$1.8m", change: "-35.91%", tone: "negative" },
        ],
      },
    ] as StatCardModel[],
  },
};

const tickDays = [5, 9, 13, 17, 21, 25, 29];

function changeBadgeClasses(tone: ChangeTone): string {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "negative") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted text-muted-foreground";
}

function CardHeader({ title, subtitle, kind }: { title: string; subtitle: string; kind: "events" | "metrics" }) {
  const Icon = kind === "events" ? CalendarDays : Hash;

  return (
    <header className="mb-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-foreground-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-foreground-secondary">{subtitle}</p>
    </header>
  );
}

function StatsCard({
  card,
  showRowAdd,
}: {
  card: StatCardModel;
  showRowAdd?: boolean;
}) {
  return (
    <article className="group relative rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      {showRowAdd ? (
        <button
          type="button"
          aria-label="Add row"
          className="absolute -left-8 top-4 hidden size-6 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary opacity-0 transition-opacity group-hover:opacity-100 md:inline-flex"
        >
          <Plus className="size-3.5" />
        </button>
      ) : null}
      <CardHeader title={card.title} subtitle={card.subtitle} kind={card.kind} />
      <div
        className={cn(
          "grid gap-0 overflow-hidden rounded-lg border border-border/60",
          card.stats.length === 1 ? "grid-cols-1" : card.stats.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {card.stats.map((stat, index) => (
          <div
            key={`${card.id}-${stat.label}`}
            className={cn(
              "flex min-h-28 flex-col items-center justify-center gap-1.5 px-4 py-3 text-center",
              index > 0 ? "border-t border-border/60 sm:border-l sm:border-t-0" : "",
              card.stats.length === 4 && index > 1 ? "xl:border-t-0" : "",
              card.stats.length === 4 && (index === 2 || index === 3) ? "sm:border-t sm:border-l-0 xl:border-l" : "",
            )}
          >
            <p className="text-xs text-foreground-secondary">{stat.label}</p>
            <p className="text-3xl font-bold leading-none text-foreground">{stat.value}</p>
            <span
              className={cn(
                "inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                changeBadgeClasses(stat.tone),
              )}
            >
              {stat.change}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function TrendCard({ card }: { card: TrendCardModel }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <CardHeader title={card.title} subtitle={card.subtitle} kind={card.kind} />
      <div className="mb-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-600" />
          {card.legendLabel}
        </span>
      </div>
      <div className="h-64 rounded-lg border border-border/60 bg-background/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={card.data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              ticks={tickDays}
              tickFormatter={(day) => `${day} Jun`}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[card.yMin, card.yMax]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={28}
              stroke="hsl(var(--muted-foreground))"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-bold text-foreground">{title}</h2>;
}

export function MasterKpisDashboard() {
  const {
    dateRangeLabel,
    viewLabel,
    sectionOne,
    sectionTwo,
    sectionThree,
    sectionFour,
  } = MASTER_KPIS_DATA;

  return (
    <div
      className="h-full overflow-y-auto rounded-xl border border-border/70 bg-background p-4 md:p-6"
      style={{ fontFamily: "Rubik, 'Nunito Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-extrabold uppercase tracking-[0.02em] text-foreground">MASTER KPIS</h1>

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
        <section className="space-y-4">
          <SectionTitle title={sectionOne.title} />
          <StatsCard card={sectionOne.allCustomers} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {sectionOne.recencyCards.map((card) => (
              <StatsCard key={card.id} card={card} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {sectionOne.frequencyCards.map((card) => (
              <StatsCard key={card.id} card={card} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title={sectionTwo.title} />
          <StatsCard card={sectionTwo.allCustomersStats} showRowAdd />
          <TrendCard card={sectionTwo.allCustomersTrend} />
          <StatsCard card={sectionTwo.newCustomers} showRowAdd />
          <StatsCard card={sectionTwo.returningCustomers} />
          <div className="rounded-xl border border-border/70 bg-muted/50 p-3 text-xs leading-relaxed text-foreground-secondary">
            <p>New Customers: Customers who placed their first order within the time period.</p>
            <p>
              Returning Customers: Customers who placed a second, third, or additional order within the time period. This also includes customers whose first order and subsequent orders both occurred within the same time period.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle title={sectionThree.title} />
          <StatsCard card={sectionThree.subscribers} />
          <StatsCard card={sectionThree.engagementStats} showRowAdd />
          <TrendCard card={sectionThree.engagementTrend} />
        </section>

        <section className="space-y-4">
          <SectionTitle title={sectionFour.title} />
          {sectionFour.cards.map((card, index) => (
            <StatsCard key={card.id} card={card} showRowAdd={index === 0} />
          ))}
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground"
            >
              <Plus className="size-4" />
              ADD ROW
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MasterKpisDashboard;
