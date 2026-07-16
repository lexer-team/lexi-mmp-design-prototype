import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RiGroupLine,
  RiLightbulbLine,
  RiRouteLine,
  RiBarChartLine,
  RiDashboardLine,
  RiListOrdered2,
  RiArrowRightLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { ArtifactType } from "../types";
import { useSession } from "../store";

const TYPE_ICON: Record<ArtifactType, RemixiconComponentType> = {
  segment: RiGroupLine,
  insight: RiLightbulbLine,
  recommendation: RiListOrdered2,
  workflow: RiRouteLine,
  scorecard: RiBarChartLine,
  dashboard: RiDashboardLine,
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  segment: "Segment",
  insight: "Insight",
  recommendation: "Recommendation",
  workflow: "Workflow",
  scorecard: "Scorecard",
  dashboard: "Dashboard",
};

interface SummaryPointerProps {
  artifactId: string;
}

export function SummaryPointer({ artifactId }: SummaryPointerProps) {
  const { state } = useSession();
  const artifact = state.artifacts.get(artifactId);

  if (!artifact) return null;

  const Icon = TYPE_ICON[artifact.type];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
      <span className="flex size-5 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-3 text-primary" />
      </span>
      <Badge variant="secondary" size="sm">
        {TYPE_LABEL[artifact.type]}
      </Badge>
      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {artifact.name}
      </span>
      <Button size="xs" variant="ghost" className="h-6 px-2 text-[11px]">
        Open
        <RiArrowRightLine className="size-3" />
      </Button>
    </div>
  );
}
