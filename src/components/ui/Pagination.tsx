import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react";

/* shadcn pagination foundation, outline prev/next at the edges,
   minimal page numbers in the center */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageRange(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between gap-3", className)}>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <RiArrowLeftLine />
        Previous
      </Button>
      <div className="flex items-center gap-0.5">
        {pageRange(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "size-9 rounded-lg text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
                p === page
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
        <RiArrowRightLine />
      </Button>
    </nav>
  );
}
