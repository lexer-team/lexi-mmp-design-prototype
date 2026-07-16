import { cn } from "@/lib/utils";
import { RiArrowUpLine, RiArrowDownLine, RiArrowUpDownLine } from "@remixicon/react";

/* shadcn table foundation, card-wrapped, gray header band, xs/medium
   header labels, 1px row dividers */

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-muted/50", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn("border-t border-border bg-muted/50 font-medium", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-10 px-4 text-left align-middle text-xs font-medium text-muted-foreground whitespace-nowrap", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn("my-3 text-xs text-muted-foreground", className)} {...props} />;
}

/* sortable header: a th wrapping a button with a sort-direction indicator.
   Pass sort=false (idle), "asc", or "desc"; wire onSort to your sort handler. */
export function SortableTableHead({
  children,
  sort = false,
  onSort,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  sort?: "asc" | "desc" | false;
  onSort?: () => void;
}) {
  const Icon = sort === "asc" ? RiArrowUpLine : sort === "desc" ? RiArrowDownLine : RiArrowUpDownLine;
  return (
    <TableHead className={cn("p-0", className)} aria-sort={sort ? (sort === "asc" ? "ascending" : "descending") : "none"} {...props}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "flex h-10 w-full items-center gap-1.5 px-4 text-left transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          sort && "text-foreground",
        )}
      >
        {children}
        <Icon className={cn("size-3.5 shrink-0", sort ? "text-foreground" : "text-muted-foreground/50")} />
      </button>
    </TableHead>
  );
}
