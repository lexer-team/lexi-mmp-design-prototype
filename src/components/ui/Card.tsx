import { cn } from "@/lib/utils";

/* shadcn Card base, rounded-xl, hairline border, shadow-xs.
   CardHeader supports the card-header anatomy (icon, title, supporting text,
   badge, actions, optional divider) via props, or arbitrary children. */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-xs", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  badge,
  divider = false,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  /** add a bottom border under the header */
  divider?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-3 p-5", divider && "border-b border-border", className)}>
      {children ?? (
        <>
          {icon && <span className="mt-0.5 shrink-0 text-muted-foreground [&>svg]:size-5">{icon}</span>}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
              {badge}
            </div>
            {description && <p className="text-sm text-foreground-secondary">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </>
      )}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-border p-5", className)} {...props} />;
}
