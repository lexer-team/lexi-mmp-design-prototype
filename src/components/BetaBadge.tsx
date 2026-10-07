import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";

type BetaBadgeProps = {
  className?: string;
};

const BETA_TOOLTIP_COPY = "Lexi is in Beta. You may see occasional bugs, incomplete answers, or brief downtime while we test and improve Lexi. Your feedback directly shapes what we build next, use the feedback button on any response to flag issues.";
export const BETA_TOOLTIP_DISMISSED_KEY = "lexi-beta-tooltip-dismissed";
export const BETA_TOOLTIP_OPEN_EVENT = "lexi-beta-tooltip-open";
export const BETA_TOOLTIP_CLOSED_EVENT = "lexi-beta-tooltip-closed";

export function BetaBadge({ className }: BetaBadgeProps) {
  const [open, setOpen] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(BETA_TOOLTIP_DISMISSED_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (!dismissed) {
      setOpen(true);
      setLockedOpen(true);
      window.dispatchEvent(new CustomEvent(BETA_TOOLTIP_OPEN_EVENT));
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (lockedOpen && !nextOpen) return;
    setOpen(nextOpen);
  };

  const dismissWelcomeTooltip = () => {
    setLockedOpen(false);
    setOpen(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(BETA_TOOLTIP_DISMISSED_KEY, "1");
      } catch {
        // Storage can be unavailable in sandboxed iframes.
      }
      window.dispatchEvent(new CustomEvent(BETA_TOOLTIP_CLOSED_EVENT));
    }
  };

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          title={BETA_TOOLTIP_COPY}
          className={cn("inline-flex items-center outline-none", className)}
          style={{
            backgroundColor: "#3A405B",
            borderRadius: "13px",
            padding: "4px 12px 4px 10px",
            fontFamily: '"Rubik", var(--font-sans)',
            fontWeight: 500,
            fontSize: "12px",
            lineHeight: 1.2,
            color: "#FFFFFF",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "999px",
              backgroundColor: "#00E2AA",
              marginRight: "6px",
            }}
          />
          Beta
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="relative z-[120] w-[300px] min-w-[280px] max-w-[320px] rounded-[10px] bg-white px-4 py-[14px] text-[13px] font-normal leading-[1.6] text-[#3A405B] shadow-[0_8px_24px_rgba(58,64,91,0.14),0_2px_6px_rgba(58,64,91,0.08)]"
        style={{
          border: "0.5px solid #ECE8E5",
          fontFamily: '"Rubik", var(--font-sans)',
        }}
      >
        <button
          type="button"
          onClick={dismissWelcomeTooltip}
          className="absolute right-2 top-2 rounded p-1 text-[#3A405B] transition-colors hover:bg-[#ECE8E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A405B]"
          aria-label="Close beta message"
        >
          X
        </button>
        <p>
          <strong>Lexi is in Beta.</strong>
        </p>
        <p className="mt-2 pr-6">
          You may see occasional bugs, incomplete answers, or brief downtime while we test and improve Lexi. Your feedback directly shapes what we build next, use the feedback button on any response to flag issues.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
