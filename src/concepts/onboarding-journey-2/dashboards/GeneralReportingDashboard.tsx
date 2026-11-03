import { CalendarDays, ChevronDown, MoreVertical, MoveDown, Plus } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

type ChangeTone = "positive" | "negative" | "neutral";

type StatItem = {
  label: string;
  value: string;
  change?: string;
  tone?: ChangeTone;
};

type StatCardData = {
  id: string;
  title: string;
  subtitle: string;
  stats: StatItem[];
};

type TrendPoint = {
  date: string;
  value: number;
};

type SingleLineCardData = {
  id: string;
  title: string;
  subtitle: string;
  legendLabel: string;
  yDomain: [number, number];
  yTicks: number[];
  data: TrendPoint[];
};

type ProductSeriesName =
  | "Allergy & Immune Bites for Dogs"
  | "Probiotic Bites for Dogs"
  | "8-in-1 Multivitamin Bites for Dogs"
  | "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil"
  | "Hip & Joint Bites for Dogs";

type ProductSeries = {
  key: ProductSeriesName;
  label: string;
};

type MultiLinePoint = {
  date: string;
} & Record<ProductSeriesName, number>;

type ProductTableRow = {
  productName: string;
  eventCount: string;
  eventCountChange: string;
  eventCountTone: ChangeTone;
  profileCount: string;
  profileCountChange: string;
  profileCountTone: ChangeTone;
  averagePricePaid: string;
  averagePricePaidChange: string;
  averagePricePaidTone: ChangeTone;
  sumPricePaid: string;
  sumPricePaidChange: string;
  sumPricePaidTone: ChangeTone;
};

const PRODUCT_SERIES_COLORS: Record<ProductSeriesName, string> = {
  "Allergy & Immune Bites for Dogs": "#2563eb",
  "Probiotic Bites for Dogs": "#d4a017",
  "8-in-1 Multivitamin Bites for Dogs": "#db2777",
  "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": "#0f766e",
  "Hip & Joint Bites for Dogs": "#ea580c",
};

