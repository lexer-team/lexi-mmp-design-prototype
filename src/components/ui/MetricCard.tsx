import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

/* metric card (chart-less): label, large value, delta badge */

interface MetricCardProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" };
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, delta, hint, icon, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs p-5 flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        {delta && (
          <Badge variant={delta.direction === "up" ? "success" : "danger"}>
            {delta.direction === "up" ? "↑" : "↓"} {delta.value}
          </Badge>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
