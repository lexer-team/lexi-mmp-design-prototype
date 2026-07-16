import { RiLoader4Line } from "@remixicon/react";

function toNaturalThinkingLines(steps: ThinkingStep[]): string[] {
  const cleaned = steps
    .map((step) => step.label || step.completedLabel)
    .map((line) => line.replace(/[`'"{}()[\]<>]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => {
      const base = line.replace(/[.:;,-]+$/g, "").trim();
      const normalized = base.charAt(0).toUpperCase() + base.slice(1);
      return normalized.endsWith(".") ? normalized : `${normalized}.`;
    });

  const unique: string[] = [];
  for (const line of cleaned) {
    if (!unique.includes(line)) unique.push(line);
  }

  if (unique.length === 0) {
    return [
      "Reviewing your request.",
      "Checking relevant context.",
      "Preparing a concise response.",
    ];
  }

  return unique.slice(0, 3);
}

export interface ThinkingStep {
  id: string;
  icon: string;
  label: string;
  completedLabel: string;
  durationMs?: number;
  sql?: string;
  status: "pending" | "active" | "done";
}

export function ThinkingProcess({
  steps,
  mode,
}: {
  steps: ThinkingStep[];
  mode: "active" | "collapsed";
  summary?: string;
}) {
  if (mode === "collapsed") {
    return null;
  }

  const lines = toNaturalThinkingLines(steps);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="space-y-1.5">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="flex items-start gap-2">
            <RiLoader4Line className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