const GENERAL_REPORTING_DATA = {
  dateRangeLabel: "Last 30 days",
  viewLabel: "Default",
  sectionOneStats: {
    id: "all-customers-stats",
    title: "ALL CUSTOMERS",
    subtitle: "Events, Last 7 days comparing to Previous Period",
    stats: [
      { label: "Segment Profiles", value: "222k" },
      { label: "Event Count", value: "1,358", change: "+0.67%", tone: "positive" },
      { label: "Profile Count", value: "1,324", change: "+0.99%", tone: "positive" },
      { label: "Average Total Price Paid", value: "$41.81", change: "-8.96%", tone: "negative" },
      { label: "Sum Total Price Paid", value: "$56.8k", change: "-8.35%", tone: "negative" },
    ],
  } as StatCardData,
  sectionTwoTrend: {
    id: "all-customers-trend",
    title: "ALL CUSTOMERS",
    subtitle: "Events, Last 7 days comparing to Previous Period",
    legendLabel: "All Order Events",
    yDomain: [0, 300],
    yTicks: [50, 100, 150, 200, 250, 300],
    data: [
      { date: "15 Jul", value: 205 },
      { date: "16 Jul", value: 250 },
      { date: "17 Jul", value: 220 },
      { date: "18 Jul", value: 210 },
      { date: "19 Jul", value: 195 },
      { date: "20 Jul", value: 24 },
      { date: "21 Jul", value: 2 },
    ],
  } as SingleLineCardData,
  sectionThree: {
    newCustomers: {
      id: "new-customers-stats",
      title: "NEW CUSTOMERS",
      subtitle: "Events, Last 7 days comparing to Previous Period",
      stats: [
        { label: "Profile Count", value: "578", change: "+18.93%", tone: "positive" },
        { label: "Average Total Price Paid", value: "$34.82", change: "-16.54%", tone: "negative" },
        { label: "Sum Total Price Paid", value: "$20.2k", change: "-0.57%", tone: "negative" },
      ],
    } as StatCardData,
    returningCustomers: {
      id: "returning-customers-stats",
      title: "RETURNING CUSTOMERS",
      subtitle: "Events, Last 7 days comparing to Previous Period",
      stats: [
        { label: "Profile Count", value: "753", change: "-9.39%", tone: "negative" },
        { label: "Event Count", value: "779", change: "-9.73%", tone: "negative" },
        { label: "Average Total Price Paid", value: "$47.00", change: "-2.67%", tone: "negative" },
        { label: "Sum Total Price Paid", value: "$36.6k", change: "-12.14%", tone: "negative" },
      ],
    } as StatCardData,
  },
  sectionFour: {
    newCustomersTrend: {
      id: "new-customers-trend",
      title: "NEW CUSTOMERS",
      subtitle: "Events, Last 7 days comparing to Previous Period",
      legendLabel: "All Order Events",
      yDomain: [0, 150],
      yTicks: [30, 60, 90, 120, 150],
      data: [
        { date: "15 Jul", value: 95 },
        { date: "16 Jul", value: 130 },
        { date: "17 Jul", value: 70 },
        { date: "18 Jul", value: 82 },
        { date: "19 Jul", value: 102 },
        { date: "20 Jul", value: 12 },
        { date: "21 Jul", value: 0 },
      ],
    } as SingleLineCardData,
    returningCustomersTrend: {
      id: "returning-customers-trend",
      title: "RETURNING CUSTOMERS",
      subtitle: "Events, Last 7 days comparing to Previous Period",
      legendLabel: "All Order Events",
      yDomain: [0, 150],
      yTicks: [30, 60, 90, 120, 150],
      data: [
        { date: "15 Jul", value: 112 },
        { date: "16 Jul", value: 127 },
        { date: "17 Jul", value: 121 },
        { date: "18 Jul", value: 118 },
        { date: "19 Jul", value: 124 },
        { date: "20 Jul", value: 18 },
        { date: "21 Jul", value: 0 },
      ],
    } as SingleLineCardData,
  },
  topProductsChart: {
    id: "all-customers-top-products-trend",
    title: "ALL CUSTOMERS TOP PRODUCTS L7D",
    subtitle: "Events, Last 7 days comparing to Previous Period",
    yDomain: [0, 40] as [number, number],
    series: [
      { key: "Allergy & Immune Bites for Dogs", label: "Allergy & Immune Bites for Dogs" },
      { key: "Probiotic Bites for Dogs", label: "Probiotic Bites for Dogs" },
      { key: "8-in-1 Multivitamin Bites for Dogs", label: "8-in-1 Multivitamin Bites for Dogs" },
      { key: "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil", label: "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil" },
      { key: "Hip & Joint Bites for Dogs", label: "Hip & Joint Bites for Dogs" },
    ] as ProductSeries[],
    data: [
      {
        date: "15 Jul",
        "Allergy & Immune Bites for Dogs": 25,
        "Probiotic Bites for Dogs": 20,
        "8-in-1 Multivitamin Bites for Dogs": 17,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 10,
        "Hip & Joint Bites for Dogs": 12,
      },
      {
        date: "16 Jul",
        "Allergy & Immune Bites for Dogs": 38,
        "Probiotic Bites for Dogs": 23,
        "8-in-1 Multivitamin Bites for Dogs": 19,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 12,
        "Hip & Joint Bites for Dogs": 14,
      },
      {
        date: "17 Jul",
        "Allergy & Immune Bites for Dogs": 36,
        "Probiotic Bites for Dogs": 21,
        "8-in-1 Multivitamin Bites for Dogs": 24,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 9,
        "Hip & Joint Bites for Dogs": 11,
      },
      {
        date: "18 Jul",
        "Allergy & Immune Bites for Dogs": 33,
        "Probiotic Bites for Dogs": 18,
        "8-in-1 Multivitamin Bites for Dogs": 20,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 10,
        "Hip & Joint Bites for Dogs": 9,
      },
      {
        date: "19 Jul",
        "Allergy & Immune Bites for Dogs": 29,
        "Probiotic Bites for Dogs": 16,
        "8-in-1 Multivitamin Bites for Dogs": 18,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 12,
        "Hip & Joint Bites for Dogs": 10,
      },
      {
        date: "20 Jul",
        "Allergy & Immune Bites for Dogs": 8,
        "Probiotic Bites for Dogs": 6,
        "8-in-1 Multivitamin Bites for Dogs": 7,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 9,
        "Hip & Joint Bites for Dogs": 5,
      },
      {
        date: "21 Jul",
        "Allergy & Immune Bites for Dogs": 1,
        "Probiotic Bites for Dogs": 1,
        "8-in-1 Multivitamin Bites for Dogs": 1,
        "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil": 1,
        "Hip & Joint Bites for Dogs": 1,
      },
    ] as MultiLinePoint[],
  },
  topProductsTable: {
    id: "all-customers-top-products-table",
    title: "ALL CUSTOMERS TOP PRODUCTS L7D",
    subtitle: "Events, Last 7 days comparing to Previous Period",
    rows: [
      {
        productName: "Allergy & Immune Bites for Dogs",
        eventCount: "192",
        eventCountChange: "-13.12%",
        eventCountTone: "negative",
        profileCount: "189",
        profileCountChange: "-10.43%",
        profileCountTone: "negative",
        averagePricePaid: "$33.34",
        averagePricePaidChange: "-5.4%",
        averagePricePaidTone: "negative",
        sumPricePaid: "$6,402",
        sumPricePaidChange: "-17.82%",
        sumPricePaidTone: "negative",
      },
      {
        productName: "Probiotic Bites for Dogs",
        eventCount: "128",
        eventCountChange: "-5.88%",
        eventCountTone: "negative",
        profileCount: "114",
        profileCountChange: "-12.31%",
        profileCountTone: "negative",
        averagePricePaid: "$33.02",
        averagePricePaidChange: "-7.86%",
        averagePricePaidTone: "negative",
        sumPricePaid: "$4,227",
        sumPricePaidChange: "-13.28%",
        sumPricePaidTone: "negative",
      },
      {
        productName: "8-in-1 Multivitamin Bites for Dogs",
        eventCount: "118",
        eventCountChange: "-11.28%",
        eventCountTone: "negative",
        profileCount: "116",
        profileCountChange: "-11.45%",
        profileCountTone: "negative",
        averagePricePaid: "$39.35",
        averagePricePaidChange: "+6.7%",
        averagePricePaidTone: "positive",
        sumPricePaid: "$4,644",
        sumPricePaidChange: "-5.34%",
        sumPricePaidTone: "negative",
      },
      {
        productName: "Wild Alaskan Omega-3 Blend Pollock + Salmon Oil",
        eventCount: "73",
        eventCountChange: "-17.05%",
        eventCountTone: "negative",
        profileCount: "72",
        profileCountChange: "-16.28%",
        profileCountTone: "negative",
        averagePricePaid: "$28.48",
        averagePricePaidChange: "+2.19%",
        averagePricePaidTone: "positive",
        sumPricePaid: "$2,079",
        sumPricePaidChange: "-15.23%",
        sumPricePaidTone: "negative",
      },
      {
        productName: "Hip & Joint Bites for Dogs",
        eventCount: "58",
        eventCountChange: "+31.82%",
        eventCountTone: "positive",
        profileCount: "56",
        profileCountChange: "+27.27%",
        profileCountTone: "positive",
        averagePricePaid: "$27.70",
        averagePricePaidChange: "-6.08%",
        averagePricePaidTone: "negative",
        sumPricePaid: "$1,606",
        sumPricePaidChange: "+23.8%",
        sumPricePaidTone: "positive",
      },
      {
        productName: "Senior Advanced 11-in-1 Multivitamin Bites for Senior Dogs",
        eventCount: "49",
        eventCountChange: "-36.36%",
        eventCountTone: "negative",
        profileCount: "48",
        profileCountChange: "-37.66%",
        profileCountTone: "negative",
        averagePricePaid: "$49.29",
        averagePricePaidChange: "-4.58%",
        averagePricePaidTone: "negative",
        sumPricePaid: "$2,415",
        sumPricePaidChange: "-39.28%",
        sumPricePaidTone: "negative",
      },
      {
        productName: "Senior Advanced Hip & Joint Bites for Senior Dogs",
        eventCount: "39",
        eventCountChange: "+2.63%",
        eventCountTone: "positive",
        profileCount: "39",
        profileCountChange: "+2.63%",
        profileCountTone: "positive",
        averagePricePaid: "$50.76",
        averagePricePaidChange: "+5.93%",
        averagePricePaidTone: "positive",
        sumPricePaid: "$1,980",
        sumPricePaidChange: "+8.72%",
        sumPricePaidTone: "positive",
      },
      {
        productName: "Vet Strength Hip & Joint Bites for Dogs",
        eventCount: "35",
        eventCountChange: "-10.26%",
        eventCountTone: "negative",
        profileCount: "35",
        profileCountChange: "-7.89%",
        profileCountTone: "negative",
        averagePricePaid: "$44.96",
        averagePricePaidChange: "-3.88%",
        averagePricePaidTone: "negative",
        sumPricePaid: "$1,573",
        sumPricePaidChange: "-13.74%",
        sumPricePaidTone: "negative",
      },
    ] as ProductTableRow[],
    footer: {
      showingResults: "91",
      eventCountSum: "1,389",
      profileCountSum: "1,350",
      averagePricePaidAvg: "$31.88",
      sumPricePaidSum: "$48.6k",
    },
  },
};

