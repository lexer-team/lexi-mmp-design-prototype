import { cn } from "@/lib/utils";

/* featured icon, "light" style: tinted square, rounded, centered icon.
   Used in empty states, modals, alerts. */

type Color = "brand" | "gray" | "success" | "warning" | "error";
type Size = "sm" | "md" | "lg";

const colors: Record<Color, string> = {
  brand: "bg-primary/10 text-primary",
  gray: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  error: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
};

const sizes: Record<Size, string> = {
  sm: "size-8 rounded-md [&>svg]:size-4",
  md: "size-10 rounded-lg [&>svg]:size-5",
  lg: "size-12 rounded-xl [&>svg]:size-6",
};

interface FeaturedIconProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: Color;
  size?: Size;
}

export function FeaturedIcon({ color = "brand", size = "md", className, ...props }: FeaturedIconProps) {
  return (
    <div
      className={cn("flex items-center justify-center shrink-0", colors[color], sizes[size], className)}
      {...props}
    />
  );
}
