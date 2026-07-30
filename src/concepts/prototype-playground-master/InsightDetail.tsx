/**
 * Segment - V1 — Insight detail drawer
 *
 * Right-side panel for one saved insight. Order: Details on top, then the
 * editable markdown Finding, then the recommended action. The source links back
 * to the chat or artifact that produced the insight.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  RiCloseLine, RiPlanetLine, RiMessage2Line, RiGroupLine, RiTimeLine, RiUserLine,
  RiLightbulbFlashLine, RiArrowRightUpLine, RiArrowDownSLine,
} from "@remixicon/react";
import type { Insight, SourceRef } from "./insights-data";
import { MarkdownEditor } from "./Markdown";

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        {children}
      </div>
    </div>
  );
}

function SourceLink({ source, onOpen }: { source: SourceRef; onOpen?: (s: SourceRef) => void }) {
  const Icon = source.kind === "chat" ? RiMessage2Line : RiGroupLine;
  return (
    <button
      onClick={() => onOpen?.(source)}
      className="group/src inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline"
      title={`Open ${source.kind === "chat" ? "conversation" : "segment"}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{source.label}</span>
      <RiArrowRightUpLine className="size-3.5 shrink-0 opacity-60" />
    </button>
  );
}

export function InsightDrawer({
  insight,
  finding,
  onChangeFinding,
  onClose,
  onOpenSource,
  spaceOptions,
  onAddToSpace,
}: {
  insight: Insight;
  finding: string;
  onChangeFinding: (md: string) => void;
  onClose: () => void;
  onOpenSource?: (s: SourceRef) => void;
  spaceOptions?: Array<{ id: string; name: string }>;
  onAddToSpace?: (spaceId: string) => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <div
        className={cn("absolute inset-0 bg-foreground/20 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-[30rem] flex-col bg-background shadow-lg transition-transform duration-200 ease-out",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <header className="flex items-start gap-2 border-b border-border px-5 py-4">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RiLightbulbFlashLine className="size-4" />
          </span>
          <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">{insight.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {spaceOptions && spaceOptions.length > 0 && onAddToSpace && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Add to Space <RiArrowDownSLine className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[10020] w-56">
                  <DropdownMenuLabel>Select a Space</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {spaceOptions.map((space) => (
                    <DropdownMenuItem key={space.id} onSelect={() => onAddToSpace(space.id)}>
                      {space.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Close"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {/* Details — on top */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source" icon={undefined}>
                <SourceLink source={insight.source} onOpen={onOpenSource} />
              </Field>
              <Field label="Space" icon={RiPlanetLine}>{insight.space}</Field>
              <Field label="Owner" icon={RiUserLine}>{insight.owner}</Field>
              <Field label="Saved" icon={RiTimeLine}>{insight.savedAt}</Field>
            </div>
            {insight.metrics && insight.metrics.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Related</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {insight.metrics.map((m) => <Badge key={m} variant="secondary" size="sm">{m}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {/* Finding — editable markdown */}
          <MarkdownEditor value={finding} onChange={onChangeFinding} />

          {/* Recommended action */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <h3 className="text-sm font-semibold text-foreground">What to do about it</h3>
            <p className="text-sm leading-relaxed text-foreground-secondary">{insight.implication}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