function changeBadgeClasses(tone: ChangeTone): string {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "negative") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted text-muted-foreground";
}

function MetricCell({ item }: { item: StatItem }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 px-3 py-3 text-center sm:border-l sm:border-border/60 first:sm:border-l-0">
      <p className="text-xs text-foreground-secondary">{item.label}</p>
      <p className="text-3xl font-bold leading-none text-foreground">{item.value}</p>
      {item.change ? (
        <span
          className={cn(
            "inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            changeBadgeClasses(item.tone ?? "neutral"),
          )}
        >
          {item.change}
        </span>
      ) : (
        <span className="inline-flex min-w-14 items-center justify-center text-xs text-muted-foreground">-</span>
      )}
    </div>
  );
}

function StatsCard({ card, hoverAdd }: { card: StatCardData; hoverAdd?: boolean }) {
  return (
    <article className="group relative rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      {hoverAdd ? (
        <button
          type="button"
          aria-label="Add row"
          className="absolute -left-8 top-4 hidden size-6 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary opacity-0 transition-opacity group-hover:opacity-100 md:inline-flex"
        >
          <Plus className="size-3.5" />
        </button>
      ) : null}
      <div className="mb-1.5 flex items-center gap-2">
        <CalendarDays className="size-3.5 text-foreground-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{card.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>
      <div
        className={cn(
          "grid divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 sm:divide-y-0",
          card.stats.length === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : card.stats.length === 4
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5",
        )}
      >
        {card.stats.map((item) => (
          <MetricCell key={`${card.id}-${item.label}`} item={item} />
        ))}
      </div>
    </article>
  );
}

