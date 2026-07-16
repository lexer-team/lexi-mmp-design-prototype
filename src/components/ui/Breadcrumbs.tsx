import { cn } from "@/lib/utils";
import { RiArrowRightSLine } from "@remixicon/react";
import { Fragment } from "react";

/* shadcn breadcrumb foundation (nav>ol>li), sm/medium gray, semibold current.
   divider variants: chevron (default) or slash. Crumbs may carry a leading icon
   (e.g. a home icon on the root). */

export interface Crumb {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** optional leading icon (e.g. a home icon on the root crumb) */
  icon?: React.ReactNode;
}

type Divider = "chevron" | "slash";

export function Breadcrumbs({
  items,
  divider = "chevron",
  className,
}: {
  items: Crumb[];
  divider?: Divider;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm font-medium">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const content = (
            <span className="inline-flex items-center gap-1.5">
              {item.icon && <span className="[&>svg]:size-4 shrink-0">{item.icon}</span>}
              {item.label}
            </span>
          );
          return (
            <Fragment key={i}>
              <li>
                {isLast ? (
                  <span aria-current="page" className="font-semibold text-foreground">
                    {content}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    onClick={item.onClick}
                    className={cn(
                      "text-muted-foreground transition-colors hover:text-foreground",
                      "rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
                    )}
                  >
                    {content}
                  </a>
                )}
              </li>
              {!isLast &&
                (divider === "slash" ? (
                  <li aria-hidden className="text-muted-foreground/50 select-none">/</li>
                ) : (
                  <li aria-hidden>
                    <RiArrowRightSLine className="size-4 text-muted-foreground/60" />
                  </li>
                ))}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
