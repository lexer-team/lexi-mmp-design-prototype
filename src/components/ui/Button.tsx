import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "ghost" | "outline" | "destructive" | "secondary" | "link";
type Size = "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * semibold labels, 8px radius, shadow-xs on solid/bordered
 * variants, soft 4px focus ring. Colors remain Lexer semantic tokens.
 */
/* inner-border gradient: 1px white ring inset by 1px, fading toward the bottom */
const innerHighlight =
  "before:pointer-events-none before:absolute before:inset-px before:rounded-[7px] before:border before:border-white/12 before:mask-b-from-0%";

const variantClasses: Record<Variant, string> = {
  default: `bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs-skeuomorphic ${innerHighlight}`,
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline: "bg-card hover:bg-accent hover:text-accent-foreground shadow-xs-skeuomorphic-border",
  destructive: `bg-destructive text-white hover:bg-destructive/90 shadow-xs-skeuomorphic ${innerHighlight}`,
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  link: "text-primary underline-offset-4 hover:underline px-0",
};

/* heights: sm 36 / md 40 / lg 44; xs (32) kept from shadcn for dense UI */
const sizeClasses: Record<Size, string> = {
  xs: "h-8 px-2.5 text-xs gap-1 [&>svg:not([class*='size-'])]:size-3.5",
  sm: "h-9 px-3 text-xs gap-1.5", /* text-xs per original playground scale (would use text-sm) */
  default: "h-10 px-3.5 text-sm gap-2",
  lg: "h-11 px-4 text-sm gap-2",
  icon: "h-10 w-10 p-0",
  "icon-sm": "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        "[&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