function SingleLineCard({ card }: { card: SingleLineCardData }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <CalendarDays className="size-3.5 text-foreground-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{card.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>
      <div className="mb-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-600" />
          {card.legendLabel}
        </span>
      </div>
      <div className="h-64 rounded-lg border border-border/60 bg-background/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={card.data} margin={{ top: 12, right: 10, left: 6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              domain={card.yDomain}
              ticks={card.yTicks}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={32}
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

function MultiLineTopProductsCard() {
  const card = GENERAL_REPORTING_DATA.topProductsChart;
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <CalendarDays className="size-3.5 text-foreground-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{card.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {card.series.map((series) => (
          <span
            key={series.key}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground-secondary"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PRODUCT_SERIES_COLORS[series.key] }}
            />
            {series.label}
          </span>
        ))}
        <span className="ml-auto text-xs font-medium text-foreground-secondary">Next [0/5]</span>
      </div>

      <div className="h-72 rounded-lg border border-border/60 bg-background/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={card.data} margin={{ top: 12, right: 12, left: 6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={card.yDomain} tickLine={false} axisLine={false} fontSize={11} width={32} />
            {card.series.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={PRODUCT_SERIES_COLORS[series.key]}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function TableValueCell({ value, change, tone }: { value: string; change: string; tone: ChangeTone }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-medium text-foreground">{value}</span>
      <span
        className={cn(
          "inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          changeBadgeClasses(tone),
        )}
      >
        {change}
      </span>
    </div>
  );
}

