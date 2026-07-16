import type { BarChartDatum } from "@/data/mock";

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
}

const TEAL = "oklch(62.698% 0.10432 189.917)";
const COLORS = [
  "oklch(62.698% 0.10432 189.917)",
  "oklch(72.328% 0.12487 190.133)",
  "oklch(52.708% 0.08278 190.639)",
  "oklch(76.875% 0.10401 190.549)",
  "oklch(43.128% 0.06234 190.596)",
  "oklch(81.44% 0.08332 189.923)",
  "oklch(33.294% 0.04157 190.557)",
  "oklch(86.094% 0.06231 189.804)",
];

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export function BarChart({ data, height = 220 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  const padLeft = 48;
  const padRight = 16;
  const padTop = 12;
  const padBottom = 48;
  const width = 560;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const barGap = 8;
  const barW = Math.floor((chartW - barGap * (data.length - 1)) / data.length);

  // Y-axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y grid lines & labels */}
      {yTicks.map((tick, i) => {
        const y = padTop + chartH - (tick / max) * chartH;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={padLeft - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.4}
            >
              {formatValue(tick)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = padLeft + i * (barW + barGap);
        const y = padTop + chartH - barH;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={COLORS[i % COLORS.length]}
              rx={3}
              opacity={0.85}
            />
            {/* Value label on top */}
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {formatValue(d.value)}
            </text>
            {/* X label */}
            <text
              x={x + barW / 2}
              y={padTop + chartH + 14}
              textAnchor="middle"
              fontSize={8.5}
              fill="currentColor"
              fillOpacity={0.55}
            >
              {d.label.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
