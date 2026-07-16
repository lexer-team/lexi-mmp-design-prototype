import { cn } from "@/lib/utils";
import type { RemixiconComponentType } from "@remixicon/react";

/**
 * Panel — the inset-card primitive that defines the Lexer look. Mirrors the
 * AppShell main card / right artifact panel: floating surface with a 12px
 * radius, soft shadow, hairline border. Use it for any framed region —
 * split panes, grouped detail content, side rails.
 *
 *   <Panel>
 *     <PanelHeader title="Segments" actions={…} />
 *     <PanelBody>…</PanelBody>
 *   </Panel>
 */

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Pane — a FLUSH sub-panel for split layouts (the list and detail sides of a
 * split view). Rule: only the outermost surface is inset. Sub-panes fill their
 * parent Panel edge-to-edge and are separated by a divider, never floated as
 * nested cards — so Pane has no radius, border, or shadow of its own.
 */
export function Pane({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full min-w-0 flex-col overflow-hidden bg-background", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  icon?: RemixiconComponentType;
  actions?: React.ReactNode;
  /** override the default title/actions row entirely */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-12 shrink-0 items-center gap-2 border-b border-border px-4", className)}>
      {children ?? (
        <>
          {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="flex-1 truncate text-sm font-medium text-foreground">{title}</span>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </>
      )}
    </div>
  );
}

export function PanelBody({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** apply default p-4 padding (default true; set false for flush tables/lists) */
  padded?: boolean;
}) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto", padded && "p-4", className)}>{children}</div>;
}
