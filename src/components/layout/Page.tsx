import { cn } from "@/lib/utils";

/**
 * Layout primitives — the page-level structure shared by every Lexer screen.
 *
 * Layout rules, reconciled to the existing inset-card language:
 *   - content sits in a max-width container with consistent horizontal padding
 *   - vertical rhythm is a single gap between page header and content (gap-8)
 *   - the page header is title + supporting text + actions, optional breadcrumbs/tabs
 *
 * `Page` is the padded content container that lives INSIDE the inset main card
 * (AppShell already supplies the card + scroll region). It does not scroll itself.
 */

type PageWidth = "narrow" | "default" | "wide" | "full";

const widthClasses: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function Page({
  children,
  width = "default",
  className,
}: {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full px-6 py-6 flex flex-col gap-8", widthClasses[width], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  divider = true,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  /** bottom border separating header from content (default true) */
  divider?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", divider && "border-b border-border pb-5", className)}>
      {breadcrumbs}
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
          {description && <p className="text-sm text-foreground-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </div>
  );
}