function TopProductsTableCard() {
  const card = GENERAL_REPORTING_DATA.topProductsTable;
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <CalendarDays className="size-3.5 text-foreground-secondary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.02em] text-foreground">{card.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground-secondary">{card.subtitle}</p>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="min-w-full border-collapse">
          <thead className="bg-background/80">
            <tr className="border-b border-border/70 text-left text-xs font-semibold text-foreground-secondary">
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1">
                  Event Count
                  <MoveDown className="size-3.5" />
                </span>
              </th>
              <th className="px-4 py-3 text-right">Profile Count</th>
              <th className="px-4 py-3 text-right">Average of Price Paid</th>
              <th className="px-4 py-3 text-right">Sum of Price Paid</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row) => (
              <tr key={row.productName} className="border-b border-border/60 align-top last:border-b-0">
                <td className="px-4 py-3.5 text-sm text-foreground">{row.productName}</td>
                <td className="px-4 py-3.5 text-sm">
                  <TableValueCell value={row.eventCount} change={row.eventCountChange} tone={row.eventCountTone} />
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <TableValueCell value={row.profileCount} change={row.profileCountChange} tone={row.profileCountTone} />
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <TableValueCell value={row.averagePricePaid} change={row.averagePricePaidChange} tone={row.averagePricePaidTone} />
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <TableValueCell value={row.sumPricePaid} change={row.sumPricePaidChange} tone={row.sumPricePaidTone} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/70 bg-background/70 text-sm">
              <td className="px-4 py-3 text-foreground-secondary">
                Showing <span className="font-semibold text-teal-600">{card.footer.showingResults}</span> results
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">SUM {card.footer.eventCountSum}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">SUM {card.footer.profileCountSum}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">AVG {card.footer.averagePricePaidAvg}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">SUM {card.footer.sumPricePaidSum}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground"
        >
          <Plus className="size-4" />
          ADD ROW
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

export function GeneralReportingDashboard() {
  const {
    dateRangeLabel,
    viewLabel,
    sectionOneStats,
    sectionTwoTrend,
    sectionThree,
    sectionFour,
  } = GENERAL_REPORTING_DATA;

  return (
    <div
      className="h-full overflow-y-auto rounded-xl border border-border/70 bg-background p-4 md:p-6"
      style={{ fontFamily: "Rubik, 'Nunito Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-extrabold uppercase tracking-[0.02em] text-foreground">GENERAL REPORTING</h1>

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

      <div className="space-y-4">
        <StatsCard card={sectionOneStats} hoverAdd />
        <SingleLineCard card={sectionTwoTrend} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <StatsCard card={sectionThree.newCustomers} />
          <StatsCard card={sectionThree.returningCustomers} />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <SingleLineCard card={sectionFour.newCustomersTrend} />
          <SingleLineCard card={sectionFour.returningCustomersTrend} />
        </div>

        <MultiLineTopProductsCard />
        <TopProductsTableCard />
      </div>
    </div>
  );
}

export default GeneralReportingDashboard;
