import { cn } from "@/lib/utils";
import { RiBarChartLine, RiLineChartLine, RiTable2, RiFullscreenLine } from "@remixicon/react";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { DataTable } from "./DataTable";
import type { ArtifactBlock } from "@/data/mock";

function ArtifactIcon({ type }: { type: string }) {
  if (type === "bar_chart") return <RiBarChartLine className="size-3.5 text-muted-foreground shrink-0" />;
  if (type === "line_chart") return <RiLineChartLine className="size-3.5 text-muted-foreground shrink-0" />;
  return <RiTable2 className="size-3.5 text-muted-foreground shrink-0" />;
}

interface ArtifactCardProps {
  block: ArtifactBlock;
  onExpand?: () => void;
  expanded?: boolean;
}

export function ArtifactCard({ block, onExpand, expanded }: ArtifactCardProps) {
  const { artifact } = block;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <ArtifactIcon type={artifact.type} />
        <span className="text-sm font-medium flex-1 truncate">{artifact.name}</span>
        {onExpand && <RiFullscreenLine className="size-3.5 text-muted-foreground shrink-0 ml-auto" />}
      </button>

      {/* Description */}
      {artifact.description && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
          {artifact.description}
        </p>
      )}

      {/* Chart / table */}
      <div className={cn(artifact.type === "data_table" ? "max-h-64 overflow-y-auto" : "p-2")}>
        {artifact.type === "bar_chart" && (
          <div className={expanded ? "h-80" : "h-52"}>
            <BarChart data={artifact.data} height={expanded ? 320 : 208} />
          </div>
        )}
        {artifact.type === "line_chart" && (
          <div className={expanded ? "h-80" : "h-52"}>
            <LineChart data={artifact.data} height={expanded ? 320 : 208} />
          </div>
        )}
        {artifact.type === "data_table" && (
          <DataTable cols={artifact.cols} rows={artifact.rows} />
        )}
      </div>
    </div>
  );
}
