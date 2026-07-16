import { cn } from "@/lib/utils";

/* activity feed (no avatar): vertical timeline with a connector line, an
   icon dot per event, and title/description/time. Built shadcn-style (composition,
   semantic tokens) — no dedicated shadcn primitive exists. */

export interface ActivityItem {
  id: string;
  /** small icon shown in the dot; falls back to a plain dot */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
}

export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={it.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />}
            <span className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-background [&>svg]:size-3.5">
              {it.icon ?? <span className="size-1.5 rounded-full bg-muted-foreground/50" />}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <p className="text-sm text-foreground">{it.title}</p>
              {it.description && <p className="text-sm text-foreground-secondary">{it.description}</p>}
              {it.time && <p className="text-xs text-muted-foreground/70">{it.time}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
