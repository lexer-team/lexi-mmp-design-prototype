import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TrainingChecklist } from "./TrainingChecklist";
import { QuickChatTourIntro, type QuickChatIntroStage } from "./QuickChatTourIntro";
import {
  TOUR_PROGRESS_EVENT,
  TOUR_SIDEBAR_EVENT,
  TOUR_START_EVENT,
  TOUR_STOPS,
  TOUR_STORAGE_KEY,
  TRAINING_STEPS,
  type ExploreFeature,
  type TrainingState,
} from "./tourData";

type SavedTour = { status: "in-progress" | "skipped" | "completed"; stop: number };
type ProgressSignal = { feature?: string; action?: string; text?: string; mentionIds?: string[] };
type SpotlightRect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

function readSavedTour(): SavedTour | null {
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedTour;
    return ["in-progress", "skipped", "completed"].includes(saved.status) ? saved : null;
  } catch {
    return null;
  }
}

function findTourAnchor(label: string): HTMLElement | null {
  if (label === "Your chats") {
    const chatHeading = Array.from(document.querySelectorAll<HTMLElement>("div, span"))
      .find((element) => element.childElementCount === 0 && ["Pinned Chats", "Recent Chats"].includes(element.innerText.trim()));
    return chatHeading ?? document.querySelector<HTMLElement>(".bg-sidebar.p-2");
  }

  return Array.from(document.querySelectorAll<HTMLElement>("button, [role='button']"))
    .find((element) => element.getAttribute("aria-label")?.trim() === label || element.title.trim() === label || element.innerText.trim() === label) ?? null;
}

function isSyntheticKickoff(text: string) {
  const prompt = text.trim().toLowerCase();
  return prompt === "build a new segment" || prompt === "build a new activation";
}

