import { cn } from "@/lib/utils";
import { RiCloseLine } from "@remixicon/react";

/* filter bar: a wrapping toolbar that composes a search Input, filter
   DropdownMenus, and removable applied-filter chips. No shadcn primitive —
   it's a composition pattern. */

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function FilterChip({
  label,
  value,
  onRemove,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-2.5 pr-1 text-sm shadow-xs",
        className,
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove filter"
          className={cn(
            "ml-0.5 flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          )}
        >
          <RiCloseLine className="size-3.5" />
        </button>
      )}
    </span>
  );
}
