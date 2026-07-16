import { cn } from "@/lib/utils";

/**
 * Section — a titled block within a page. General-purpose (distinct from the
 * docs-only Section in pages/design-system/doc.tsx). Title + supporting text +
 * optional section actions, then content with consistent vertical rhythm.
 */

export function SectionHeader({
  title,
  description,
  actions,
  badge,
  tabs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** optional badge shown next to the title (e.g. a count) */
  badge?: React.ReactNode;
  /** optional tabs row beneath the header (section-header-with-tabs) */
  tabs?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {badge}
          </div>
          {description && <p className="text-sm text-foreground-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs}
    </div>
  );
}

/**
 * SectionFooter — an in-flow footer bar that closes a section or form: a top
 * divider with optional helper text on the left and actions on the right.
 * (For a footer pinned to the viewport, use the sticky pattern in the Settings
 * layout template instead.)
 */
export function SectionFooter({
  children,
  hint,
  className,
}: {
  children: React.ReactNode;
  /** optional left-aligned helper text */
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-t border-border pt-4", className)}>
      {hint && <p className="flex-1 text-sm text-muted-foreground">{hint}</p>}
      <div className={cn("flex items-center gap-2", hint ? "shrink-0" : "ml-auto")}>{children}</div>
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {title && <SectionHeader title={title} description={description} actions={actions} />}
      {children}
    </section>
  );
}
