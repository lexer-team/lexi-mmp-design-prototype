import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export type QuickChatIntroStage = "launcher" | "choices" | "ready";

type SpotlightRect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

function findAnchor(stage: QuickChatIntroStage): HTMLElement | null {
  if (stage === "launcher") return document.querySelector<HTMLElement>('button[aria-label="Open Ask Lexi"]');
  if (stage === "ready") return document.querySelector<HTMLElement>('section[aria-label="Ask Lexi"]');

  const usePageButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent?.trim() === "Use this page");
  return usePageButton?.parentElement ?? null;
}

export function QuickChatTourIntro({
  stage,
  onStageChange,
  onContinue,
  onSkipTour,
}: {
  stage: QuickChatIntroStage;
  onStageChange: (stage: QuickChatIntroStage) => void;
  onContinue: () => void;
  onSkipTour: () => void;
}) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const anchor = findAnchor(stage);
      if (!anchor) {
        setSpotlightRect(null);
        return false;
      }
      const rect = anchor.getBoundingClientRect();
      const next = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      setSpotlightRect((current) => current
        && current.top === next.top
        && current.left === next.left
        && current.width === next.width
        && current.height === next.height
        ? current
        : next);
      return true;
    };

    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (updateRect() || attempts >= 20) window.clearInterval(retry);
    }, 100);
    const observer = new MutationObserver(() => {
      if (updateRect()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.clearInterval(retry);
      observer.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [stage]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button) return;
      const label = button.getAttribute("aria-label") ?? "";
      const text = button.textContent?.trim() ?? "";

      if (stage === "launcher" && label === "Open Ask Lexi") onStageChange("choices");
      else if (stage === "choices" && (text === "Use this page" || text === "Something else")) onStageChange("ready");
      else if (stage !== "launcher" && (label === "Close Ask Lexi" || label === "Minimize Ask Lexi")) onStageChange("launcher");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [stage, onStageChange]);

  if (!spotlightRect) return null;

  const isCompact = window.innerWidth < 768;
  const tooltipLeft = isCompact
    ? 12
    : Math.max(12, Math.min(window.innerWidth - 372, spotlightRect.left - 372));
  const tooltipTop = isCompact
    ? 64
    : Math.max(12, Math.min(window.innerHeight - 260, spotlightRect.top - (stage === "launcher" ? 176 : 100)));

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className="pointer-events-auto fixed left-0 right-0 top-0 bg-black/45" style={{ height: Math.max(0, spotlightRect.top) }} />
      <div className="pointer-events-auto fixed left-0 bg-black/45" style={{ top: spotlightRect.top, width: Math.max(0, spotlightRect.left), height: spotlightRect.height }} />
      <div className="pointer-events-auto fixed right-0 bg-black/45" style={{ top: spotlightRect.top, left: spotlightRect.right, height: spotlightRect.height }} />
      <div className="pointer-events-auto fixed bottom-0 left-0 right-0 bg-black/45" style={{ top: spotlightRect.bottom }} />
      <div aria-hidden="true" className="fixed rounded-md border-2 border-white shadow-[0_0_0_4px_rgba(20,184,166,0.55)]" style={{ top: spotlightRect.top - 3, left: spotlightRect.left - 3, width: spotlightRect.width + 6, height: spotlightRect.height + 6 }} />
      <section role="dialog" aria-modal="false" aria-label="Ask Lexi introduction" className="pointer-events-auto fixed z-[72] w-[min(360px,calc(100vw-24px))] rounded-xl border border-border bg-background p-4 shadow-xl" style={{ top: tooltipTop, left: tooltipLeft }}>
        {stage === "launcher" ? (
          <>
            <p className="text-xs font-medium text-foreground-secondary">Before we begin</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Lexi is always available</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">Open Ask Lexi any time to ask about this page, get help with a feature, or ask a question of your own.</p>
            <p className="mt-3 text-xs font-medium text-primary">Click Ask Lexi in the bottom-right corner to try it.</p>
          </>
        ) : stage === "choices" ? (
          <>
            <p className="text-xs font-medium text-foreground-secondary">Quick chat</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Ask about this page or start fresh</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary"><strong>Use this page</strong> to ask Lexi about what you’re viewing. Choose <strong>Something else</strong> for a new question.</p>
            <p className="mt-3 text-xs font-medium text-primary">Choose either option in Ask Lexi to continue.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-foreground-secondary">Quick chat ready</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Continue the tour</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">You can keep using Ask Lexi while you explore the rest of the product.</p>
            <Button size="sm" className="mt-4" onClick={onContinue}>Continue on the tour</Button>
          </>
        )}
        <div className="mt-3 border-t border-border pt-3">
          <button type="button" className="text-xs font-medium text-foreground-secondary underline underline-offset-2 hover:text-foreground" onClick={onSkipTour}>Skip tour</button>
        </div>
      </section>
    </div>
  );
}