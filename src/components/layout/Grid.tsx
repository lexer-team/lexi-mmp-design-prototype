import { cn } from "@/lib/utils";

/**
 * Grid — responsive column helper. Maps a `cols` prop to static Tailwind
 * classes (Tailwind can't compile dynamic class strings), collapsing to a
 * single column on small screens per mobile-first rule.
 */

type Cols = 1 | 2 | 3 | 4;
type Gap = "sm" | "md" | "lg";

const colClasses: Record<Cols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const gapClasses: Record<Gap, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

export function Grid({
  cols = 3,
  gap = "md",
  children,
  className,
}: {
  cols?: Cols;
  gap?: Gap;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid", colClasses[cols], gapClasses[gap], className)}>{children}</div>;
}
