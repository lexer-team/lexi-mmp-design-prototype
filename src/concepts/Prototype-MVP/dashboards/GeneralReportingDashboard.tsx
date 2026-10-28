import { useState } from "react";
import { CalendarDays, ChevronDown, MoreVertical, MoveDown, Plus } from "lucide-react";
import { RefreshCw, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
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

function LegacyGeneralReportingDashboard() {
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

type DashboardMetric = {
  label: string;
  value: string;
  delta?: string;
  prior?: string;
  direction?: "up" | "down";
  description: string;
  unavailable?: boolean;
};

type DashboardPoint = {
  date: string;
  revenue: number;
  revenueLastYear: number;
  orders: number;
  ordersLastYear: number;
  segmentRevenue: number;
  segmentRevenueLastYear: number;
  segmentOrders: number;
  segmentOrdersLastYear: number;
};

const DASHBOARD_TREND_DATA: DashboardPoint[] = [
  { date: "28 Sep", revenue: 48000, revenueLastYear: 50000, orders: 312, ordersLastYear: 305, segmentRevenue: 28600, segmentRevenueLastYear: 27500, segmentOrders: 146, segmentOrdersLastYear: 139 },
  { date: "1 Oct", revenue: 44500, revenueLastYear: 31500, orders: 326, ordersLastYear: 204, segmentRevenue: 26800, segmentRevenueLastYear: 21900, segmentOrders: 153, segmentOrdersLastYear: 105 },
  { date: "4 Oct", revenue: 47500, revenueLastYear: 45000, orders: 286, ordersLastYear: 272, segmentRevenue: 27900, segmentRevenueLastYear: 26400, segmentOrders: 141, segmentOrdersLastYear: 133 },
  { date: "7 Oct", revenue: 46500, revenueLastYear: 35000, orders: 305, ordersLastYear: 326, segmentRevenue: 28100, segmentRevenueLastYear: 26100, segmentOrders: 145, segmentOrdersLastYear: 149 },
  { date: "10 Oct", revenue: 64000, revenueLastYear: 50500, orders: 376, ordersLastYear: 307, segmentRevenue: 38400, segmentRevenueLastYear: 30600, segmentOrders: 182, segmentOrdersLastYear: 151 },
  { date: "13 Oct", revenue: 39000, revenueLastYear: 46000, orders: 248, ordersLastYear: 340, segmentRevenue: 23400, segmentRevenueLastYear: 28800, segmentOrders: 124, segmentOrdersLastYear: 162 },
  { date: "16 Oct", revenue: 65000, revenueLastYear: 58000, orders: 360, ordersLastYear: 315, segmentRevenue: 39000, segmentRevenueLastYear: 34800, segmentOrders: 178, segmentOrdersLastYear: 155 },
  { date: "19 Oct", revenue: 58000, revenueLastYear: 39500, orders: 326, ordersLastYear: 302, segmentRevenue: 34800, segmentRevenueLastYear: 28100, segmentOrders: 161, segmentOrdersLastYear: 147 },
  { date: "22 Oct", revenue: 69000, revenueLastYear: 34000, orders: 375, ordersLastYear: 218, segmentRevenue: 41400, segmentRevenueLastYear: 24000, segmentOrders: 187, segmentOrdersLastYear: 108 },
  { date: "25 Oct", revenue: 57000, revenueLastYear: 55000, orders: 322, ordersLastYear: 318, segmentRevenue: 34200, segmentRevenueLastYear: 33000, segmentOrders: 159, segmentOrdersLastYear: 157 },
];

const SALES_METRICS: DashboardMetric[] = [
  { label: "Revenue", value: "A$1.37m", delta: "+1.9%", prior: "A$1.34m", direction: "up", description: "Total sales revenue for the selected period." },
  { label: "Orders", value: "8,166", delta: "+6.1%", prior: "7,694", direction: "up", description: "Orders placed in the selected period." },
  { label: "Average Order Value", value: "A$167.87", delta: "−3.9%", prior: "A$174.74", direction: "down", description: "Average revenue per order." },
  { label: "New Customer %", value: "12.8%", delta: "−3.7 pts", prior: "16.5%", direction: "down", description: "Share of orders from new customers." },
  { label: "Margin %", value: "Not available", description: "Coming after BFCM. Margin needs the cost of goods at the time of sale, which isn't available yet.", unavailable: true },
];

const SEGMENT_METRICS: DashboardMetric[] = [
  { label: "Revenue", value: "A$890k", delta: "+2.6%", prior: "A$867k", direction: "up", description: "Revenue from tracked customer segments." },
  { label: "Orders", value: "4,221", delta: "+5.1%", prior: "4,016", direction: "up", description: "Orders from tracked customer segments." },
  { label: "Average Order Value", value: "A$210.85", delta: "−2.4%", prior: "A$216.04", direction: "down", description: "Average order value across tracked segments." },
  { label: "New Customer %", value: "18.4%", delta: "+1.2 pts", prior: "17.2%", direction: "up", description: "New customer share across tracked segments." },
  { label: "Margin %", value: "Not available", description: "Coming after BFCM. Margin needs the cost of goods at the time of sale, which isn't available yet.", unavailable: true },
];

function formatDashboardDate(value: string, includeYear = false) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}

function formatDashboardRange(start: string, end: string) {
  if (!start || !end) return "Select dates";
  return `${formatDashboardDate(start)} – ${formatDashboardDate(end, true)}`;
}

function DashboardMetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className={cn(
      "min-h-[126px] rounded-xl border border-border bg-card p-4",
      metric.unavailable && "border-dashed bg-background",
    )}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground-secondary">{metric.label}</span>
        <button type="button" title={metric.description} aria-label={`About ${metric.label}`} className="text-muted-foreground hover:text-foreground">
          <Info className="size-3.5" />
        </button>
      </div>
      <p className={cn("mt-1 text-2xl font-bold leading-none text-foreground", metric.unavailable && "text-base")}>{metric.value}</p>
      {metric.unavailable ? (
        <p className="mt-3 text-xs leading-relaxed text-foreground-secondary">{metric.description}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            metric.direction === "up" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
          )}>
            {metric.direction === "up" ? "↗" : "↘"} {metric.delta}
          </span>
          <span className="text-xs text-foreground-secondary">Last year {metric.prior}</span>
        </div>
      )}
    </article>
  );
}

