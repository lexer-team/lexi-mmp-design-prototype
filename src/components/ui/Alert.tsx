import { cn } from "@/lib/utils";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiInformationLine, RiCheckboxCircleLine, RiAlertLine, RiErrorWarningLine, RiCloseLine,
} from "@remixicon/react";

/* shadcn Alert base, tinted container + ring, leading status icon,
   title + description, optional actions and dismiss. Colors stay Lexer hues. */

type AlertVariant = "info" | "success" | "warning" | "error";

const variantStyles: Record<AlertVariant, { container: string; icon: string; Icon: RemixiconComponentType }> = {
  info: { container: "bg-primary/5 border-primary/20", icon: "text-primary", Icon: RiInformationLine },
  success: {
    container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-400/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: RiCheckboxCircleLine,
  },
  warning: {
    container: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-400/20",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: RiAlertLine,
  },
  error: {
    container: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-400/20",
    icon: "text-rose-600 dark:text-rose-400",
    Icon: RiErrorWarningLine,
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  actions,
  onDismiss,
  icon,
  className,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  /** override the default status icon */
  icon?: RemixiconComponentType;
  className?: string;
}) {
  const s = variantStyles[variant];
  const Icon = icon ?? s.Icon;
  return (
    <div role="alert" className={cn("flex gap-3 rounded-xl border p-4", s.container, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", s.icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
        {children && <div className="text-sm text-foreground-secondary">{children}</div>}
        {actions && <div className="mt-2 flex items-center gap-3">{actions}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "-m-1 size-7 shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          )}
        >
          <RiCloseLine className="size-5" />
        </button>
      )}
    </div>
  );
}
