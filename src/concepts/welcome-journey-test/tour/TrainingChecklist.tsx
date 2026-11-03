import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { TOUR_STOPS, TRAINING_STEPS, type TrainingState } from "./tourData";

export function TrainingChecklist({
  training,
  onSkipStep,
  onLeave,
  onBackToTour,
  onContinueTour,
}: {
  training: TrainingState;
  onSkipStep: () => void;
  onLeave: () => void;
  onBackToTour: () => void;
  onContinueTour: () => void;
}) {
  const steps = TRAINING_STEPS[training.feature];
  const complete = training.steps.every(Boolean);
  const nextStop = TOUR_STOPS[training.pausedStop + 1];
  const featureTitle = training.feature === "new-chat"
    ? "New Chat"
    : training.feature === "segments" ? "Segments" : "Activations";
  const nextIncompleteStep = training.steps.findIndex((done) => !done);

  return (
    <aside aria-label={`${featureTitle} training checklist`} className="fixed inset-x-4 bottom-20 top-auto z-[65] flex max-h-[45vh] flex-col overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl lg:inset-x-auto lg:right-4 lg:top-16 lg:max-h-none lg:w-[min(320px,calc(100vw-2rem))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Explore {featureTitle}</p>
          <p className="mt-1 text-xs text-foreground-secondary">{steps.length} steps · about {training.feature === "segments" ? 3 : 2} minutes</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-foreground-secondary">Training</span>
      </div>

      {training.activationCancelled ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Activation cancelled</p>
          <p className="mt-1 text-xs">Your tour is paused at {TOUR_STOPS[training.pausedStop].title}.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onBackToTour}>Back to tour</Button>
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const done = training.steps[index];
            const current = !complete && nextIncompleteStep === index;
            return (
              <li key={step} className={cn("rounded-lg border p-3", done ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : current ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
                <div className="flex items-start gap-2">
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", done ? "bg-emerald-600 text-white" : "bg-muted text-foreground-secondary")}>
                    {done ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", done ? "font-medium text-emerald-900 dark:text-emerald-200" : "text-foreground")}>{step}</p>
                    {current && training.feature === "segments" && index === 0 && (
                      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">Use the suggested question or type your own about the seeded Repeat purchasers cohort.</p>
                    )}
                    {current && training.feature === "segments" && index === 1 && (
                      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">After Lexi answers, choose “Build a segment from these results.”</p>
                    )}
                    {current && training.feature === "segments" && index === 2 && (
                      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">Review the sample rules and confirm the assumptions before saving.</p>
                    )}
                    {current && training.feature === "segments" && index === 4 && (
                      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">Use the highlighted panel tabs. Click Customers or In activations to complete this step.</p>
                    )}
                    {current && training.feature === "segments" && index === 5 && (
                      <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">Select the segment name at the top of the panel to open its full page.</p>
                    )}
                    {current && !done && !complete && !training.activationCancelled && (
                      <button type="button" className="mt-2 text-xs font-medium text-foreground-secondary underline underline-offset-2 hover:text-foreground" onClick={onSkipStep}>Skip step</button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {complete && !training.activationCancelled && (
        <Button className="mt-4 w-full" onClick={onContinueTour}>
          Continue the tour: {nextStop?.title ?? "Finish"}
        </Button>
      )}

      <div className="mt-auto border-t border-border pt-3">
        <button type="button" className="text-xs font-medium text-foreground-secondary underline underline-offset-2 hover:text-foreground" onClick={onLeave}>
          Leave training
        </button>
      </div>
    </aside>
  );
}