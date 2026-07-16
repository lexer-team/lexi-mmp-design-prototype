import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { RiCheckLine } from "@remixicon/react";

/* progress steps: horizontal or vertical stepper with complete / current /
   upcoming states. Built shadcn-style (composition, semantic tokens) — no shadcn
   primitive exists. `current` is the zero-based index of the active step. */

export interface Step {
  label: React.ReactNode;
  description?: React.ReactNode;
}

type StepState = "complete" | "current" | "upcoming";

function stateOf(index: number, current: number): StepState {
  return index < current ? "complete" : index === current ? "current" : "upcoming";
}

function StepCircle({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
        state === "complete" && "bg-primary text-primary-foreground",
        state === "current" && "border-2 border-primary bg-background text-primary",
        state === "upcoming" && "border border-border bg-background text-muted-foreground",
      )}
    >
      {state === "complete" ? <RiCheckLine className="size-4" /> : index + 1}
    </span>
  );
}

export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  className,
}: {
  steps: Step[];
  current: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  if (orientation === "vertical") {
    return (
      <ol className={cn("flex flex-col", className)}>
        {steps.map((s, i) => {
          const state = stateOf(i, current);
          const isLast = i === steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-3.5 top-8 bottom-0 w-0.5 -translate-x-1/2",
                    i < current ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <StepCircle state={state} index={i} />
              <div className="flex flex-col gap-0.5 pt-0.5">
                <p className={cn("text-sm font-medium", state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {s.label}
                </p>
                {s.description && <p className="text-sm text-foreground-secondary">{s.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((s, i) => {
        const state = stateOf(i, current);
        const isLast = i === steps.length - 1;
        return (
          <Fragment key={i}>
            <li className="flex flex-col items-center gap-2">
              <StepCircle state={state} index={i} />
              <div className="max-w-[8rem] text-center">
                <p className={cn("text-sm font-medium", state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {s.label}
                </p>
                {s.description && <p className="text-xs text-foreground-secondary">{s.description}</p>}
              </div>
            </li>
            {!isLast && (
              <div className={cn("mx-2 mt-3.5 h-0.5 flex-1 rounded-full", i < current ? "bg-primary" : "bg-border")} />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