function DashboardChartTable({
  data,
  measure,
}: {
  data: Array<{ date: string; current: number; lastYear: number }>;
  measure: "revenue" | "orders";
}) {
  const formatValue = (value: number) => measure === "revenue"
    ? `A$${value.toLocaleString("en-AU")}`
    : value.toLocaleString("en-AU");

  return (
    <div className="max-h-[250px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">This period</TableHead>
            <TableHead className="text-right">Last year</TableHead>
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((point) => {
            const change = point.lastYear === 0 ? 0 : ((point.current - point.lastYear) / point.lastYear) * 100;
            return (
              <TableRow key={point.date}>
                <TableCell>{point.date}</TableCell>
                <TableCell className="text-right tabular-nums">{formatValue(point.current)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatValue(point.lastYear)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", change >= 0 ? "text-primary" : "text-destructive")}>
                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function DashboardTrendCard({
  title,
  measure,
  data,
}: {
  title: string;
  measure: "revenue" | "orders";
  data: Array<{ date: string; current: number; lastYear: number }>;
}) {
  const [showTable, setShowTable] = useState(false);
  const axisStep = measure === "revenue" ? 10000 : 100;
  const maxValue = Math.max(...data.flatMap((point) => [point.current, point.lastYear]));
  const axisMax = Math.ceil(maxValue / axisStep) * axisStep;
  const axisTicks = Array.from({ length: axisMax / axisStep + 1 }, (_, index) => index * axisStep);
  const formatTooltip = (value: number | string, name: string) => [
    measure === "revenue" ? `A$${Number(value).toLocaleString("en-AU")}` : Number(value).toLocaleString("en-AU"),
    name,
  ];

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-foreground-secondary">Daily, both periods</span>
      </div>
      {showTable ? (
        <DashboardChartTable data={data} measure={measure} />
      ) : (
        <div className="h-[250px] w-full" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            {measure === "revenue" ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                <YAxis domain={[0, axisMax]} ticks={axisTicks} tickLine={false} axisLine={false} fontSize={10} width={52} tickFormatter={(value) => `A$${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={formatTooltip} contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={25} iconSize={8} />
                <Line type="monotone" dataKey="current" name="This period" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="lastYear" name="Last year" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                <YAxis domain={[0, axisMax]} ticks={axisTicks} tickLine={false} axisLine={false} fontSize={10} width={36} />
                <Tooltip formatter={formatTooltip} contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={25} iconSize={8} />
                <Bar dataKey="current" name="This period" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lastYear" name="Last year" fill="var(--muted-foreground)" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <button type="button" onClick={() => setShowTable((visible) => !visible)} className="mt-2 text-xs font-semibold text-foreground-secondary underline-offset-2 hover:text-foreground hover:underline">
        {showTable ? "Show chart" : "Show as table"}
      </button>
    </article>
  );
}

function DashboardReportView({
  mode,
  start,
  end,
}: {
  mode: "sales" | "segments";
  start: string;
  end: string;
}) {
  const segmentMode = mode === "segments";
  const metrics = segmentMode ? SEGMENT_METRICS : SALES_METRICS;
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  const points = DASHBOARD_TREND_DATA.map((point, index) => {
    const progress = index / (DASHBOARD_TREND_DATA.length - 1);
    const date = Number.isFinite(startTime) && Number.isFinite(endTime)
      ? new Date(startTime + (endTime - startTime) * progress)
      : null;
    const label = date ? date.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : point.date;
    return segmentMode
      ? { date: label, current: point.segmentRevenue, lastYear: point.segmentRevenueLastYear, orders: point.segmentOrders, ordersLastYear: point.segmentOrdersLastYear }
      : { date: label, current: point.revenue, lastYear: point.revenueLastYear, orders: point.orders, ordersLastYear: point.ordersLastYear };
  });
  const revenueData = points.map(({ date, current, lastYear }) => ({ date, current, lastYear }));
  const ordersData = points.map(({ date, orders, ordersLastYear }) => ({ date, current: orders, lastYear: ordersLastYear }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => <DashboardMetricCard key={metric.label} metric={metric} />)}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DashboardTrendCard title={segmentMode ? "Segment Revenue Over Time" : "Revenue Over Time"} measure="revenue" data={revenueData} />
        <DashboardTrendCard title={segmentMode ? "Segment Orders Over Time" : "Orders Over Time"} measure="orders" data={ordersData} />
      </div>
    </>
  );
}

export function GeneralReportingDashboard() {
  const [view, setView] = useState<"sales" | "segments">("sales");
  const [viewStart, setViewStart] = useState("2026-09-28");
  const [viewEnd, setViewEnd] = useState("2026-10-25");
  const [compareStart, setCompareStart] = useState("2025-09-28");
  const [compareEnd, setCompareEnd] = useState("2025-10-25");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState("Refreshed just now");

  const refresh = () => setRefreshedAt(`Refreshed ${new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-[1056px] px-4 py-6 md:px-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboards</h1>
            <p className="mt-1 text-xs text-foreground-secondary">Sydney time · Amounts in AUD</p>
          </div>

          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <div className="relative flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setPickerOpen((open) => !open)} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left hover:bg-accent/40">
                <span className="flex flex-col">
                  <span className="text-[10px] font-semibold text-primary">Viewing</span>
                  <span className="text-xs font-semibold text-foreground">{formatDashboardRange(viewStart, viewEnd)}</span>
                </span>
              </button>
              <span className="text-xs font-semibold text-foreground-secondary">vs.</span>
              <button type="button" onClick={() => setPickerOpen((open) => !open)} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left hover:bg-accent/40">
                <span className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground">Compared to</span>
                  <span className="text-xs font-semibold text-foreground">{formatDashboardRange(compareStart, compareEnd)}</span>
                </span>
              </button>
              <button type="button" aria-label="Choose date ranges" title="Choose date ranges" onClick={() => setPickerOpen((open) => !open)} className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground-secondary hover:bg-accent/40 hover:text-foreground">
                <CalendarDays className="size-4" />
              </button>
              <button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground-secondary hover:bg-accent/40 hover:text-foreground">
                <RefreshCw className="size-4" />
                Refresh
              </button>

              {pickerOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-foreground">Viewing</legend>
                      <label className="block text-xs text-foreground-secondary">Start date<input type="date" value={viewStart} onChange={(event) => setViewStart(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input-border bg-input px-2 text-sm text-foreground" /></label>
                      <label className="block text-xs text-foreground-secondary">End date<input type="date" value={viewEnd} onChange={(event) => setViewEnd(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input-border bg-input px-2 text-sm text-foreground" /></label>
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-foreground">Compared to</legend>
                      <label className="block text-xs text-foreground-secondary">Start date<input type="date" value={compareStart} onChange={(event) => setCompareStart(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input-border bg-input px-2 text-sm text-foreground" /></label>
                      <label className="block text-xs text-foreground-secondary">End date<input type="date" value={compareEnd} onChange={(event) => setCompareEnd(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input-border bg-input px-2 text-sm text-foreground" /></label>
                    </fieldset>
                  </div>
                  <div className="mt-4 flex justify-end border-t border-border pt-3">
                    <button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Done</button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{refreshedAt}</p>
          </div>
        </header>

        <Tabs value={view} onValueChange={(value) => setView(value as "sales" | "segments")} className="mt-6">
          <TabsList variant="underline">
            <TabsTrigger value="sales">Sales Performance</TabsTrigger>
            <TabsTrigger value="segments">Segment Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="mt-4 outline-none">
            <DashboardReportView mode="sales" start={viewStart} end={viewEnd} />
          </TabsContent>
          <TabsContent value="segments" className="mt-4 outline-none">
            <DashboardReportView mode="segments" start={viewStart} end={viewEnd} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default GeneralReportingDashboard;