export function WelcomeJourneyTour({
  syncPromptOpen,
  onDismissSyncPrompt,
  onExploreOnMyOwn,
  onStartExplore,
  onTrainingStateChange,
  onMinimizeQuickChat,
}: {
  syncPromptOpen: boolean;
  onDismissSyncPrompt: () => void;
  onExploreOnMyOwn: () => void;
  onStartExplore: (feature: ExploreFeature) => void;
  onTrainingStateChange: (active: boolean) => void;
  onMinimizeQuickChat: () => void;
}) {
  const [savedTour, setSavedTour] = useState<SavedTour | null>(readSavedTour);
  const [tourStop, setTourStop] = useState<number | null>(() => {
    const saved = readSavedTour();
    return saved?.status === "in-progress" ? saved.stop : null;
  });
  const [tourRevision, setTourRevision] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [trainingSpotlightRect, setTrainingSpotlightRect] = useState<SpotlightRect | null>(null);
  const [quickChatIntroStage, setQuickChatIntroStage] = useState<QuickChatIntroStage | null>(null);
  const [training, setTraining] = useState<TrainingState | null>(null);

  const persistTour = (next: SavedTour) => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(next));
    setSavedTour(next);
  };

  const startTour = () => {
    onDismissSyncPrompt();
    window.dispatchEvent(new Event("welcome-journey-test:reset-quick-chat"));
    onTrainingStateChange(false);
    setTraining(null);
    persistTour({ status: "in-progress", stop: 0 });
    setQuickChatIntroStage("launcher");
    setSpotlightRect(null);
    setTourStop(null);
  };

  const beginNumberedTour = () => {
    onMinimizeQuickChat();
    setQuickChatIntroStage(null);
    persistTour({ status: "in-progress", stop: 0 });
    setTourRevision((revision) => revision + 1);
    setSpotlightRect(null);
    setTourStop(null);
    window.requestAnimationFrame(() => setTourStop(0));
  };

  const skipTour = () => {
    setQuickChatIntroStage(null);
    onTrainingStateChange(false);
    persistTour({ status: "skipped", stop: tourStop ?? 0 });
    setTourStop(null);
    setTraining(null);
  };

  const finishTour = () => {
    setQuickChatIntroStage(null);
    onTrainingStateChange(false);
    persistTour({ status: "completed", stop: TOUR_STOPS.length - 1 });
    setTourStop(null);
    setTraining(null);
  };

  const returnToTour = () => {
    if (!training) return;
    const stop = training.pausedStop;
    setTraining(null);
    onTrainingStateChange(false);
    persistTour({ status: "in-progress", stop });
    setTourStop(stop);
  };

  const startTraining = (feature: ExploreFeature) => {
    if (tourStop === null) return;
    setQuickChatIntroStage(null);
    const trainingState: TrainingState = {
      feature,
      pausedStop: tourStop,
      steps: TRAINING_STEPS[feature].map(() => false),
      chatSubmissions: 0,
      activationSetup: { rules: false, fieldMapping: false, destination: false },
      activationCancelled: false,
    };
    persistTour({ status: "in-progress", stop: tourStop });
    setTourStop(null);
    setTraining(trainingState);
    onTrainingStateChange(true);
    onStartExplore(feature);
  };

  const skipTrainingStep = () => {
    setTraining((current) => {
      if (!current) return current;
      const stepIndex = current.steps.findIndex((done) => !done);
      if (stepIndex < 0) return current;
      const steps = [...current.steps];
      steps[stepIndex] = true;
      return { ...current, steps };
    });
  };

  const continueTourAfterTraining = () => {
    if (!training) return;
    const nextStop = training.pausedStop + 1;
    setTraining(null);
    onTrainingStateChange(false);
    if (nextStop >= TOUR_STOPS.length) {
      finishTour();
      return;
    }
    persistTour({ status: "in-progress", stop: nextStop });
    setTourStop(nextStop);
  };

  useEffect(() => {
    const restartTour = () => startTour();
    window.addEventListener(TOUR_START_EVENT, restartTour);
    return () => window.removeEventListener(TOUR_START_EVENT, restartTour);
  }, [onDismissSyncPrompt]);

  useEffect(() => {
    if (tourStop === null) {
      window.dispatchEvent(new CustomEvent(TOUR_SIDEBAR_EVENT, { detail: { expanded: false } }));
      setSpotlightRect(null);
      return;
    }

    const stop = TOUR_STOPS[tourStop];
    const expandChats = stop.id === "chats";
    window.dispatchEvent(new CustomEvent(TOUR_SIDEBAR_EVENT, { detail: { expanded: expandChats } }));
    const updateRect = () => {
      const anchor = findTourAnchor(stop.anchor);
      if (!anchor) {
        setSpotlightRect(null);
        return false;
      }
      const rect = anchor.getBoundingClientRect();
      setSpotlightRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      return true;
    };

    let attempts = 0;
    const anchorRetry = window.setInterval(() => {
      attempts += 1;
      if (updateRect() || attempts >= 20) window.clearInterval(anchorRetry);
    }, 100);
    const anchorObserver = new MutationObserver(() => {
      if (updateRect()) anchorObserver.disconnect();
    });
    anchorObserver.observe(document.body, { childList: true, subtree: true });
    updateRect();
  const sidebarRefresh = expandChats ? window.setTimeout(updateRect, 100) : undefined;
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.clearInterval(anchorRetry);
      anchorObserver.disconnect();
      if (sidebarRefresh !== undefined) window.clearTimeout(sidebarRefresh);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [tourStop, tourRevision]);

  useEffect(() => {
    const shouldSpotlightPanelTabs = training?.feature === "segments" && training.steps[3] && !training.steps[4];
    if (!shouldSpotlightPanelTabs) {
      setTrainingSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      const anchor = document.querySelector<HTMLElement>('[data-training-anchor="segment-panel-tabs"]');
      if (!anchor) return false;
      const rect = anchor.getBoundingClientRect();
      setTrainingSpotlightRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      return true;
    };

    let attempts = 0;
    const anchorRetry = window.setInterval(() => {
      attempts += 1;
      if (updateRect() || attempts >= 20) window.clearInterval(anchorRetry);
    }, 100);
    const observer = new MutationObserver(() => {
      if (updateRect()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.clearInterval(anchorRetry);
      observer.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [training?.feature, training?.steps[3], training?.steps[4]]);

  useEffect(() => {
    if (!training) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        returnToTour();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [training?.pausedStop]);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<ProgressSignal>).detail;
      if (!detail) return;

      setTraining((current) => {
        if (!current) return current;
        const next: TrainingState = {
          ...current,
          steps: [...current.steps],
          activationSetup: { ...current.activationSetup },
        };

        if (detail.action === "activation-cancelled") {
          next.activationCancelled = true;
          return next;
        }

        if (detail.action === "chat-submit") {
          const text = detail.text ?? "";
          if (isSyntheticKickoff(text)) return current;

          if (current.feature === "new-chat") {
            if (current.chatSubmissions === 0) next.steps[0] = true;
            else next.steps[1] = true;
            next.chatSubmissions += 1;
          } else if (current.feature === "segments" && text.trim()) {
            if (!next.steps[0]) next.steps[0] = true;
            else if (!next.steps[1]) next.steps[1] = true;
          } else if (current.feature === "activations" && (detail.mentionIds?.length ?? 0) > 0) {
            next.steps[0] = true;
          }
          return next;
        }

        if (current.feature === "new-chat" && detail.action === "check-answer") next.steps[2] = true;
        if (current.feature === "segments" && detail.action === "segment-question-asked") next.steps[0] = true;
        if (current.feature === "segments" && detail.action === "segment-from-chat") next.steps[1] = true;
        if (current.feature === "segments" && detail.action === "segment-assumptions-confirmed") next.steps[2] = true;
        if (current.feature === "segments" && detail.action === "segment-saved") next.steps[3] = true;
        if (current.feature === "segments" && detail.action === "segment-panel-explored") next.steps[4] = true;
        if (current.feature === "segments" && detail.action === "segment-page-opened") next.steps[5] = true;
        if (current.feature === "activations") {
          if (detail.action === "activation-rules-confirmed") next.activationSetup.rules = true;
          if (detail.action === "activation-field-mapping-confirmed") next.activationSetup.fieldMapping = true;
          if (detail.action === "activation-destination-confirmed") next.activationSetup.destination = true;
          if (next.activationSetup.rules && next.activationSetup.fieldMapping && next.activationSetup.destination) next.steps[1] = true;
          if (detail.action === "activation-schedule-confirmed") next.steps[2] = true;
        }

        return next;
      });
    };

    window.addEventListener(TOUR_PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(TOUR_PROGRESS_EVENT, onProgress);
  }, []);

  useEffect(() => {
    if (training?.feature !== "segments") return;
    const markPanelExplored = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const label = event.target.closest("button")?.textContent?.trim();
      if (label !== "Customers" && label !== "In activations") return;
      window.dispatchEvent(new CustomEvent(TOUR_PROGRESS_EVENT, { detail: { action: "segment-panel-explored" } }));
    };
    document.addEventListener("click", markPanelExplored, true);
    return () => document.removeEventListener("click", markPanelExplored, true);
  }, [training?.feature]);

  const statusIsTerminal = savedTour?.status === "skipped" || savedTour?.status === "completed";
  const showSyncPrompt = syncPromptOpen && !statusIsTerminal && tourStop === null && training === null && quickChatIntroStage === null;
  const currentStop = tourStop === null ? null : TOUR_STOPS[tourStop];
  const tooltipLeft = spotlightRect
    ? Math.max(12, Math.min(window.innerWidth - 352, spotlightRect.right + 16))
    : 12;
  const tooltipTop = spotlightRect
    ? Math.max(12, Math.min(window.innerHeight - 310, spotlightRect.top - 8))
    : 12;
  const completedTraining = training?.steps.every(Boolean) ?? false;

  return (
    <>
      {quickChatIntroStage && (
        <QuickChatTourIntro
          stage={quickChatIntroStage}
          onStageChange={setQuickChatIntroStage}
          onContinue={beginNumberedTour}
          onSkipTour={skipTour}
        />
      )}

      {showSyncPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/35 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="tour-sync-title" className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-accent p-2 text-foreground"><span className="text-sm font-bold">L</span></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Lexi</p>
                <h2 id="tour-sync-title" className="mt-1 text-sm text-foreground">You&apos;re in - but Lexi&apos;s still getting to know your data</h2>
                <p className="mt-2 text-xs text-muted-foreground">Your sources are still syncing, which can take a little time depending on the platform. Some answers may be based on partial data while that finishes.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={startTour}>Take a quick tour <span className="text-[10px] font-medium opacity-80">Recommended · about 2 minutes</span></Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    persistTour({ status: "skipped", stop: 0 });
                    setTourStop(null);
                    onExploreOnMyOwn();
                  }}>Explore on my own</Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {currentStop && spotlightRect && (
        <div className="fixed inset-0 z-[70]">
          <div className="fixed left-0 right-0 top-0 bg-black/45" style={{ height: Math.max(0, spotlightRect.top) }} onClick={(event) => event.stopPropagation()} />
          <div className="fixed left-0 bg-black/45" style={{ top: spotlightRect.top, width: Math.max(0, spotlightRect.left), height: spotlightRect.height }} onClick={(event) => event.stopPropagation()} />
          <div className="fixed right-0 bg-black/45" style={{ top: spotlightRect.top, left: spotlightRect.right, height: spotlightRect.height }} onClick={(event) => event.stopPropagation()} />
          <div className="fixed bottom-0 left-0 right-0 bg-black/45" style={{ top: spotlightRect.bottom }} onClick={(event) => event.stopPropagation()} />
          <div aria-hidden="true" className="fixed rounded-md border-2 border-white shadow-[0_0_0_4px_rgba(20,184,166,0.55)]" style={{ top: spotlightRect.top - 3, left: spotlightRect.left - 3, width: spotlightRect.width + 6, height: spotlightRect.height + 6, pointerEvents: "none" }} />
          <div className="fixed z-[71]" style={{ top: spotlightRect.top, left: spotlightRect.left, width: spotlightRect.width, height: spotlightRect.height, background: "transparent" }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} />
          <section role="dialog" aria-modal="true" aria-label={`Step ${tourStop + 1} of ${TOUR_STOPS.length}: ${currentStop.title}`} className="fixed z-[72] w-[min(340px,calc(100vw-24px))] rounded-xl border border-border bg-background p-4 shadow-xl" style={{ top: tooltipTop, left: tooltipLeft }}>
            <p className="text-xs font-medium text-foreground-secondary">Step {tourStop + 1} of {TOUR_STOPS.length}</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">{currentStop.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{currentStop.description}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button size="sm" variant="outline" disabled={tourStop === 0} onClick={() => {
                const nextStop = Math.max(0, tourStop - 1);
                persistTour({ status: "in-progress", stop: nextStop });
                setTourStop(nextStop);
              }}>Back</Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={skipTour}>Skip tour</Button>
                <Button size="sm" onClick={() => {
                  if (tourStop >= TOUR_STOPS.length - 1) finishTour();
                  else {
                    const nextStop = tourStop + 1;
                    persistTour({ status: "in-progress", stop: nextStop });
                    setTourStop(nextStop);
                  }
                }}>{tourStop >= TOUR_STOPS.length - 1 ? "Finish tour" : `Next: ${TOUR_STOPS[tourStop + 1].title}`}</Button>
              </div>
            </div>
            {currentStop.explore && (
              <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => startTraining(currentStop.explore!)}>
                Explore {currentStop.explore === "new-chat" ? "New Chat" : currentStop.explore === "segments" ? "Segments" : "Activations"}
              </Button>
            )}
          </section>
        </div>
      )}

      {trainingSpotlightRect && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          <div className="fixed left-0 right-0 top-0 bg-black/40" style={{ height: Math.max(0, trainingSpotlightRect.top) }} />
          <div className="fixed left-0 bg-black/40" style={{ top: trainingSpotlightRect.top, width: Math.max(0, trainingSpotlightRect.left), height: trainingSpotlightRect.height }} />
          <div className="fixed right-0 bg-black/40" style={{ top: trainingSpotlightRect.top, left: trainingSpotlightRect.right, height: trainingSpotlightRect.height }} />
          <div className="fixed bottom-0 left-0 right-0 bg-black/40" style={{ top: trainingSpotlightRect.bottom }} />
          <div aria-hidden="true" className="fixed rounded-md border-2 border-white shadow-[0_0_0_4px_rgba(20,184,166,0.55)]" style={{ top: trainingSpotlightRect.top - 3, left: trainingSpotlightRect.left - 3, width: trainingSpotlightRect.width + 6, height: trainingSpotlightRect.height + 6 }} />
        </div>
      )}

      {training && (
        <>
          <button type="button" className="fixed right-4 top-14 z-[80] max-w-[calc(100vw-2rem)] truncate rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-md" onClick={returnToTour}>
            Tour paused at stop {training.pausedStop + 1} of {TOUR_STOPS.length} · Back to tour
          </button>
          <TrainingChecklist
            training={training}
            onSkipStep={skipTrainingStep}
            onLeave={returnToTour}
            onBackToTour={returnToTour}
            onContinueTour={continueTourAfterTraining}
          />
        </>
      )}
    </>
  );
}