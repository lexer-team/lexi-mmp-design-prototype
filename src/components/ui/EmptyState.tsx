import { cn } from "@/lib/utils";
import { FeaturedIcon } from "./FeaturedIcon";

/* centered featured icon, title, supporting text, actions */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode; // actions
  className?: string;
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 px-6 py-10 text-center", className)}>
      {icon && (
        <FeaturedIcon color="gray" size="lg" className="mb-3">
          {icon}
        </FeaturedIcon>
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-foreground-secondary max-w-sm">{description}</p>}
      {children && <div className="mt-4 flex items-center gap-3">{children}</div>}
    </div>
  );
}
