import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger" | "outline";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

/**
 * badge structure: pill with a 1px inset ring, three sizes.
 * Colors remain the existing Lexer hues; ring is a tint of each hue.
 */
const variants: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  secondary: "bg-secondary text-secondary-foreground ring-border",
  success: "bg-emerald-100 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-emerald-400/20",
  warning: "bg-amber-100 text-amber-700 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-400/20",
  danger: "bg-rose-100 text-rose-700 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-400 dark:ring-rose-400/20",
  outline: "text-foreground ring-border",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-sm",
};

export function Badge({ variant = "default", size = "sm", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
