import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { RiCloseLine } from "@remixicon/react";
import { Button } from "./Button";
import { FeaturedIcon } from "./FeaturedIcon";
import type { RemixiconComponentType } from "@remixicon/react";

/* shadcn dialog foundation, modal skin: rounded-xl, shadow-xl, top-aligned
   header with optional featured icon slot, footer right-aligned. Sizes sm/md/lg.
   ConfirmDialog below is the destructive-confirmation pattern (no outside-click /
   escape dismiss, no close X) — built on this Radix dialog so no extra dependency;
   for a dedicated primitive use @radix-ui/react-alert-dialog. */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const dialogSizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;

export function DialogContent({
  className,
  children,
  size = "md",
  hideClose = false,
  ...props
}: DialogPrimitive.DialogContentProps & { size?: keyof typeof dialogSizes; hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
          dialogSizes[size],
          "rounded-xl border border-border bg-card p-6 shadow-xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
            )}
          >
            <RiCloseLine className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogPrimitive.DialogTitleProps) {
  return <DialogPrimitive.Title className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogPrimitive.DialogDescriptionProps) {
  return <DialogPrimitive.Description className={cn("text-sm text-foreground-secondary", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-3", className)} {...props} />;
}

/**
 * ConfirmDialog — the destructive/blocking confirmation pattern. Disables
 * outside-click and escape dismissal and hides the close X (mirrors an
 * AlertDialog) so the choice is deliberate. Focus defaults to the safe Cancel.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  icon: Icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: "default" | "destructive";
  icon?: RemixiconComponentType;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex gap-4">
          {Icon && (
            <FeaturedIcon color={variant === "destructive" ? "error" : "brand"}>
              <Icon />
            </FeaturedIcon>
          )}
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        </div>
        <DialogFooter>
          <Button variant="outline" autoFocus onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
