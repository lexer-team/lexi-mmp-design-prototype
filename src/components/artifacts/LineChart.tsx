import type { LineChartDatum } from "@/data/mock";

interface LineChartProps {
  data: LineChartDatum[];
  height?: number;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export function LineChart({ data, height = 220 }: LineChartProps) {
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const width = 560;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.05;

  const getX = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padTop + chartH - ((v - min) / (max - min)) * chartH;

  const pathD = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.value)}`)
    .join(" ");

  // Area fill
  const areaD =
    pathD +
    ` L ${getX(data.length - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    min + ((max - min) / ticks) * i,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(62.698% 0.10432 189.917)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(62.698% 0.10432 189.917)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((tick, i) => {
        const y = getY(tick);
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

      {/* Area */}
      <path d={areaD} fill="url(#lineAreaGrad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="oklch(62.698% 0.10432 189.917)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(d.value)}
          r={3}
          fill="white"
          stroke="oklch(62.698% 0.10432 189.917)"
          strokeWidth={2}
        />
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={getX(i)}
          y={padTop + chartH + 16}
          textAnchor="middle"
          fontSize={8.5}
          fill="currentColor"
          fillOpacity={0.45}
        >
          {d.date}
        </text>
      ))}
    </svg>
  );
}
