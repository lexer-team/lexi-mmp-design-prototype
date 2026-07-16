import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** online indicator dot */
  online?: boolean;
}

const sizes = { sm: "size-7 text-xs", md: "size-8 text-xs", lg: "size-10 text-sm" };
const dotSizes = { sm: "size-1.5", md: "size-2", lg: "size-2.5" };

/**
 * avatar structure: circular, subtle inset contrast ring, optional
 * online dot. Colors remain Lexer tokens.
 */
export function Avatar({ initials, className, size = "md", online }: AvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "rounded-full bg-sidebar-accent text-sidebar-foreground font-semibold",
          "flex items-center justify-center select-none",
          "ring-1 ring-inset ring-black/10 dark:ring-white/10",
          sizes[size],
        )}
      >
        {initials}
      </div>
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-card",
            dotSizes[size],
          )}
        />
      )}
    </div>
  );
}
