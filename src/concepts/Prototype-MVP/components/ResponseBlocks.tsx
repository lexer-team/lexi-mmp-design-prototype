import { useId } from "react";
import type { ChartSpec, ChartUnit } from "../types";

// Brand teal, matching src/components/artifacts charts. Second+ series fall back
// to currentColor (theme foreground) at low opacity so they read as "baseline".
const TEAL = "oklch(62.698% 0.10432 189.917)";

function fmt(v: number, unit?: ChartUnit): string {
  switch (unit) {
    case "%": return `${v}%`;
    case "$": return `$${v}`;
    case "$K": return `$${v}K`;
    case "x": return `${v}x`;
    default: return v.toLocaleString();
  }
}

// ─── Chart block (bar or line) ──────────────────────────────────────────────────

export function ChartBlock({ chart }: { chart: ChartSpec }) {
  return (
    <figure className="rounded-lg border border-border/60 bg-card/40 px-3 py-3">
      {chart.title && (
        <figcaption className="mb-1 text-sm font-medium text-foreground">{chart.title}</figcaption>
      )}
      {chart.series.length > 1 && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {chart.series.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={i === 0 ? { background: TEAL } : { background: "currentColor", opacity: 0.25 }}
              />
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="w-full text-foreground">
        {chart.kind === "bar" ? <Bars chart={chart} /> : <Lines chart={chart} />}
      </div>
      {chart.caption && <p className="mt-2 text-xs text-muted-foreground">{chart.caption}</p>}
    </figure>
  );
}

// ── Grouped vertical bars ──

function Bars({ chart }: { chart: ChartSpec }) {
  const width = 560;
  const height = 196;
  const padL = 10;
  const padR = 10;
  const padTop = 18;
  const padBottom = 24;
  const chartW = width - padL - padR;
  const chartH = height - padTop - padBottom;

  const seriesN = chart.series.length;
  const groups = chart.data.length;
  const max = Math.max(...chart.data.flatMap((d) => d.values), 0) || 1;

  const groupW = chartW / groups;
  const groupInner = groupW * 0.62;
  const gap = 4;
  const barW = (groupInner - gap * (seriesN - 1)) / seriesN;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
      {/* baseline */}
      <line x1={padL} x2={width - padR} y1={padTop + chartH} y2={padTop + chartH} stroke="currentColor" strokeOpacity={0.12} />
      {chart.data.map((d, gi) => {
        const groupX = padL + gi * groupW + (groupW - groupInner) / 2;
        return (
          <g key={gi}>
            {d.values.map((v, si) => {
              const h = (v / max) * chartH;
              const x = groupX + si * (barW + gap);
              const y = padTop + chartH - h;
              return (
                <g key={si}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    rx={3}
                    fill={si === 0 ? TEAL : "currentColor"}
                    fillOpacity={si === 0 ? 0.9 : 0.22}
                  />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>
                    {fmt(v, chart.unit)}
                  </text>
                </g>
              );
            })}
            <text
              x={groupX + groupInner / 2}
              y={padTop + chartH + 15}
              textAnchor="middle"
              fontSize={9.5}
              fill="currentColor"
              fillOpacity={0.55}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Line chart (one or more series) ──

function Lines({ chart }: { chart: ChartSpec }) {
  const gradId = useId();
  const width = 560;
  const height = 188;
  const padL = 36;
  const padR = 12;
  const padTop = 14;
  const padBottom = 24;
  const chartW = width - padL - padR;
  const chartH = height - padTop - padBottom;

  const all = chart.data.flatMap((d) => d.values);
  const max = Math.max(...all) * 1.08 || 1;
  const min = Math.min(0, ...all);

  const x = (i: number) => padL + (i / Math.max(1, chart.data.length - 1)) * chartW;
  const y = (v: number) => padTop + chartH - ((v - min) / (max - min)) * chartH;

  const ticks = 3;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) / ticks) * i);
  const seriesN = chart.series.length;
  const labelEvery = Math.ceil(chart.data.length / 7);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TEAL} stopOpacity={0.18} />
          <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* y grid + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.08} />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.4}>
            {fmt(Math.round(t), chart.unit)}
          </text>
        </g>
      ))}

      {chart.series.map((_, si) => {
        const pts = chart.data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.values[si])}`).join(" ");
        const isPrimary = si === 0;
        const stroke = isPrimary ? TEAL : "currentColor";
        const area = `${pts} L ${x(chart.data.length - 1)} ${padTop + chartH} L ${x(0)} ${padTop + chartH} Z`;
        return (
          <g key={si}>
            {isPrimary && seriesN === 1 && <path d={area} fill={`url(#${gradId})`} />}
            <path d={pts} fill="none" stroke={stroke} strokeOpacity={isPrimary ? 1 : 0.35} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {chart.data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d.values[si])} r={2.5} fill="var(--color-card, white)" stroke={stroke} strokeOpacity={isPrimary ? 1 : 0.35} strokeWidth={1.75} />
            ))}
          </g>
        );
      })}

      {/* x labels (thinned) */}
      {chart.data.map((d, i) =>
        i % labelEvery === 0 || i === chart.data.length - 1 ? (
          <text key={i} x={x(i)} y={padTop + chartH + 15} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.45}>
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
